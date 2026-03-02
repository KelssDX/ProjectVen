import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import type {
  ConnectionItem,
  ConnectionListResponse,
  CreateConnectionRequestBody,
  FollowToggleResponse,
  TopicListQuery,
  TopicListResponse,
  TopicFollowToggleResponse,
  TopicSummary,
} from './connections.types';

interface ConnectionRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionItem['status'];
  message: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  other_user_id: string;
  other_first_name: string;
  other_last_name: string;
  other_avatar_url: string | null;
  other_user_type: ConnectionItem['otherUser']['userType'];
  other_company_name: string | null;
}

interface TopicRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  followers_count: string | number;
  is_following: boolean;
}

@Injectable()
export class ConnectionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getMine(userId: string, search?: string): Promise<ConnectionListResponse> {
    const params: unknown[] = [userId];
    const whereClauses = [
      '(c.requester_id = $1::uuid OR c.addressee_id = $1::uuid)',
      "c.status <> 'blocked'::connection_status",
    ];

    if (search) {
      params.push(`%${search}%`);
      const searchParam = params.length;
      whereClauses.push(
        `(CONCAT(ou.first_name, ' ', ou.last_name) ILIKE $${searchParam} OR COALESCE(obp.company_name, '') ILIKE $${searchParam})`,
      );
    }

    const result = await this.databaseService.query<ConnectionRow>(
      `
        SELECT
          c.id,
          c.requester_id,
          c.addressee_id,
          c.status::text AS status,
          c.message,
          c.created_at,
          c.updated_at,
          ou.id AS other_user_id,
          ou.first_name AS other_first_name,
          ou.last_name AS other_last_name,
          ou.avatar_url AS other_avatar_url,
          ou.user_type::text AS other_user_type,
          COALESCE(obp.company_name, 'Independent') AS other_company_name
        FROM connections c
        JOIN users ou
          ON ou.id = CASE WHEN c.requester_id = $1::uuid THEN c.addressee_id ELSE c.requester_id END
          AND ou.deleted_at IS NULL
          AND ou.is_active = TRUE
        LEFT JOIN business_profiles obp
          ON obp.user_id = ou.id
          AND obp.deleted_at IS NULL
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY c.updated_at DESC, c.created_at DESC
      `,
      params,
    );

    const accepted: ConnectionItem[] = [];
    const pendingReceived: ConnectionItem[] = [];
    const pendingSent: ConnectionItem[] = [];

    for (const row of result.rows) {
      const mapped = this.mapConnectionRow(row);
      if (mapped.status === 'accepted') {
        accepted.push(mapped);
      } else if (
        mapped.status === 'pending' &&
        mapped.addresseeId === userId
      ) {
        pendingReceived.push(mapped);
      } else if (
        mapped.status === 'pending' &&
        mapped.requesterId === userId
      ) {
        pendingSent.push(mapped);
      }
    }

