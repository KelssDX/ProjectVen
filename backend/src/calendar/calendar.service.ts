import { Logger } from '@nestjs/common';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PoolClient } from 'pg';
import type {
  BeginCalendarOauthResponse,
  CalendarEvent,
  CalendarEventList,
  CalendarIntegration,
  CalendarIntegrationList,
  CalendarProvider,
  CalendarSyncResult,
  CalendarWebhookAck,
  DeleteCalendarEventResult,
} from '../contracts/calendar';
import { DatabaseService } from '../database/database.service';
import { CalendarCryptoService } from './calendar-crypto.service';
import {
  buildOauthAuthorizationUrl,
  deleteProviderCalendarEvent,
  ensureProviderWebhook,
  exchangeOauthCode,
  fetchProviderAccountProfile,
  fetchProviderCalendarDelta,
  refreshOauthToken,
  upsertProviderCalendarEvent,
  type GoogleWebhookMetadata,
  type MicrosoftWebhookMetadata,
  type ProviderTokenBundle,
} from './calendar-provider-client';
import type {
  BeginCalendarOauthBody,
  CalendarEventListQuery,
  ConnectCalendarIntegrationBody,
  CompleteCalendarOauthBody,
  CreateCalendarEventBody,
  UpdateCalendarEventBody,
} from './calendar.types';

interface CalendarEventRow {
  id: string;
  user_id: string;
  integration_id: string | null;
  source: CalendarEvent['source'];
  external_event_id: string | null;
  event_type: CalendarEvent['eventType'];
  title: string;
  description: string | null;
  location: string | null;
  start_at: string | Date;
  end_at: string | Date | null;
  recurrence_rule: string | null;
  meeting_mode: CalendarEvent['meetingMode'] | null;
  meeting_link: string | null;
  source_link: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface CalendarIntegrationRow {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  external_account_id: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | Date | null;
  scope: string | null;
  sync_cursor: string | null;
  provider_metadata: Record<string, unknown> | null;
  connected: boolean;
  last_sync_at: string | Date | null;
}

interface CalendarProviderMetadata {
  connectionMode?: 'manual' | 'oauth';
  accountEmail?: string | null;
  providerUserId?: string | null;
  providerDisplayName?: string | null;
  lastError?: string | null;
  syncMap?: Record<string, string>;
  webhook?: GoogleWebhookMetadata | MicrosoftWebhookMetadata | null;
}

interface CalendarSyncOptions {
  reason: 'manual' | 'oauth_complete' | 'worker' | 'webhook' | 'event_change';
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly calendarCryptoService: CalendarCryptoService,
  ) {}

  async getEvents(
    userId: string,
    query: CalendarEventListQuery,
  ): Promise<CalendarEventList> {
    const params: unknown[] = [userId];
    const whereClauses = ['ce.user_id = $1::uuid'];

    if (query.startAt) {
      const startAt = this.parseTimestamp(
        query.startAt,
        'INVALID_EVENT_FILTER_START',
      );
      params.push(startAt.toISOString());
      whereClauses.push(
        `COALESCE(ce.end_at, ce.start_at) >= $${params.length}::timestamptz`,
      );
    }

    if (query.endAt) {
      const endAt = this.parseTimestamp(query.endAt, 'INVALID_EVENT_FILTER_END');
      params.push(endAt.toISOString());
      whereClauses.push(`ce.start_at <= $${params.length}::timestamptz`);
    }

    params.push(query.limit);
    const limitParam = params.length;

    const result = await this.databaseService.query<CalendarEventRow>(
      `
        SELECT
          ce.id,
          ce.user_id,
          ce.integration_id,
          ce.source::text AS source,
          ce.external_event_id,
          ce.event_type::text AS event_type,
          ce.title,
          ce.description,
          ce.location,
          ce.start_at,
          ce.end_at,
          ce.recurrence_rule,
          ce.meeting_mode::text AS meeting_mode,
          ce.meeting_link,
          ce.source_link,
          ce.created_at,
          ce.updated_at
        FROM calendar_events ce
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY ce.start_at ASC, ce.id ASC
        LIMIT $${limitParam}
      `,
      params,
    );

    return {
      items: result.rows.map((row) => this.mapCalendarEvent(row)),
    };
  }

