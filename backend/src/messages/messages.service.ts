import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import type {
  ConversationListResponse,
  ConversationMessageItem,
  ConversationMessagePage,
  ConversationListQuery,
  CreateMessageBody,
  MarkConversationReadResult,
  MessageListQuery,
} from './messages.types';
import { RealtimeService } from '../realtime/realtime.service';
import type { RealtimeMessageCreatedPayload, RealtimeMessageReadPayload } from '../realtime/realtime.types';

interface ConversationRow {
  id: string;
  connection_id: string | null;
  created_at: string | Date;
  last_message_id: string | null;
  last_message_sender_id: string | null;
  last_message_content: string | null;
  last_message_created_at: string | Date | null;
  unread_count: string | number;
  other_user_id: string;
  other_first_name: string;
  other_last_name: string;
  other_avatar_url: string | null;
  other_user_type: ConversationListResponse['items'][number]['otherUser']['userType'];
  other_company_name: string | null;
}

interface ConversationMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string | Date;
  edited_at: string | Date | null;
  is_read_by_viewer: boolean;
  is_read_by_other_participant: boolean;
}

interface InsertedMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string | Date;
  edited_at: string | Date | null;
}

interface ConversationAccessRow {
  id: string;
  connection_id: string | null;
}

interface MessageCursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async getConversations(
    userId: string,
    query: ConversationListQuery,
  ): Promise<ConversationListResponse> {
    const params: unknown[] = [userId];
    const whereClauses = ['cp_self.user_id = $1::uuid'];

    if (query.search) {
      params.push(`%${query.search}%`);
      const searchParam = params.length;
      whereClauses.push(
        `(CONCAT(ou.first_name, ' ', ou.last_name) ILIKE $${searchParam} OR COALESCE(obp.company_name, '') ILIKE $${searchParam})`,
      );
    }

    params.push(query.limit);
    const limitParam = params.length;

    const result = await this.databaseService.query<ConversationRow>(
      `
        SELECT
          c.id,
          c.connection_id,
          c.created_at,
          lm.id AS last_message_id,
          lm.sender_id AS last_message_sender_id,
          lm.content AS last_message_content,
          lm.created_at AS last_message_created_at,
          COALESCE(unread.unread_count, 0) AS unread_count,
          ou.id AS other_user_id,
          ou.first_name AS other_first_name,
          ou.last_name AS other_last_name,
          ou.avatar_url AS other_avatar_url,
          ou.user_type::text AS other_user_type,
          COALESCE(obp.company_name, 'Independent') AS other_company_name
        FROM conversations c
        JOIN conversation_participants cp_self
          ON cp_self.conversation_id = c.id
        JOIN conversation_participants cp_other
          ON cp_other.conversation_id = c.id
          AND cp_other.user_id <> $1::uuid
        JOIN users ou
          ON ou.id = cp_other.user_id
          AND ou.deleted_at IS NULL
          AND ou.is_active = TRUE
        LEFT JOIN business_profiles obp
          ON obp.user_id = ou.id
          AND obp.deleted_at IS NULL
        LEFT JOIN LATERAL (
          SELECT
            m.id,
            m.sender_id,
            m.content,
            m.created_at
          FROM messages m
          WHERE m.conversation_id = c.id
            AND m.deleted_at IS NULL
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT 1
        ) lm ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS unread_count
          FROM messages m_unread
          WHERE m_unread.conversation_id = c.id
            AND m_unread.sender_id <> $1::uuid
            AND m_unread.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM message_reads mr
              WHERE mr.message_id = m_unread.id
                AND mr.user_id = $1::uuid
            )
        ) unread ON TRUE
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY COALESCE(lm.created_at, c.created_at) DESC, c.id DESC
        LIMIT $${limitParam}
      `,
      params,
    );

    return {
      items: result.rows.map((row) => this.mapConversationRow(row)),
    };
  }

  async getMessages(
    userId: string,
    conversationId: string,
    query: MessageListQuery,
  ): Promise<ConversationMessagePage> {
    return this.databaseService.transaction(async (client) => {
      await this.requireConversationAccess(client, userId, conversationId);

      const params: unknown[] = [conversationId, userId];
      const whereClauses = [
        'm.conversation_id = $1::uuid',
        'm.deleted_at IS NULL',
      ];

      if (query.cursor) {
        const cursor = this.decodeCursor(query.cursor);
        params.push(cursor.createdAt, cursor.id);
        whereClauses.push(
          `(m.created_at, m.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
        );
      }

      params.push(query.limit + 1);
      const limitParam = params.length;

      const result = await client.query<ConversationMessageRow>(
        `
          SELECT
            m.id,
            m.conversation_id,
            m.sender_id,
            m.content,
            m.created_at,
            m.edited_at,
            (
              m.sender_id = $2::uuid
              OR EXISTS (
                SELECT 1
                FROM message_reads mr_viewer
                WHERE mr_viewer.message_id = m.id
                  AND mr_viewer.user_id = $2::uuid
              )
            ) AS is_read_by_viewer,
            EXISTS (
              SELECT 1
              FROM message_reads mr_other
              JOIN conversation_participants cp_other
                ON cp_other.conversation_id = m.conversation_id
                AND cp_other.user_id = mr_other.user_id
              WHERE mr_other.message_id = m.id
                AND cp_other.user_id <> m.sender_id
            ) AS is_read_by_other_participant
          FROM messages m
          WHERE ${whereClauses.join(' AND ')}
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT $${limitParam}
        `,
        params,
      );

      const hasMore = result.rows.length > query.limit;
      const pageRows = hasMore ? result.rows.slice(0, query.limit) : result.rows;
      const cursorSource = hasMore ? pageRows[pageRows.length - 1] : null;
      const items = [...pageRows].reverse().map((row) => this.mapMessageRow(row));

      return {
        items,
        nextCursor: cursorSource
          ? this.encodeCursor({
              createdAt: this.toIsoTimestamp(cursorSource.created_at),
              id: cursorSource.id,
            })
          : null,
        hasMore,
      };
    });
  }

  async createMessage(
    userId: string,
    conversationId: string,
    payload: CreateMessageBody,
  ): Promise<ConversationMessageItem> {
    const created = await this.databaseService.transaction(async (client) => {
      const conversation = await this.requireConversationAccess(
        client,
        userId,
        conversationId,
      );
      const participantIds = await this.getConversationParticipantIds(
        client,
        conversation.id,
      );

      const insertResult = await client.query<InsertedMessageRow>(
        `
          INSERT INTO messages (conversation_id, sender_id, content)
          VALUES ($1::uuid, $2::uuid, $3)
          RETURNING
            id,
            conversation_id,
            sender_id,
            content,
            created_at,
            edited_at
        `,
        [conversation.id, userId, payload.content],
      );

      const message = insertResult.rows[0];

      await this.appendOutboxEvent(client, {
        aggregateType: 'message',
        aggregateId: message.id,
        eventType: 'message.created',
        payload: {
          messageId: message.id,
          conversationId: conversation.id,
          connectionId: conversation.connection_id,
          senderId: userId,
        },
      });

      const response = {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        content: message.content,
        createdAt: this.toIsoTimestamp(message.created_at),
        editedAt: message.edited_at ? this.toIsoTimestamp(message.edited_at) : null,
        isReadByViewer: true,
        isReadByOtherParticipant: false,
      };

      return {
        response,
        realtimePayload: {
          messageId: message.id,
          conversationId: conversation.id,
          connectionId: conversation.connection_id,
          senderId: userId,
          participantIds,
          message: {
            id: response.id,
            conversationId: response.conversationId,
            senderId: response.senderId,
            content: response.content,
            createdAt: response.createdAt,
            editedAt: response.editedAt,
          },
        } satisfies RealtimeMessageCreatedPayload,
      };
    });

    await this.realtimeService.publishMessageCreated(created.realtimePayload);
    return created.response;
  }

  async markConversationRead(
    userId: string,
    conversationId: string,
  ): Promise<MarkConversationReadResult> {
    const result = await this.databaseService.transaction(async (client) => {
      const conversation = await this.requireConversationAccess(
        client,
        userId,
        conversationId,
      );

      const inserted = await client.query<{ message_id: string }>(
        `
          WITH unread_messages AS (
            SELECT m.id
            FROM messages m
            WHERE m.conversation_id = $1::uuid
              AND m.sender_id <> $2::uuid
              AND m.deleted_at IS NULL
              AND NOT EXISTS (
                SELECT 1
                FROM message_reads mr
                WHERE mr.message_id = m.id
                  AND mr.user_id = $2::uuid
              )
          )
          INSERT INTO message_reads (message_id, user_id)
          SELECT id, $2::uuid
          FROM unread_messages
          ON CONFLICT (message_id, user_id) DO NOTHING
          RETURNING message_id
        `,
        [conversation.id, userId],
      );

      const participantIds = inserted.rows.length
        ? await this.getConversationParticipantIds(client, conversation.id)
        : [];

      if (inserted.rows.length > 0) {
        await this.appendOutboxEvent(client, {
          aggregateType: 'conversation',
          aggregateId: conversation.id,
          eventType: 'message.read',
          payload: {
            conversationId: conversation.id,
            connectionId: conversation.connection_id,
            userId,
            messageIds: inserted.rows.map((row) => row.message_id),
          },
        });
      }

      return {
        response: {
          conversationId: conversation.id,
          readCount: inserted.rows.length,
        },
        realtimePayload:
          inserted.rows.length > 0
            ? ({
                conversationId: conversation.id,
                connectionId: conversation.connection_id,
                readByUserId: userId,
                messageIds: inserted.rows.map((row) => row.message_id),
                participantIds,
              } satisfies RealtimeMessageReadPayload)
            : null,
      };
    });

    if (result.realtimePayload) {
      await this.realtimeService.publishMessageRead(result.realtimePayload);
    }

    return result.response;
  }

  private async requireConversationAccess(
    client: PoolClient,
    userId: string,
    conversationId: string,
  ): Promise<ConversationAccessRow> {
    const result = await client.query<ConversationAccessRow>(
      `
        SELECT
          c.id,
          c.connection_id
        FROM conversations c
        JOIN conversation_participants cp
          ON cp.conversation_id = c.id
        WHERE c.id = $1::uuid
          AND cp.user_id = $2::uuid
        LIMIT 1
      `,
      [conversationId, userId],
    );

    const conversation = result.rows[0];
    if (!conversation) {
      throw new NotFoundException({
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found.',
        },
      });
    }

    return conversation;
  }

  private async getConversationParticipantIds(
    client: PoolClient,
    conversationId: string,
  ): Promise<string[]> {
    const result = await client.query<{ user_id: string }>(
      `
        SELECT user_id
        FROM conversation_participants
        WHERE conversation_id = $1::uuid
      `,
      [conversationId],
    );

    return result.rows.map((row) => row.user_id);
  }

  private mapConversationRow(row: ConversationRow): ConversationListResponse['items'][number] {
    return {
      id: row.id,
      connectionId: row.connection_id,
      createdAt: this.toIsoTimestamp(row.created_at),
      lastMessageAt: row.last_message_created_at
        ? this.toIsoTimestamp(row.last_message_created_at)
        : null,
      unreadCount: this.toCount(row.unread_count),
      otherUser: {
        id: row.other_user_id,
        name: `${row.other_first_name} ${row.other_last_name}`.trim(),
        company: row.other_company_name ?? 'Independent',
        avatar: row.other_avatar_url,
        userType: row.other_user_type,
      },
      lastMessage: row.last_message_id
        ? {
            id: row.last_message_id,
            senderId: row.last_message_sender_id ?? row.other_user_id,
            content: row.last_message_content ?? '',
            createdAt: this.toIsoTimestamp(
              row.last_message_created_at ?? row.created_at,
            ),
          }
        : null,
    };
  }

  private mapMessageRow(row: ConversationMessageRow): ConversationMessageItem {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      content: row.content,
      createdAt: this.toIsoTimestamp(row.created_at),
      editedAt: row.edited_at ? this.toIsoTimestamp(row.edited_at) : null,
      isReadByViewer: row.is_read_by_viewer,
      isReadByOtherParticipant: row.is_read_by_other_participant,
    };
  }

  private toCount(value: string | number): number {
    return typeof value === 'number' ? value : Number(value);
  }

  private toIsoTimestamp(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  private encodeCursor(cursor: MessageCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeCursor(value: string): MessageCursor {
    try {
      const decoded = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as MessageCursor;

      if (!decoded?.createdAt || !decoded?.id) {
        throw new Error('Missing cursor fields.');
      }

      return decoded;
    } catch {
      throw new BadRequestException({
        error: {
          code: 'INVALID_CURSOR',
          message: 'Cursor is invalid.',
        },
      });
    }
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