    return {
      accepted,
      pendingReceived,
      pendingSent,
    };
  }

  async requestConnection(
    requesterId: string,
    payload: CreateConnectionRequestBody,
  ): Promise<ConnectionItem> {
    if (requesterId === payload.addresseeId) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_CONNECTION_REQUEST',
          message: 'You cannot send a connection request to yourself.',
        },
      });
    }

    const addressee = await this.databaseService.query<{ id: string }>(
      `
        SELECT id
        FROM users
        WHERE id = $1::uuid
          AND deleted_at IS NULL
          AND is_active = TRUE
        LIMIT 1
      `,
      [payload.addresseeId],
    );

    if (!addressee.rows[0]) {
      throw new NotFoundException({
        error: {
          code: 'ADDRESSEE_NOT_FOUND',
          message: 'Target user not found.',
        },
      });
    }

    const existing = await this.databaseService.query<{ id: string; status: string }>(
      `
        SELECT id, status::text AS status
        FROM connections
        WHERE (requester_id = $1::uuid AND addressee_id = $2::uuid)
           OR (requester_id = $2::uuid AND addressee_id = $1::uuid)
        LIMIT 1
      `,
      [requesterId, payload.addresseeId],
    );

    if (existing.rows[0]) {
      throw new BadRequestException({
        error: {
          code: 'CONNECTION_ALREADY_EXISTS',
          message: 'A connection record already exists for this user pair.',
          details: { status: existing.rows[0].status },
        },
      });
    }

    const connectionId = await this.databaseService.transaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `
          INSERT INTO connections (requester_id, addressee_id, status, message)
          VALUES ($1::uuid, $2::uuid, 'pending'::connection_status, $3)
          RETURNING id
        `,
        [requesterId, payload.addresseeId, payload.message ?? null],
      );

      const insertedId = inserted.rows[0]?.id;
      if (!insertedId) {
        throw new BadRequestException({
          error: {
            code: 'CONNECTION_CREATE_FAILED',
            message: 'Failed to create connection request.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'connection',
        aggregateId: insertedId,
        eventType: 'connection.requested',
        payload: {
          requesterId,
          addresseeId: payload.addresseeId,
        },
      });

      return insertedId;
    });

    return this.getConnectionByIdForUser(connectionId, requesterId);
  }

  async acceptConnection(userId: string, connectionId: string): Promise<ConnectionItem> {
    const updated = await this.databaseService.transaction(async (client) => {
      const result = await client.query<{
        id: string;
        requester_id: string;
        addressee_id: string;
      }>(
        `
          UPDATE connections
          SET
            status = 'accepted'::connection_status,
            updated_at = now()
          WHERE id = $1::uuid
            AND addressee_id = $2::uuid
            AND status = 'pending'::connection_status
          RETURNING id, requester_id, addressee_id
        `,
        [connectionId, userId],
      );

      const row = result.rows[0];
      if (!row) {
        throw new UnauthorizedException({
          error: {
            code: 'CONNECTION_ACCEPT_NOT_ALLOWED',
            message: 'Connection cannot be accepted.',
          },
        });
      }

      await client.query(
        `
          INSERT INTO conversations (connection_id)
          VALUES ($1::uuid)
          ON CONFLICT (connection_id) DO NOTHING
        `,
        [connectionId],
      );

      await client.query(
        `
          INSERT INTO conversation_participants (conversation_id, user_id)
          SELECT conv.id, c.requester_id
          FROM conversations conv
          JOIN connections c
            ON c.id = $1::uuid
          WHERE conv.connection_id = $1::uuid
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `,
        [connectionId],
      );

      await client.query(
        `
          INSERT INTO conversation_participants (conversation_id, user_id)
          SELECT conv.id, c.addressee_id
          FROM conversations conv
          JOIN connections c
            ON c.id = $1::uuid
          WHERE conv.connection_id = $1::uuid
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `,
        [connectionId],
      );

      await this.appendOutboxEvent(client, {
        aggregateType: 'connection',
        aggregateId: row.id,
        eventType: 'connection.accepted',
        payload: {
          requesterId: row.requester_id,
          addresseeId: row.addressee_id,
          acceptedBy: userId,
        },
      });

      return row;
    });

    return this.getConnectionByIdForUser(updated.id, userId);
  }

  async rejectConnection(userId: string, connectionId: string): Promise<ConnectionItem> {
    const rejected = await this.databaseService.transaction(async (client) => {
      const result = await client.query<{ id: string }>(
        `
          UPDATE connections
          SET
            status = 'rejected'::connection_status,
            updated_at = now()
          WHERE id = $1::uuid
            AND addressee_id = $2::uuid
            AND status = 'pending'::connection_status
          RETURNING id
        `,
        [connectionId, userId],
      );

      const row = result.rows[0];
      if (!row) {
        throw new UnauthorizedException({
          error: {
            code: 'CONNECTION_REJECT_NOT_ALLOWED',
            message: 'Connection cannot be rejected.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'connection',
        aggregateId: row.id,
        eventType: 'connection.rejected',
        payload: {
          rejectedBy: userId,
        },
      });

      return row;
    });

    return this.getConnectionByIdForUser(rejected.id, userId);
  }

  async toggleFollow(userId: string, targetUserId: string): Promise<FollowToggleResponse> {
    if (userId === targetUserId) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_FOLLOW_TARGET',
          message: 'You cannot follow yourself.',
        },
      });
    }

    const target = await this.databaseService.query<{ id: string }>(
      `
        SELECT id
        FROM users
        WHERE id = $1::uuid
          AND deleted_at IS NULL
          AND is_active = TRUE
        LIMIT 1
      `,
      [targetUserId],
    );

    if (!target.rows[0]) {
      throw new NotFoundException({
        error: {
          code: 'FOLLOW_TARGET_NOT_FOUND',
          message: 'Target user not found.',
        },
      });
    }

    return this.databaseService.transaction(async (client) => {
      const existing = await client.query<{ follower_user_id: string }>(
        `
          SELECT follower_user_id
          FROM user_follows
          WHERE follower_user_id = $1::uuid
            AND followed_user_id = $2::uuid
          LIMIT 1
        `,
        [userId, targetUserId],
      );

      let isFollowing = false;

      if (existing.rows[0]) {
        await client.query(
          `
            DELETE FROM user_follows
            WHERE follower_user_id = $1::uuid
              AND followed_user_id = $2::uuid
          `,
          [userId, targetUserId],
        );
      } else {
        await client.query(
          `
            INSERT INTO user_follows (follower_user_id, followed_user_id)
            VALUES ($1::uuid, $2::uuid)
          `,
          [userId, targetUserId],
        );
        isFollowing = true;
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'user_follow',
        aggregateId: targetUserId,
        eventType: 'user.follow.toggled',
        payload: {
          followerUserId: userId,
          followedUserId: targetUserId,
          isFollowing,
        },
      });

      return { isFollowing };
    });
  }

  async getTopics(userId: string, query: TopicListQuery): Promise<TopicListResponse> {
    const params: unknown[] = [userId];
    const whereClauses: string[] = [];

    if (query.search) {
      params.push(`%${query.search}%`);
      const searchParam = params.length;
      whereClauses.push(
        `(t.slug ILIKE $${searchParam} OR t.name ILIKE $${searchParam} OR COALESCE(t.description, '') ILIKE $${searchParam})`,
      );
    }

    params.push(query.limit);
    const limitParam = params.length;

    const result = await this.databaseService.query<TopicRow>(
      `
        SELECT
          t.id,
          t.slug,
          t.name,
          t.description,
          (
            SELECT COUNT(*)
            FROM user_topic_follows utf_count
            WHERE utf_count.topic_id = t.id
          ) AS followers_count,
          EXISTS (
            SELECT 1
            FROM user_topic_follows utf
            WHERE utf.topic_id = t.id
              AND utf.user_id = $1::uuid
          ) AS is_following
        FROM topics t
        ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
        ORDER BY followers_count DESC, t.name ASC
        LIMIT $${limitParam}
      `,
      params,
    );

    return {
      items: result.rows.map((row) => this.mapTopicRow(row)),
    };
  }

  async toggleTopicFollow(userId: string, topicId: string): Promise<TopicFollowToggleResponse> {
    return this.databaseService.transaction(async (client) => {
      const topicResult = await client.query<{ id: string }>(
        `
          SELECT id
          FROM topics
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [topicId],
      );

      if (!topicResult.rows[0]) {
        throw new NotFoundException({
          error: {
            code: 'TOPIC_NOT_FOUND',
            message: 'Topic not found.',
          },
        });
      }

      const inserted = await client.query<{ topic_id: string }>(
        `
          INSERT INTO user_topic_follows (user_id, topic_id)
          VALUES ($1::uuid, $2::uuid)
          ON CONFLICT DO NOTHING
          RETURNING topic_id
        `,
        [userId, topicId],
      );

      let isFollowing = (inserted.rowCount ?? 0) > 0;
      if (!isFollowing) {
        await client.query(
          `
            DELETE FROM user_topic_follows
            WHERE user_id = $1::uuid
              AND topic_id = $2::uuid
          `,
          [userId, topicId],
        );
      }

      const countResult = await client.query<{ followers_count: string | number }>(
        `
          SELECT COUNT(*) AS followers_count
          FROM user_topic_follows
          WHERE topic_id = $1::uuid
        `,
        [topicId],
      );

      const followersCount = this.toCount(countResult.rows[0]?.followers_count ?? 0);

      await this.appendOutboxEvent(client, {
        aggregateType: 'topic_follow',
        aggregateId: topicId,
        eventType: 'topic.follow.toggled',
        payload: {
          userId,
          topicId,
          isFollowing,
          followersCount,
        },
      });

      return {
        topicId,
        isFollowing,
        followersCount,
      };
    });
  }

  private async getConnectionByIdForUser(
    connectionId: string,
    userId: string,
  ): Promise<ConnectionItem> {
    const result = await this.databaseService.query<ConnectionRow>(
      `
        SELECT
          c.id,
          c.requester_id,
          c.addressee_id,
          c.status::text AS status,
          c.message,
          c.created_at,
          c.updated_at,
          ou.id AS other_user_id,
          ou.first_name AS other_first_name,
          ou.last_name AS other_last_name,
          ou.avatar_url AS other_avatar_url,
          ou.user_type::text AS other_user_type,
          COALESCE(obp.company_name, 'Independent') AS other_company_name
        FROM connections c
        JOIN users ou
          ON ou.id = CASE WHEN c.requester_id = $2::uuid THEN c.addressee_id ELSE c.requester_id END
          AND ou.deleted_at IS NULL
          AND ou.is_active = TRUE
        LEFT JOIN business_profiles obp
          ON obp.user_id = ou.id
          AND obp.deleted_at IS NULL
        WHERE c.id = $1::uuid
          AND (c.requester_id = $2::uuid OR c.addressee_id = $2::uuid)
        LIMIT 1
      `,
      [connectionId, userId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        error: {
          code: 'CONNECTION_NOT_FOUND',
          message: 'Connection not found.',
        },
      });
    }

    return this.mapConnectionRow(row);
  }

  private mapConnectionRow(row: ConnectionRow): ConnectionItem {
    return {
      id: row.id,
      requesterId: row.requester_id,
      addresseeId: row.addressee_id,
      status: row.status,
      message: row.message,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
      otherUser: {
        id: row.other_user_id,
        name: `${row.other_first_name} ${row.other_last_name}`.trim(),
        company: row.other_company_name ?? 'Independent',
        avatar: row.other_avatar_url,
        userType: row.other_user_type,
      },
    };
  }

  private mapTopicRow(row: TopicRow): TopicSummary {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      followersCount: this.toCount(row.followers_count),
      isFollowing: row.is_following,
    };
  }

  private toCount(value: string | number): number {
    return typeof value === 'number' ? value : Number(value);
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

  private toIsoTimestamp(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }
}