  async createEvent(
    userId: string,
    payload: CreateCalendarEventBody,
  ): Promise<CalendarEvent> {
    const prepared = this.prepareEventPayload(payload);

    const created = await this.databaseService.transaction(async (client) => {
      const result = await client.query<CalendarEventRow>(
        `
          INSERT INTO calendar_events (
            user_id,
            source,
            event_type,
            title,
            description,
            location,
            start_at,
            end_at,
            recurrence_rule,
            meeting_mode,
            meeting_link,
            source_link
          ) VALUES (
            $1::uuid,
            'vendrom'::calendar_source,
            $2::calendar_event_type,
            $3,
            $4,
            $5,
            $6::timestamptz,
            $7::timestamptz,
            $8,
            $9::meeting_mode,
            $10,
            $11
          )
          RETURNING
            id,
            user_id,
            integration_id,
            source::text AS source,
            external_event_id,
            event_type::text AS event_type,
            title,
            description,
            location,
            start_at,
            end_at,
            recurrence_rule,
            meeting_mode::text AS meeting_mode,
            meeting_link,
            source_link,
            created_at,
            updated_at
        `,
        [
          userId,
          prepared.eventType,
          prepared.title,
          prepared.description,
          prepared.location,
          prepared.startAt,
          prepared.endAt,
          prepared.recurrenceRule,
          prepared.meetingMode,
          prepared.meetingLink,
          prepared.sourceLink,
        ],
      );

      const row = result.rows[0];
      if (!row) {
        throw new BadRequestException({
          error: {
            code: 'CALENDAR_EVENT_CREATE_FAILED',
            message: 'Failed to create calendar event.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'calendar_event',
        aggregateId: row.id,
        eventType: 'calendar.event.created',
        payload: {
          eventId: row.id,
          userId,
          source: 'vendrom',
          eventType: prepared.eventType,
        },
      });

      return this.mapCalendarEvent(row);
    });

    this.triggerBackgroundSync(userId);
    return created;
  }

  async updateEvent(
    userId: string,
    eventId: string,
    payload: UpdateCalendarEventBody,
  ): Promise<CalendarEvent> {
    const prepared = this.prepareEventPayload(payload);

    const updated = await this.databaseService.transaction(async (client) => {
      const result = await client.query<CalendarEventRow>(
        `
          UPDATE calendar_events
          SET
            event_type = $3::calendar_event_type,
            title = $4,
            description = $5,
            location = $6,
            start_at = $7::timestamptz,
            end_at = $8::timestamptz,
            recurrence_rule = $9,
            meeting_mode = $10::meeting_mode,
            meeting_link = $11,
            source_link = $12,
            updated_at = now()
          WHERE id = $1::uuid
            AND user_id = $2::uuid
          RETURNING
            id,
            user_id,
            integration_id,
            source::text AS source,
            external_event_id,
            event_type::text AS event_type,
            title,
            description,
            location,
            start_at,
            end_at,
            recurrence_rule,
            meeting_mode::text AS meeting_mode,
            meeting_link,
            source_link,
            created_at,
            updated_at
        `,
        [
          eventId,
          userId,
          prepared.eventType,
          prepared.title,
          prepared.description,
          prepared.location,
          prepared.startAt,
          prepared.endAt,
          prepared.recurrenceRule,
          prepared.meetingMode,
          prepared.meetingLink,
          prepared.sourceLink,
        ],
      );

      const row = result.rows[0];
      if (!row) {
        throw new NotFoundException({
          error: {
            code: 'CALENDAR_EVENT_NOT_FOUND',
            message: 'Calendar event not found.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'calendar_event',
        aggregateId: row.id,
        eventType: 'calendar.event.updated',
        payload: {
          eventId: row.id,
          userId,
          source: row.source,
          eventType: prepared.eventType,
        },
      });

      return this.mapCalendarEvent(row);
    });

    this.triggerBackgroundSync(userId);
    return updated;
  }

  async deleteEvent(
    userId: string,
    eventId: string,
  ): Promise<DeleteCalendarEventResult> {
    const deleted = await this.databaseService.transaction(async (client) => {
      const result = await client.query<{ id: string; source: CalendarEvent['source'] }>(
        `
          DELETE FROM calendar_events
          WHERE id = $1::uuid
            AND user_id = $2::uuid
          RETURNING id, source::text AS source
        `,
        [eventId, userId],
      );

      const row = result.rows[0];
      if (!row) {
        throw new NotFoundException({
          error: {
            code: 'CALENDAR_EVENT_NOT_FOUND',
            message: 'Calendar event not found.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'calendar_event',
        aggregateId: row.id,
        eventType: 'calendar.event.deleted',
        payload: {
          eventId: row.id,
          userId,
          source: row.source,
        },
      });

      return {
        id: row.id,
        deleted: true as const,
        source: row.source,
      };
    });

    if (deleted.source === 'vendrom') {
      await this.deleteMirroredVendromEvent(userId, eventId);
    }

    return {
      id: deleted.id,
      deleted: true,
    };
  }

  async getIntegrations(userId: string): Promise<CalendarIntegrationList> {
    const result = await this.databaseService.query<CalendarIntegrationRow>(
      `
        WITH providers(provider) AS (
          VALUES
            ('google'::calendar_source),
            ('microsoft'::calendar_source)
        )
        SELECT
          COALESCE(ci.id, gen_random_uuid()) AS id,
          $1::uuid AS user_id,
          providers.provider::text AS provider,
          ci.external_account_id,
          ci.access_token_encrypted,
          ci.refresh_token_encrypted,
          ci.token_expires_at,
          ci.scope,
          ci.sync_cursor,
          ci.provider_metadata,
          COALESCE(ci.connected, FALSE) AS connected,
          ci.last_sync_at
        FROM providers
        LEFT JOIN calendar_integrations ci
          ON ci.user_id = $1::uuid
         AND ci.provider = providers.provider
        ORDER BY
          CASE providers.provider
            WHEN 'google'::calendar_source THEN 1
            ELSE 2
          END
      `,
      [userId],
    );

    return {
      items: result.rows.map((row) => this.mapIntegration(row)),
    };
  }

  async beginOauth(
    userId: string,
    provider: CalendarProvider,
    payload: BeginCalendarOauthBody,
  ): Promise<BeginCalendarOauthResponse> {
    const clientId = this.getProviderClientId(provider);
    const { state, expiresAt } = this.calendarCryptoService.signOauthState({
      userId,
      provider,
      redirectUri: payload.redirectUri,
    });

    return {
      authUrl: buildOauthAuthorizationUrl({
        provider,
        clientId,
        redirectUri: payload.redirectUri,
        state,
        microsoftTenantId: this.getMicrosoftTenantId(),
      }),
      state,
      expiresAt,
    };
  }

  async completeOauth(
    userId: string,
    provider: CalendarProvider,
    payload: CompleteCalendarOauthBody,
  ): Promise<CalendarIntegration> {
    const verifiedState = this.calendarCryptoService.verifyOauthState(payload.state);
    if (
      verifiedState.userId !== userId ||
      verifiedState.provider !== provider ||
      verifiedState.redirectUri !== payload.redirectUri
    ) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_CALENDAR_OAUTH_STATE',
          message: 'Calendar OAuth state is invalid or expired.',
        },
      });
    }

    const tokens = await exchangeOauthCode({
      provider,
      clientId: this.getProviderClientId(provider),
      clientSecret: this.getProviderClientSecret(provider),
      code: payload.code,
      redirectUri: payload.redirectUri,
      microsoftTenantId: this.getMicrosoftTenantId(),
    });
    const profile = await fetchProviderAccountProfile({
      provider,
      accessToken: tokens.accessToken,
    });

    const integration = await this.databaseService.transaction(async (client) => {
      const result = await client.query<CalendarIntegrationRow>(
        `
          INSERT INTO calendar_integrations (
            user_id,
            provider,
            external_account_id,
            access_token_encrypted,
            refresh_token_encrypted,
            token_expires_at,
            scope,
            provider_metadata,
            connected,
            last_sync_at,
            updated_at
          ) VALUES (
            $1::uuid,
            $2::calendar_source,
            $3,
            $4,
            $5,
            $6::timestamptz,
            $7,
            $8::jsonb,
            TRUE,
            NULL,
            now()
          )
          ON CONFLICT (user_id, provider)
          DO UPDATE SET
            external_account_id = EXCLUDED.external_account_id,
            access_token_encrypted = EXCLUDED.access_token_encrypted,
            refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
            token_expires_at = EXCLUDED.token_expires_at,
            scope = EXCLUDED.scope,
            provider_metadata = calendar_integrations.provider_metadata || EXCLUDED.provider_metadata,
            connected = TRUE,
            updated_at = now()
          RETURNING
            id,
            user_id,
            provider::text AS provider,
            external_account_id,
            access_token_encrypted,
            refresh_token_encrypted,
            token_expires_at,
            scope,
            sync_cursor,
            provider_metadata,
            connected,
            last_sync_at
        `,
        [
          userId,
          provider,
          profile.providerUserId,
          this.calendarCryptoService.encrypt(tokens.accessToken),
          this.calendarCryptoService.encrypt(tokens.refreshToken),
          tokens.expiresAt,
          tokens.scope,
          JSON.stringify({
            connectionMode: 'oauth',
            accountEmail: profile.email,
            providerUserId: profile.providerUserId,
            providerDisplayName: profile.displayName,
            syncMap: {},
            lastError: null,
          } satisfies CalendarProviderMetadata),
        ],
      );

      const row = result.rows[0];
      if (!row) {
        throw new BadRequestException({
          error: {
            code: 'CALENDAR_OAUTH_CONNECT_FAILED',
            message: 'Failed to complete calendar OAuth connection.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'calendar_integration',
        aggregateId: row.id,
        eventType: 'calendar.integration.connected',
        payload: {
          userId,
          provider,
          providerUserId: profile.providerUserId,
          accountEmail: profile.email,
        },
      });

      return row;
    });

    try {
      await this.syncIntegration(userId, provider, { reason: 'oauth_complete' });
      const refreshed = await this.getIntegrationRowForUser(userId, provider);
      return this.mapIntegration(refreshed);
    } catch (error) {
      await this.persistIntegrationError(
        integration.id,
        error instanceof Error ? error.message : 'Initial calendar sync failed.',
      );
      const refreshed = await this.getIntegrationRowForUser(userId, provider);
      return this.mapIntegration(refreshed);
    }
  }

  async connectIntegration(
    userId: string,
    provider: CalendarProvider,
    payload: ConnectCalendarIntegrationBody,
  ): Promise<CalendarIntegration> {
    const row = await this.databaseService.transaction(async (client) => {
      const result = await client.query<CalendarIntegrationRow>(
        `
          INSERT INTO calendar_integrations (
            user_id,
            provider,
            external_account_id,
            scope,
            provider_metadata,
            connected,
            last_sync_at
          ) VALUES (
            $1::uuid,
            $2::calendar_source,
            $3,
            $4,
            $5::jsonb,
            TRUE,
            now()
          )
          ON CONFLICT (user_id, provider)
          DO UPDATE SET
            external_account_id = COALESCE(EXCLUDED.external_account_id, calendar_integrations.external_account_id),
            scope = COALESCE(EXCLUDED.scope, calendar_integrations.scope),
            provider_metadata = calendar_integrations.provider_metadata || EXCLUDED.provider_metadata,
            connected = TRUE,
            last_sync_at = now(),
            updated_at = now()
          RETURNING
            id,
            user_id,
            provider::text AS provider,
            external_account_id,
            access_token_encrypted,
            refresh_token_encrypted,
            token_expires_at,
            scope,
            sync_cursor,
            provider_metadata,
            connected,
            last_sync_at
        `,
        [
          userId,
          provider,
          this.nullableText(payload.externalAccountId),
          this.nullableText(payload.scope),
          JSON.stringify({
            connectionMode: 'manual',
            ...(payload.providerMetadata ?? {}),
          }),
        ],
      );

      const item = result.rows[0];
      if (!item) {
        throw new BadRequestException({
          error: {
            code: 'CALENDAR_INTEGRATION_CONNECT_FAILED',
            message: 'Failed to connect calendar integration.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'calendar_integration',
        aggregateId: item.id,
        eventType: 'calendar.integration.connected',
        payload: {
          userId,
          provider,
          connectionMode: 'manual',
        },
      });

      return item;
    });

    return this.mapIntegration(row);
  }

  async disconnectIntegration(
    userId: string,
    provider: CalendarProvider,
  ): Promise<CalendarIntegration> {
    const row = await this.databaseService.transaction(async (client) => {
      const existing = await this.findIntegrationForUser(client, userId, provider);

      if (existing) {
        await client.query(
          `
            DELETE FROM calendar_events
            WHERE user_id = $1::uuid
              AND integration_id = $2::uuid
          `,
          [userId, existing.id],
        );
      }

      const result = await client.query<CalendarIntegrationRow>(
        `
          INSERT INTO calendar_integrations (
            user_id,
            provider,
            connected,
            provider_metadata
          ) VALUES (
            $1::uuid,
            $2::calendar_source,
            FALSE,
            '{}'::jsonb
          )
          ON CONFLICT (user_id, provider)
          DO UPDATE SET
            connected = FALSE,
            access_token_encrypted = NULL,
            refresh_token_encrypted = NULL,
            token_expires_at = NULL,
            sync_cursor = NULL,
            provider_metadata = '{}'::jsonb,
            updated_at = now()
          RETURNING
            id,
            user_id,
            provider::text AS provider,
            external_account_id,
            access_token_encrypted,
            refresh_token_encrypted,
            token_expires_at,
            scope,
            sync_cursor,
            provider_metadata,
            connected,
            last_sync_at
        `,
        [userId, provider],
      );

      const item = result.rows[0];
      if (!item) {
        throw new BadRequestException({
          error: {
            code: 'CALENDAR_INTEGRATION_DISCONNECT_FAILED',
            message: 'Failed to disconnect calendar integration.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'calendar_integration',
        aggregateId: item.id,
        eventType: 'calendar.integration.disconnected',
        payload: {
          userId,
          provider,
        },
      });

      return item;
    });

    return this.mapIntegration(row);
  }

  async syncIntegration(
    userId: string,
    provider: CalendarProvider,
    _options: CalendarSyncOptions,
  ): Promise<CalendarSyncResult> {
    const integration = await this.getIntegrationRowForUser(userId, provider);
    if (!integration.connected) {
      throw new BadRequestException({
        error: {
          code: 'CALENDAR_INTEGRATION_NOT_CONNECTED',
          message: 'Calendar integration is not connected.',
        },
      });
    }

    const credentials = await this.getFreshProviderCredentials(integration);
    const metadata = this.parseProviderMetadata(integration.provider_metadata);
    const syncMap = { ...(metadata.syncMap ?? {}) };
    const { startAt, endAt } = this.getSyncWindow();

    const pushedCount = await this.pushVendromEventsToProvider(
      integration,
      credentials,
      syncMap,
      startAt,
      endAt,
    );

    const providerSync = await fetchProviderCalendarDelta({
      provider,
      accessToken: credentials.accessToken,
      cursor: integration.sync_cursor,
      startAt,
      endAt,
    });

    const mirroredExternalIds = new Set(Object.values(syncMap));
    let importedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    let skippedMirroredCount = 0;

    await this.databaseService.transaction(async (client) => {
      for (const item of providerSync.items) {
        if (mirroredExternalIds.has(item.externalEventId)) {
          skippedMirroredCount += 1;
          continue;
        }

        if (item.status === 'cancelled') {
          const deleteResult = await client.query(
            `
              DELETE FROM calendar_events
              WHERE user_id = $1::uuid
                AND source = $2::calendar_source
                AND external_event_id = $3
            `,
            [userId, provider, item.externalEventId],
          );
          deletedCount += deleteResult.rowCount ?? 0;
          continue;
        }

        const upsertResult = await client.query<{ inserted: boolean }>(
          `
            INSERT INTO calendar_events (
              user_id,
              integration_id,
              source,
              external_event_id,
              event_type,
              title,
              description,
              location,
              start_at,
              end_at,
              meeting_mode,
              meeting_link,
              source_link
            ) VALUES (
              $1::uuid,
              $2::uuid,
              $3::calendar_source,
              $4,
              $5::calendar_event_type,
              $6,
              $7,
              $8,
              $9::timestamptz,
              $10::timestamptz,
              $11::meeting_mode,
              $12,
              $13
            )
            ON CONFLICT (user_id, source, external_event_id)
            DO UPDATE SET
              integration_id = EXCLUDED.integration_id,
              event_type = EXCLUDED.event_type,
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              location = EXCLUDED.location,
              start_at = EXCLUDED.start_at,
              end_at = EXCLUDED.end_at,
              meeting_mode = EXCLUDED.meeting_mode,
              meeting_link = EXCLUDED.meeting_link,
              source_link = EXCLUDED.source_link,
              updated_at = now()
            RETURNING (xmax = 0) AS inserted
          `,
          [
            userId,
            integration.id,
            provider,
            item.externalEventId,
            item.meetingLink ? 'meeting' : 'event',
            item.title,
            item.description,
            item.location,
            item.startAt,
            item.endAt,
            item.meetingLink ? 'virtual' : null,
            item.meetingLink,
            item.sourceLink,
          ],
        );

        if (upsertResult.rows[0]?.inserted) {
          importedCount += 1;
        } else {
          updatedCount += 1;
        }
      }

      const webhookMetadata = await this.ensureWebhookRegistration(
        provider,
        credentials.accessToken,
        integration.id,
      );

      await client.query(
        `
          UPDATE calendar_integrations
          SET
            access_token_encrypted = $2,
            refresh_token_encrypted = $3,
            token_expires_at = $4::timestamptz,
            scope = COALESCE($5, scope),
            sync_cursor = $6,
            provider_metadata = $7::jsonb,
            last_sync_at = now(),
            updated_at = now()
          WHERE id = $1::uuid
        `,
        [
          integration.id,
          this.calendarCryptoService.encrypt(credentials.accessToken),
          this.calendarCryptoService.encrypt(credentials.refreshToken),
          credentials.expiresAt,
          credentials.scope,
          providerSync.nextCursor,
          JSON.stringify({
            ...metadata,
            syncMap,
            webhook: webhookMetadata ?? metadata.webhook ?? null,
            lastError: null,
          } satisfies CalendarProviderMetadata),
        ],
      );
    });

    return {
      provider,
      importedCount,
      updatedCount,
      deletedCount,
      pushedCount,
      skippedMirroredCount,
      lastSyncAt: new Date().toISOString(),
    };
  }

  async syncAllConnectedIntegrations(
    userId: string,
    reason: CalendarSyncOptions['reason'],
  ): Promise<void> {
    const result = await this.databaseService.query<Pick<
      CalendarIntegrationRow,
      'provider'
    >>(
      `
        SELECT provider::text AS provider
        FROM calendar_integrations
        WHERE user_id = $1::uuid
          AND connected = TRUE
          AND access_token_encrypted IS NOT NULL
        ORDER BY provider ASC
      `,
      [userId],
    );

    for (const row of result.rows) {
      try {
        await this.syncIntegration(userId, row.provider, { reason });
      } catch (error) {
        this.logger.warn(
          `Calendar sync failed for ${userId}/${row.provider}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
  }

  async runScheduledSyncBatch(limit: number): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    const result = await this.databaseService.query<CalendarIntegrationRow>(
      `
        SELECT
          id,
          user_id,
          provider::text AS provider,
          external_account_id,
          access_token_encrypted,
          refresh_token_encrypted,
          token_expires_at,
          scope,
          sync_cursor,
          provider_metadata,
          connected,
          last_sync_at
        FROM calendar_integrations
        WHERE connected = TRUE
          AND access_token_encrypted IS NOT NULL
        ORDER BY COALESCE(last_sync_at, to_timestamp(0)) ASC, updated_at ASC
        LIMIT $1
      `,
      [limit],
    );

    let succeeded = 0;
    let failed = 0;

    for (const row of result.rows) {
      try {
        await this.syncIntegration(row.user_id, row.provider, { reason: 'worker' });
        succeeded += 1;
      } catch (error) {
        failed += 1;
        await this.persistIntegrationError(
          row.id,
          error instanceof Error ? error.message : 'Scheduled sync failed.',
        );
      }
    }

    return {
      processed: result.rows.length,
      succeeded,
      failed,
    };
  }

  async handleGoogleWebhook(
    headers: Record<string, string | string[] | undefined>,
  ): Promise<CalendarWebhookAck> {
    const integrationId = this.calendarCryptoService.verifyWebhookToken(
      this.getHeaderValue(headers, 'x-goog-channel-token'),
    );
    if (!integrationId) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_GOOGLE_WEBHOOK_TOKEN',
          message: 'Google webhook token is invalid.',
        },
      });
    }

    const integration = await this.getIntegrationById(integrationId);
    await this.syncIntegration(integration.user_id, integration.provider, {
      reason: 'webhook',
    });

    return {
      accepted: true,
      provider: 'google',
      integrationIds: [integrationId],
    };
  }

  async handleMicrosoftWebhook(payload: unknown): Promise<CalendarWebhookAck> {
    const body =
      typeof payload === 'object' && payload !== null
        ? (payload as { value?: Array<Record<string, unknown>> })
        : { value: [] };
    const values = Array.isArray(body.value) ? body.value : [];
    const integrationIds = new Set<string>();

    for (const item of values) {
      const candidate = this.calendarCryptoService.verifyWebhookToken(
        typeof item.clientState === 'string' ? item.clientState : null,
      );
      if (candidate) {
        integrationIds.add(candidate);
      }
    }

    for (const integrationId of integrationIds) {
      const integration = await this.getIntegrationById(integrationId);
      await this.syncIntegration(integration.user_id, integration.provider, {
        reason: 'webhook',
      });
    }

    return {
      accepted: true,
      provider: 'microsoft',
      integrationIds: [...integrationIds],
    };
  }

  private async pushVendromEventsToProvider(
    integration: CalendarIntegrationRow,
    credentials: ProviderTokenBundle,
    syncMap: Record<string, string>,
    startAt: string,
    endAt: string,
  ): Promise<number> {
    const result = await this.databaseService.query<CalendarEventRow>(
      `
        SELECT
          ce.id,
          ce.user_id,
          ce.integration_id,
          ce.source::text AS source,
          ce.external_event_id,
          ce.event_type::text AS event_type,
          ce.title,
          ce.description,
          ce.location,
          ce.start_at,
          ce.end_at,
          ce.recurrence_rule,
          ce.meeting_mode::text AS meeting_mode,
          ce.meeting_link,
          ce.source_link,
          ce.created_at,
          ce.updated_at
        FROM calendar_events ce
        WHERE ce.user_id = $1::uuid
          AND ce.source = 'vendrom'::calendar_source
          AND ce.start_at >= $2::timestamptz
          AND ce.start_at <= $3::timestamptz
        ORDER BY ce.start_at ASC, ce.id ASC
      `,
      [integration.user_id, startAt, endAt],
    );

    let pushedCount = 0;

    for (const row of result.rows) {
      const mirroredExternalEventId = syncMap[row.id] ?? null;
      const pushed = await upsertProviderCalendarEvent({
        provider: integration.provider,
        accessToken: credentials.accessToken,
        externalEventId: mirroredExternalEventId,
        title: row.title,
        description: row.description,
        location: row.location,
        startAt: this.toIsoTimestamp(row.start_at),
        endAt: row.end_at ? this.toIsoTimestamp(row.end_at) : null,
        meetingLink: row.meeting_link,
        sourceLink: row.source_link,
      });
      syncMap[row.id] = pushed.externalEventId;
      pushedCount += 1;
    }

    return pushedCount;
  }

  private async deleteMirroredVendromEvent(
    userId: string,
    eventId: string,
  ): Promise<void> {
    const result = await this.databaseService.query<CalendarIntegrationRow>(
      `
        SELECT
          id,
          user_id,
          provider::text AS provider,
          external_account_id,
          access_token_encrypted,
          refresh_token_encrypted,
          token_expires_at,
          scope,
          sync_cursor,
          provider_metadata,
          connected,
          last_sync_at
        FROM calendar_integrations
        WHERE user_id = $1::uuid
          AND connected = TRUE
          AND access_token_encrypted IS NOT NULL
      `,
      [userId],
    );

    for (const integration of result.rows) {
      const metadata = this.parseProviderMetadata(integration.provider_metadata);
      const syncMap = { ...(metadata.syncMap ?? {}) };
      const externalEventId = syncMap[eventId];
      if (!externalEventId) {
        continue;
      }

      try {
        const credentials = await this.getFreshProviderCredentials(integration);
        await deleteProviderCalendarEvent({
          provider: integration.provider,
          accessToken: credentials.accessToken,
          externalEventId,
        });
        delete syncMap[eventId];

        await this.databaseService.query(
          `
            UPDATE calendar_integrations
            SET
              access_token_encrypted = $2,
              refresh_token_encrypted = $3,
              token_expires_at = $4::timestamptz,
              provider_metadata = $5::jsonb,
              updated_at = now()
            WHERE id = $1::uuid
          `,
          [
            integration.id,
            this.calendarCryptoService.encrypt(credentials.accessToken),
            this.calendarCryptoService.encrypt(credentials.refreshToken),
            credentials.expiresAt,
            JSON.stringify({
              ...metadata,
              syncMap,
            } satisfies CalendarProviderMetadata),
          ],
        );
      } catch (error) {
        await this.persistIntegrationError(
          integration.id,
          error instanceof Error
            ? error.message
            : 'Failed to delete mirrored provider event.',
        );
      }
    }
  }

  private async getFreshProviderCredentials(
    integration: CalendarIntegrationRow,
  ): Promise<ProviderTokenBundle> {
    const accessToken = this.calendarCryptoService.decrypt(
      integration.access_token_encrypted,
    );
    const refreshToken = this.calendarCryptoService.decrypt(
      integration.refresh_token_encrypted,
    );
    if (!accessToken) {
      throw new BadRequestException({
        error: {
          code: 'CALENDAR_TOKENS_MISSING',
          message: 'Calendar integration tokens are missing.',
        },
      });
    }

    const expiresAt = integration.token_expires_at
      ? this.toIsoTimestamp(integration.token_expires_at)
      : null;
    const isExpiringSoon =
      expiresAt !== null &&
      new Date(expiresAt).getTime() <= Date.now() + 5 * 60 * 1000;

    if (!isExpiringSoon || !refreshToken) {
      return {
        accessToken,
        refreshToken,
        expiresAt,
        scope: integration.scope,
      };
    }

    return refreshOauthToken({
      provider: integration.provider,
      clientId: this.getProviderClientId(integration.provider),
      clientSecret: this.getProviderClientSecret(integration.provider),
      refreshToken,
      microsoftTenantId: this.getMicrosoftTenantId(),
    });
  }

  private async ensureWebhookRegistration(
    provider: CalendarProvider,
    accessToken: string,
    integrationId: string,
  ): Promise<GoogleWebhookMetadata | MicrosoftWebhookMetadata | null> {
    const webhookUrl = this.getProviderWebhookUrl(provider);
    if (!webhookUrl) {
      return null;
    }

    return ensureProviderWebhook({
      provider,
      accessToken,
      webhookUrl,
      webhookToken: this.calendarCryptoService.buildWebhookToken(integrationId),
    });
  }

  private async persistIntegrationError(
    integrationId: string,
    message: string,
  ): Promise<void> {
    const result = await this.databaseService.query<{
      provider_metadata: Record<string, unknown> | null;
    }>(
      `
        SELECT provider_metadata
        FROM calendar_integrations
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [integrationId],
    );
    const metadata = this.parseProviderMetadata(
      result.rows[0]?.provider_metadata ?? null,
    );
    metadata.lastError = message.slice(0, 500);

    await this.databaseService.query(
      `
        UPDATE calendar_integrations
        SET provider_metadata = $2::jsonb,
            updated_at = now()
        WHERE id = $1::uuid
      `,
      [integrationId, JSON.stringify(metadata)],
    );
  }

  private async getIntegrationRowForUser(
    userId: string,
    provider: CalendarProvider,
  ): Promise<CalendarIntegrationRow> {
    const result = await this.databaseService.query<CalendarIntegrationRow>(
      `
        SELECT
          id,
          user_id,
          provider::text AS provider,
          external_account_id,
          access_token_encrypted,
          refresh_token_encrypted,
          token_expires_at,
          scope,
          sync_cursor,
          provider_metadata,
          connected,
          last_sync_at
        FROM calendar_integrations
        WHERE user_id = $1::uuid
          AND provider = $2::calendar_source
        LIMIT 1
      `,
      [userId, provider],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        error: {
          code: 'CALENDAR_INTEGRATION_NOT_FOUND',
          message: 'Calendar integration not found.',
        },
      });
    }

    return row;
  }

  private async getIntegrationById(
    integrationId: string,
  ): Promise<CalendarIntegrationRow> {
    const result = await this.databaseService.query<CalendarIntegrationRow>(
      `
        SELECT
          id,
          user_id,
          provider::text AS provider,
          external_account_id,
          access_token_encrypted,
          refresh_token_encrypted,
          token_expires_at,
          scope,
          sync_cursor,
          provider_metadata,
          connected,
          last_sync_at
        FROM calendar_integrations
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [integrationId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        error: {
          code: 'CALENDAR_INTEGRATION_NOT_FOUND',
          message: 'Calendar integration not found.',
        },
      });
    }
    return row;
  }

  private async findIntegrationForUser(
    client: PoolClient,
    userId: string,
    provider: CalendarProvider,
  ): Promise<CalendarIntegrationRow | null> {
    const result = await client.query<CalendarIntegrationRow>(
      `
        SELECT
          id,
          user_id,
          provider::text AS provider,
          external_account_id,
          access_token_encrypted,
          refresh_token_encrypted,
          token_expires_at,
          scope,
          sync_cursor,
          provider_metadata,
          connected,
          last_sync_at
        FROM calendar_integrations
        WHERE user_id = $1::uuid
          AND provider = $2::calendar_source
        LIMIT 1
      `,
      [userId, provider],
    );

    return result.rows[0] ?? null;
  }

  private parseProviderMetadata(
    value: Record<string, unknown> | null,
  ): CalendarProviderMetadata {
    const syncMapValue = value?.syncMap;
    const syncMap =
      typeof syncMapValue === 'object' && syncMapValue !== null
        ? Object.fromEntries(
            Object.entries(syncMapValue).filter(
              ([, entryValue]) => typeof entryValue === 'string',
            ),
          )
        : {};

    return {
      connectionMode:
        value?.connectionMode === 'oauth'
          ? 'oauth'
          : value?.connectionMode === 'manual'
            ? 'manual'
            : undefined,
      accountEmail:
        typeof value?.accountEmail === 'string' ? value.accountEmail : null,
      providerUserId:
        typeof value?.providerUserId === 'string' ? value.providerUserId : null,
      providerDisplayName:
        typeof value?.providerDisplayName === 'string'
          ? value.providerDisplayName
          : null,
      lastError: typeof value?.lastError === 'string' ? value.lastError : null,
      syncMap,
      webhook:
        typeof value?.webhook === 'object' && value.webhook !== null
          ? (value.webhook as GoogleWebhookMetadata | MicrosoftWebhookMetadata)
          : null,
    };
  }

  private mapCalendarEvent(row: CalendarEventRow): CalendarEvent {
    return {
      id: row.id,
      userId: row.user_id,
      integrationId: row.integration_id,
      source: row.source,
      externalEventId: row.external_event_id,
      eventType: row.event_type,
      title: row.title,
      description: row.description,
      location: row.location,
      startAt: this.toIsoTimestamp(row.start_at),
      endAt: row.end_at ? this.toIsoTimestamp(row.end_at) : null,
      recurrenceRule: row.recurrence_rule,
      meetingMode: row.meeting_mode,
      meetingLink: row.meeting_link,
      sourceLink: row.source_link,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
    };
  }

  private mapIntegration(row: CalendarIntegrationRow): CalendarIntegration {
    const metadata = this.parseProviderMetadata(row.provider_metadata);
    return {
      provider: row.provider,
      connected: row.connected,
      externalAccountId: row.external_account_id,
      accountEmail: metadata.accountEmail ?? null,
      lastSyncAt: row.last_sync_at ? this.toIsoTimestamp(row.last_sync_at) : null,
      scope: row.scope,
    };
  }

  private prepareEventPayload(
    payload: CreateCalendarEventBody | UpdateCalendarEventBody,
  ) {
    const startAt = this.parseTimestamp(payload.startAt, 'INVALID_EVENT_START');
    const endAt = payload.endAt
      ? this.parseTimestamp(payload.endAt, 'INVALID_EVENT_END')
      : null;

    if (endAt && endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_EVENT_RANGE',
          message: 'Event end time must be after the start time.',
        },
      });
    }

    if (
      payload.eventType === 'meeting' &&
      payload.meetingMode === 'virtual' &&
      !payload.meetingLink?.trim()
    ) {
      throw new BadRequestException({
        error: {
          code: 'MISSING_MEETING_LINK',
          message: 'Virtual meetings require a meeting link.',
        },
      });
    }

    return {
      title: payload.title.trim(),
      description: this.nullableText(payload.description),
      location: this.nullableText(payload.location),
      startAt: startAt.toISOString(),
      endAt: endAt?.toISOString() ?? null,
      eventType: payload.eventType,
      recurrenceRule: this.nullableText(payload.recurrenceRule),
      meetingMode:
        payload.eventType === 'meeting' ? payload.meetingMode ?? null : null,
      meetingLink:
        payload.eventType === 'meeting' && payload.meetingMode === 'virtual'
          ? this.nullableText(payload.meetingLink)
          : null,
      sourceLink: this.nullableText(payload.sourceLink),
    };
  }

  private getSyncWindow(): { startAt: string; endAt: string } {
    const lookbackDays = this.getNumberEnv('CALENDAR_SYNC_LOOKBACK_DAYS', 30);
    const lookaheadDays = this.getNumberEnv('CALENDAR_SYNC_LOOKAHEAD_DAYS', 365);
    const startAt = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const endAt = new Date(Date.now() + lookaheadDays * 24 * 60 * 60 * 1000);
    return {
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    };
  }

  private triggerBackgroundSync(userId: string): void {
    if (this.configService.get<string>('CALENDAR_SYNC_ENABLED', 'true') !== 'true') {
      return;
    }

    void this.syncAllConnectedIntegrations(userId, 'event_change');
  }

  private getProviderClientId(provider: CalendarProvider): string {
    const value =
      provider === 'google'
        ? this.configService.get<string>('GOOGLE_CALENDAR_CLIENT_ID') ??
          this.configService.get<string>('GOOGLE_CLIENT_ID')
        : this.configService.get<string>('MICROSOFT_CALENDAR_CLIENT_ID');
    if (!value?.trim()) {
      throw new BadRequestException({
        error: {
          code: 'CALENDAR_PROVIDER_NOT_CONFIGURED',
          message: `${provider} calendar OAuth client is not configured.`,
        },
      });
    }
    return value.trim();
  }

  private getProviderClientSecret(provider: CalendarProvider): string {
    const value =
      provider === 'google'
        ? this.configService.get<string>('GOOGLE_CALENDAR_CLIENT_SECRET') ??
          this.configService.get<string>('GOOGLE_CLIENT_SECRET')
        : this.configService.get<string>('MICROSOFT_CALENDAR_CLIENT_SECRET');
    if (!value?.trim()) {
      throw new BadRequestException({
        error: {
          code: 'CALENDAR_PROVIDER_NOT_CONFIGURED',
          message: `${provider} calendar OAuth secret is not configured.`,
        },
      });
    }
    return value.trim();
  }

  private getMicrosoftTenantId(): string | undefined {
    return this.configService.get<string>('MICROSOFT_CALENDAR_TENANT_ID');
  }

  private getProviderWebhookUrl(provider: CalendarProvider): string | null {
    const value =
      provider === 'google'
        ? this.configService.get<string>('GOOGLE_CALENDAR_WEBHOOK_CALLBACK_URL')
        : this.configService.get<string>('MICROSOFT_CALENDAR_WEBHOOK_CALLBACK_URL');
    return value?.trim() || null;
  }

  private parseTimestamp(value: string, code: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({
        error: {
          code,
          message: 'Calendar timestamp is invalid.',
        },
      });
    }

    return parsed;
  }

  private nullableText(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private toIsoTimestamp(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  private getNumberEnv(name: string, fallback: number): number {
    const raw = this.configService.get<string>(name);
    if (!raw) {
      return fallback;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private getHeaderValue(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | null {
    const value = headers[name];
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }
    return value ?? null;
  }

  private async appendOutboxEvent(
    client: PoolClient,
    event: {
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: Record<string, unknown>;
      headers?: Record<string, unknown>;
    },
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload, headers)
        VALUES ($1, $2::uuid, $3, $4::jsonb, $5::jsonb)
      `,
      [
        event.aggregateType,
        event.aggregateId,
        event.eventType,
        JSON.stringify(event.payload),
        JSON.stringify(event.headers ?? {}),
      ],
    );
  }
}
