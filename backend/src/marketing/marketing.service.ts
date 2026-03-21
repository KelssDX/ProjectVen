import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import type {
  CreateMarketingCampaignBody,
  IngestMarketingCampaignMetricsBody,
  MarketingCampaignListQuery,
  UpdateMarketingCampaignStatusBody,
} from './marketing.types';
import type {
  MarketingCampaign,
  MarketingCampaignList,
  MarketingCampaignMetrics,
} from '../contracts/marketing';

interface CampaignRow {
  id: string;
  user_id: string;
  name: string;
  campaign_type: MarketingCampaign['campaignType'];
  budget: string | number;
  spent_amount: string | number;
  status: MarketingCampaign['status'];
  start_at: string | Date;
  end_at: string | Date;
  impressions: string | number;
  clicks: string | number;
  conversions: string | number;
  target_industries: string[] | null;
  target_locations: string[] | null;
  target_user_types: MarketingCampaign['targetAudience']['userTypes'] | null;
  created_at: string | Date;
  updated_at: string | Date;
}

@Injectable()
export class MarketingService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getCampaigns(
    userId: string,
    query: MarketingCampaignListQuery,
  ): Promise<MarketingCampaignList> {
    const params: unknown[] = [userId];
    const whereClauses = [
      `mc.user_id = $1::uuid`,
      `mc.deleted_at IS NULL`,
    ];

    if (query.status) {
      params.push(query.status);
      whereClauses.push(`mc.status = $${params.length}::campaign_status`);
    }

    params.push(query.limit);
    const limitParam = params.length;

    const result = await this.databaseService.query<CampaignRow>(
      `
        SELECT
          mc.id,
          mc.user_id,
          mc.name,
          mc.campaign_type::text AS campaign_type,
          mc.budget,
          mc.spent_amount,
          mc.status::text AS status,
          mc.start_at,
          mc.end_at,
          mc.impressions,
          mc.clicks,
          mc.conversions,
          target_industries.items AS target_industries,
          target_locations.items AS target_locations,
          target_user_types.items AS target_user_types,
          mc.created_at,
          mc.updated_at
        FROM marketing_campaigns mc
        LEFT JOIN LATERAL (
          SELECT array_agg(industry ORDER BY industry) AS items
          FROM marketing_campaign_target_industries
          WHERE campaign_id = mc.id
        ) target_industries ON TRUE
        LEFT JOIN LATERAL (
          SELECT array_agg(location ORDER BY location) AS items
          FROM marketing_campaign_target_locations
          WHERE campaign_id = mc.id
        ) target_locations ON TRUE
        LEFT JOIN LATERAL (
          SELECT array_agg(target_user_type::text ORDER BY target_user_type::text) AS items
          FROM marketing_campaign_target_user_types
          WHERE campaign_id = mc.id
        ) target_user_types ON TRUE
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY mc.created_at DESC, mc.id DESC
        LIMIT $${limitParam}
      `,
      params,
    );

    return {
      items: result.rows.map((row) => this.mapCampaign(row)),
    };
  }

  async createCampaign(
    userId: string,
    payload: CreateMarketingCampaignBody,
  ): Promise<MarketingCampaign> {
    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_CAMPAIGN_DATES',
          message: 'Campaign dates are invalid.',
        },
      });
    }
    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_CAMPAIGN_RANGE',
          message: 'Campaign end date must be after start date.',
        },
      });
    }

    return this.databaseService.transaction(async (client) => {
      const insertResult = await client.query<CampaignRow>(
        `
          INSERT INTO marketing_campaigns (
            user_id,
            name,
            campaign_type,
            budget,
            status,
            start_at,
            end_at
          ) VALUES (
            $1::uuid,
            $2,
            $3::campaign_type,
            $4,
            'draft'::campaign_status,
            $5::timestamptz,
            $6::timestamptz
          )
          RETURNING
            id,
            user_id,
            name,
            campaign_type::text AS campaign_type,
            budget,
            spent_amount,
            status::text AS status,
            start_at,
            end_at,
            impressions,
            clicks,
            conversions,
            created_at,
            updated_at
        `,
        [userId, payload.name.trim(), payload.campaignType, payload.budget, startAt.toISOString(), endAt.toISOString()],
      );
      const inserted = insertResult.rows[0];
      if (!inserted) {
        throw new BadRequestException({
          error: {
            code: 'CAMPAIGN_CREATE_FAILED',
            message: 'Failed to create marketing campaign.',
          },
        });
      }

      await this.syncStringList(
        client,
        'marketing_campaign_target_industries',
        'industry',
        inserted.id,
        payload.targetIndustries,
      );
      await this.syncStringList(
        client,
        'marketing_campaign_target_locations',
        'location',
        inserted.id,
        payload.targetLocations,
      );
      await this.syncStringList(
        client,
        'marketing_campaign_target_user_types',
        'target_user_type',
        inserted.id,
        payload.targetUserTypes,
      );

      await this.appendOutboxEvent(client, {
        aggregateType: 'marketing_campaign',
        aggregateId: inserted.id,
        eventType: 'marketing.campaign.created',
        payload: {
          campaignId: inserted.id,
          userId,
          campaignType: payload.campaignType,
          budget: payload.budget,
          targetIndustries: payload.targetIndustries,
          targetLocations: payload.targetLocations,
          targetUserTypes: payload.targetUserTypes,
        },
      });

      return this.hydrateCampaign(client, inserted.id);
    });
  }

  async updateStatus(
    userId: string,
    campaignId: string,
    payload: UpdateMarketingCampaignStatusBody,
  ): Promise<MarketingCampaign> {
    return this.databaseService.transaction(async (client) => {
      const result = await client.query<{ id: string }>(
        `
          UPDATE marketing_campaigns
          SET
            status = $3::campaign_status,
            updated_at = now()
          WHERE id = $1::uuid
            AND user_id = $2::uuid
            AND deleted_at IS NULL
          RETURNING id
        `,
        [campaignId, userId, payload.status],
      );
      if (!result.rows[0]) {
        throw new NotFoundException({
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Marketing campaign not found.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'marketing_campaign',
        aggregateId: campaignId,
        eventType: 'marketing.campaign.status.updated',
        payload: {
          campaignId,
          userId,
          status: payload.status,
        },
      });

      return this.hydrateCampaign(client, campaignId);
    });
  }

  async getMetrics(
    userId: string,
    campaignId: string,
  ): Promise<MarketingCampaignMetrics> {
    const result = await this.databaseService.query<{
      impressions: string | number;
      clicks: string | number;
      conversions: string | number;
      spent_amount: string | number;
    }>(
      `
        SELECT impressions, clicks, conversions, spent_amount
        FROM marketing_campaigns
        WHERE id = $1::uuid
          AND user_id = $2::uuid
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [campaignId, userId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Marketing campaign not found.',
        },
      });
    }

    return {
      impressions: this.toCount(row.impressions),
      clicks: this.toCount(row.clicks),
      conversions: this.toCount(row.conversions),
      spentAmount: this.toNumber(row.spent_amount),
    };
  }

  async ingestMetrics(
    userId: string,
    campaignId: string,
    payload: IngestMarketingCampaignMetricsBody,
  ): Promise<MarketingCampaignMetrics> {
    return this.databaseService.transaction(async (client) => {
      const result = await client.query<{
        impressions: string | number;
        clicks: string | number;
        conversions: string | number;
        spent_amount: string | number;
      }>(
        `
          UPDATE marketing_campaigns
          SET
            impressions = impressions + $3,
            clicks = clicks + $4,
            conversions = conversions + $5,
            spent_amount = spent_amount + $6,
            updated_at = now()
          WHERE id = $1::uuid
            AND user_id = $2::uuid
            AND deleted_at IS NULL
          RETURNING impressions, clicks, conversions, spent_amount
        `,
        [
          campaignId,
          userId,
          payload.impressionsDelta ?? 0,
          payload.clicksDelta ?? 0,
          payload.conversionsDelta ?? 0,
          payload.spentAmountDelta ?? 0,
        ],
      );
      const row = result.rows[0];
      if (!row) {
        throw new NotFoundException({
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Marketing campaign not found.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'marketing_campaign',
        aggregateId: campaignId,
        eventType: 'marketing.campaign.metrics.ingested',
        payload: {
          campaignId,
          userId,
          impressionsDelta: payload.impressionsDelta ?? 0,
          clicksDelta: payload.clicksDelta ?? 0,
          conversionsDelta: payload.conversionsDelta ?? 0,
          spentAmountDelta: payload.spentAmountDelta ?? 0,
        },
      });

      return {
        impressions: this.toCount(row.impressions),
        clicks: this.toCount(row.clicks),
        conversions: this.toCount(row.conversions),
        spentAmount: this.toNumber(row.spent_amount),
      };
    });
  }

  private async hydrateCampaign(
    client: PoolClient,
    campaignId: string,
  ): Promise<MarketingCampaign> {
    const result = await client.query<CampaignRow>(
      `
        SELECT
          mc.id,
          mc.user_id,
          mc.name,
          mc.campaign_type::text AS campaign_type,
          mc.budget,
          mc.spent_amount,
          mc.status::text AS status,
          mc.start_at,
          mc.end_at,
          mc.impressions,
          mc.clicks,
          mc.conversions,
          target_industries.items AS target_industries,
          target_locations.items AS target_locations,
          target_user_types.items AS target_user_types,
          mc.created_at,
          mc.updated_at
        FROM marketing_campaigns mc
        LEFT JOIN LATERAL (
          SELECT array_agg(industry ORDER BY industry) AS items
          FROM marketing_campaign_target_industries
          WHERE campaign_id = mc.id
        ) target_industries ON TRUE
        LEFT JOIN LATERAL (
          SELECT array_agg(location ORDER BY location) AS items
          FROM marketing_campaign_target_locations
          WHERE campaign_id = mc.id
        ) target_locations ON TRUE
        LEFT JOIN LATERAL (
          SELECT array_agg(target_user_type::text ORDER BY target_user_type::text) AS items
          FROM marketing_campaign_target_user_types
          WHERE campaign_id = mc.id
        ) target_user_types ON TRUE
        WHERE mc.id = $1::uuid
        LIMIT 1
      `,
      [campaignId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Marketing campaign not found.',
        },
      });
    }

    return this.mapCampaign(row);
  }

  private mapCampaign(row: CampaignRow): MarketingCampaign {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      campaignType: row.campaign_type,
      budget: this.toNumber(row.budget),
      spentAmount: this.toNumber(row.spent_amount),
      status: row.status,
      startAt: this.toIsoTimestamp(row.start_at),
      endAt: this.toIsoTimestamp(row.end_at),
      impressions: this.toCount(row.impressions),
      clicks: this.toCount(row.clicks),
      conversions: this.toCount(row.conversions),
      targetAudience: {
        industries: row.target_industries ?? [],
        locations: row.target_locations ?? [],
        userTypes: row.target_user_types ?? [],
      },
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
    };
  }

  private async syncStringList(
    client: PoolClient,
    tableName:
      | 'marketing_campaign_target_industries'
      | 'marketing_campaign_target_locations'
      | 'marketing_campaign_target_user_types',
    columnName: 'industry' | 'location' | 'target_user_type',
    campaignId: string,
    values: readonly string[],
  ): Promise<void> {
    await client.query(`DELETE FROM ${tableName} WHERE campaign_id = $1::uuid`, [
      campaignId,
    ]);

    for (const value of [...new Set(values.map((item) => item.trim()).filter(Boolean))]) {
      await client.query(
        `INSERT INTO ${tableName} (campaign_id, ${columnName}) VALUES ($1::uuid, $2)`,
        [campaignId, value],
      );
    }
  }

  private toCount(value: string | number): number {
    return typeof value === 'number' ? value : Number(value);
  }

  private toNumber(value: string | number): number {
    return typeof value === 'number' ? value : Number(value);
  }

  private toIsoTimestamp(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
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
