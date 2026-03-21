import {
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';
import { RealtimeService } from './realtime.service';
import {
  ConversationRoomBodySchema,
  MessageDeliveredBodySchema,
  type RealtimeEventEnvelope,
  type RealtimeMessageDeliveredPayload,
} from './realtime.types';

interface SocketUser {
  id: string;
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: true,
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidUnknownValues: false,
  }),
)
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private unsubscribeRealtime?: () => void;

  constructor(
    private readonly authService: AuthService,
    private readonly databaseService: DatabaseService,
    private readonly realtimeService: RealtimeService,
  ) {}

  afterInit(): void {
    this.unsubscribeRealtime = this.realtimeService.subscribe((event) => {
      this.emitEvent(event);
    });
  }

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const accessToken = this.getAccessTokenFromSocket(socket);
      if (!accessToken) {
        throw new Error('Missing access token.');
      }

      const user = await this.authService.getCurrentUser(accessToken);
      socket.data.user = { id: user.id } satisfies SocketUser;
      await socket.join(this.getUserRoom(user.id));
      await this.realtimeService.registerSocket(user.id, socket.id);
    } catch (error) {
      this.logger.warn(`Rejected realtime socket: ${String(error)}`);
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const userId = this.getSocketUserId(socket);
    if (!userId) {
      return;
    }

    await this.realtimeService.unregisterSocket(userId, socket.id);
  }

  @SubscribeMessage('conversation.join')
  async joinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<{ ok: true }> {
    const userId = this.requireSocketUserId(socket);
    const parsed = this.parseOrThrow(ConversationRoomBodySchema, body);
    await this.assertConversationAccess(userId, parsed.conversationId);
    await socket.join(this.getConversationRoom(parsed.conversationId));

    const participantIds = await this.getConversationParticipantIds(parsed.conversationId);
    for (const participantId of participantIds) {
      if (participantId === userId) {
        continue;
      }

      socket.emit('presence.updated', {
        userId: participantId,
        isOnline: await this.realtimeService.isUserOnline(participantId),
        lastSeenAt: new Date().toISOString(),
      });
    }

    return { ok: true };
  }

  @SubscribeMessage('conversation.leave')
  async leaveConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<{ ok: true }> {
    const parsed = this.parseOrThrow(ConversationRoomBodySchema, body);
    await socket.leave(this.getConversationRoom(parsed.conversationId));
    return { ok: true };
  }

  @SubscribeMessage('presence.heartbeat')
  async heartbeat(@ConnectedSocket() socket: Socket): Promise<{ ok: true }> {
    const userId = this.requireSocketUserId(socket);
    await this.realtimeService.refreshSocketPresence(userId);
    return { ok: true };
  }

  @SubscribeMessage('typing.start')
  async typingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<{ ok: true }> {
    const userId = this.requireSocketUserId(socket);
    const parsed = this.parseOrThrow(ConversationRoomBodySchema, body);
    await this.assertConversationAccess(userId, parsed.conversationId);
    await socket.join(this.getConversationRoom(parsed.conversationId));
    await this.realtimeService.startTyping(userId, parsed.conversationId);
    return { ok: true };
  }

  @SubscribeMessage('typing.stop')
  async typingStop(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<{ ok: true }> {
    const userId = this.requireSocketUserId(socket);
    const parsed = this.parseOrThrow(ConversationRoomBodySchema, body);
    await this.assertConversationAccess(userId, parsed.conversationId);
    await this.realtimeService.stopTyping(userId, parsed.conversationId);
    return { ok: true };
  }

  @SubscribeMessage('message.delivered')
  async messageDelivered(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<{ ok: true }> {
    const userId = this.requireSocketUserId(socket);
    const parsed = this.parseOrThrow(MessageDeliveredBodySchema, body);
    const delivery = await this.getDeliveryTarget(
      parsed.messageId,
      parsed.conversationId,
      userId,
    );

    if (!delivery || delivery.senderId === userId) {
      return { ok: true };
    }

    await this.realtimeService.publishMessageDelivered({
      conversationId: parsed.conversationId,
      messageId: parsed.messageId,
      senderId: delivery.senderId,
      deliveredByUserId: userId,
    } satisfies RealtimeMessageDeliveredPayload);

    return { ok: true };
  }

  private emitEvent(event: RealtimeEventEnvelope<object>): void {
    if (!this.server) {
      return;
    }

    if (event.targets?.broadcast) {
      this.server.emit(event.type, event.payload);
    }

    for (const userId of event.targets?.userIds ?? []) {
      this.server.to(this.getUserRoom(userId)).emit(event.type, event.payload);
    }

    for (const conversationId of event.targets?.conversationIds ?? []) {
      this.server
        .to(this.getConversationRoom(conversationId))
        .emit(event.type, event.payload);
    }
  }

  private parseOrThrow<T>(schema: z.ZodType<T>, payload: unknown): T {
    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new WsException({
        code: 'VALIDATION_ERROR',
        message: 'Realtime payload validation failed.',
        details: z.treeifyError(result.error),
      });
    }

    return result.data;
  }

  private getAccessTokenFromSocket(socket: Socket): string | null {
    const authToken =
      typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : null;

    if (authToken) {
      return authToken;
    }

    const authorization = socket.handshake.headers.authorization;
    if (typeof authorization !== 'string') {
      return null;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token;
  }

  private getSocketUserId(socket: Socket): string | null {
    return (socket.data.user as SocketUser | undefined)?.id ?? null;
  }

  private requireSocketUserId(socket: Socket): string {
    const userId = this.getSocketUserId(socket);
    if (!userId) {
      throw new WsException({
        code: 'UNAUTHENTICATED',
        message: 'Socket user context is missing.',
      });
    }

    return userId;
  }

  private getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  private getConversationRoom(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  private async assertConversationAccess(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const result = await this.databaseService.query<{ id: string }>(
      `
        SELECT c.id
        FROM conversations c
        JOIN conversation_participants cp
          ON cp.conversation_id = c.id
        WHERE c.id = $1::uuid
          AND cp.user_id = $2::uuid
        LIMIT 1
      `,
      [conversationId, userId],
    );

    if (!result.rows[0]) {
      throw new WsException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found.',
      });
    }
  }

  private async getConversationParticipantIds(
    conversationId: string,
  ): Promise<string[]> {
    const result = await this.databaseService.query<{ user_id: string }>(
      `
        SELECT user_id
        FROM conversation_participants
        WHERE conversation_id = $1::uuid
      `,
      [conversationId],
    );

    return result.rows.map((row) => row.user_id);
  }

  private async getDeliveryTarget(
    messageId: string,
    conversationId: string,
    userId: string,
  ): Promise<{ senderId: string } | null> {
    const result = await this.databaseService.query<{ sender_id: string }>(
      `
        SELECT m.sender_id
        FROM messages m
        JOIN conversation_participants cp
          ON cp.conversation_id = m.conversation_id
        WHERE m.id = $1::uuid
          AND m.conversation_id = $2::uuid
          AND cp.user_id = $3::uuid
          AND m.deleted_at IS NULL
        LIMIT 1
      `,
      [messageId, conversationId, userId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new WsException({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found.',
      });
    }

    return {
      senderId: row.sender_id,
    };
  }
}
