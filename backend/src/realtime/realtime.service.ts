import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  type NatsConnection,
  type Subscription,
  StringCodec,
} from 'nats';
import {
  createClient,
  type RedisClientType,
} from 'redis';
import {
  type RealtimeEventEnvelope,
  type RealtimeMessageCreatedPayload,
  type RealtimeMessageDeliveredPayload,
  type RealtimeMessageReadPayload,
  type RealtimePresencePayload,
  type RealtimeTypingPayload,
} from './realtime.types';

type RealtimeEventListener = (
  event: RealtimeEventEnvelope<object>,
) => void;

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly codec = StringCodec();
  private readonly subject = 'vendrome.realtime';
  private readonly instanceId = `${process.pid}-${Date.now()}`;
  private readonly listeners = new Set<RealtimeEventListener>();
  private readonly localPresenceSockets = new Map<string, Set<string>>();
  private natsConnection: NatsConnection | null = null;
  private natsSubscription: Subscription | null = null;
  private redisClient: RedisClientType | null = null;
  private readonly presenceTtlSeconds = 90;
  private readonly typingTtlSeconds = 10;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await Promise.all([this.connectRedis(), this.connectNats()]);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.natsSubscription) {
      this.natsSubscription.unsubscribe();
      this.natsSubscription = null;
    }

    if (this.natsConnection) {
      await this.natsConnection.drain().catch(() => undefined);
      this.natsConnection = null;
    }

    if (this.redisClient?.isOpen) {
      await this.redisClient.quit().catch(() => undefined);
    }

    this.redisClient = null;
  }

  subscribe(listener: RealtimeEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async registerSocket(userId: string, socketId: string): Promise<void> {
    const sockets = this.localPresenceSockets.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    this.localPresenceSockets.set(userId, sockets);
    await this.persistPresenceState(userId);
    await this.publishPresenceUpdated(userId);
  }

  async refreshSocketPresence(userId: string): Promise<void> {
    if (!this.localPresenceSockets.has(userId)) {
      return;
    }

    await this.persistPresenceState(userId);
  }

  async unregisterSocket(userId: string, socketId: string): Promise<void> {
    const sockets = this.localPresenceSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.localPresenceSockets.delete(userId);
      }
    }

    await this.persistPresenceState(userId);
    await this.deleteMatchingKeys(this.getTypingPattern(userId));
    await this.publishPresenceUpdated(userId);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.redisClient?.isOpen) {
      return (this.localPresenceSockets.get(userId)?.size ?? 0) > 0;
    }

    for await (const _key of this.redisClient.scanIterator({
      MATCH: this.getPresencePattern(userId),
      COUNT: 50,
    })) {
      return true;
    }

    return false;
  }

  async startTyping(userId: string, conversationId: string): Promise<void> {
    await this.redisClient?.set(
      this.getTypingKey(conversationId, userId),
      this.instanceId,
      {
        EX: this.typingTtlSeconds,
      },
    );

    await this.publish({
      type: 'typing.started',
      payload: {
        conversationId,
        userId,
      } satisfies RealtimeTypingPayload,
      targets: {
        conversationIds: [conversationId],
      },
    });
  }

  async stopTyping(userId: string, conversationId: string): Promise<void> {
    await this.redisClient?.del(this.getTypingKey(conversationId, userId));

    await this.publish({
      type: 'typing.stopped',
      payload: {
        conversationId,
        userId,
      } satisfies RealtimeTypingPayload,
      targets: {
        conversationIds: [conversationId],
      },
    });
  }

  async publishMessageCreated(payload: RealtimeMessageCreatedPayload): Promise<void> {
    await this.publish({
      type: 'message.created',
      payload,
      targets: {
        userIds: payload.participantIds,
      },
    });
  }

  async publishMessageDelivered(payload: RealtimeMessageDeliveredPayload): Promise<void> {
    await this.publish({
      type: 'message.delivered',
      payload,
      targets: {
        userIds: [payload.senderId],
      },
    });
  }

  async publishMessageRead(payload: RealtimeMessageReadPayload): Promise<void> {
    await this.publish({
      type: 'message.read',
      payload,
      targets: {
        userIds: payload.participantIds,
      },
    });
  }

  private async connectRedis(): Promise<void> {
    const url = this.configService.get<string>('VALKEY_URL');
    if (!url) {
      return;
    }

    try {
      this.redisClient = createClient({ url });
      this.redisClient.on('error', (error) => {
        this.logger.warn(`Valkey client error: ${String(error)}`);
      });
      await this.redisClient.connect();
    } catch (error) {
      this.logger.warn(
        `Realtime Valkey connection unavailable, using local-only mode: ${String(error)}`,
      );
      this.redisClient = null;
    }
  }

  private async connectNats(): Promise<void> {
    const servers = this.configService.get<string>('NATS_URL');
    if (!servers) {
      return;
    }

    try {
      this.natsConnection = await connect({ servers });
      this.natsSubscription = this.natsConnection.subscribe(this.subject);
      void this.consumeNats(this.natsSubscription);
    } catch (error) {
      this.logger.warn(
        `Realtime NATS connection unavailable, using local-only mode: ${String(error)}`,
      );
      this.natsConnection = null;
      this.natsSubscription = null;
    }
  }

  private async consumeNats(subscription: Subscription): Promise<void> {
    for await (const message of subscription) {
      try {
        const parsed = JSON.parse(
          this.codec.decode(message.data),
        ) as RealtimeEventEnvelope<object>;
        this.dispatch(parsed);
      } catch (error) {
        this.logger.warn(`Failed to decode realtime event: ${String(error)}`);
      }
    }
  }

  private async publish(
    event: RealtimeEventEnvelope<object>,
  ): Promise<void> {
    if (!this.natsConnection) {
      this.dispatch(event);
      return;
    }

    try {
      this.natsConnection.publish(
        this.subject,
        this.codec.encode(JSON.stringify(event)),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to publish realtime event to NATS, dispatching locally: ${String(error)}`,
      );
      this.dispatch(event);
    }
  }

  private dispatch(event: RealtimeEventEnvelope<object>): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private async persistPresenceState(userId: string): Promise<void> {
    if (!this.redisClient?.isOpen) {
      return;
    }

    const key = this.getPresenceKey(userId);
    const count = this.localPresenceSockets.get(userId)?.size ?? 0;

    if (count > 0) {
      await this.redisClient.set(key, String(count), {
        EX: this.presenceTtlSeconds,
      });
      return;
    }

    await this.redisClient.del(key);
  }

  private async publishPresenceUpdated(userId: string): Promise<void> {
    const isOnline = await this.isUserOnline(userId);
    await this.publish({
      type: 'presence.updated',
      payload: {
        userId,
        isOnline,
        lastSeenAt: new Date().toISOString(),
      } satisfies RealtimePresencePayload,
      targets: {
        broadcast: true,
      },
    });
  }

  private getPresenceKey(userId: string): string {
    return `vendrome:presence:${userId}:${this.instanceId}`;
  }

  private getPresencePattern(userId: string): string {
    return `vendrome:presence:${userId}:*`;
  }

  private getTypingKey(conversationId: string, userId: string): string {
    return `vendrome:typing:${conversationId}:${userId}:${this.instanceId}`;
  }

  private getTypingPattern(userId: string): string {
    return `vendrome:typing:*:${userId}:${this.instanceId}`;
  }

  private async deleteMatchingKeys(pattern: string): Promise<void> {
    if (!this.redisClient?.isOpen) {
      return;
    }

    const pendingDelete: string[] = [];

    for await (const key of this.redisClient.scanIterator({
      MATCH: pattern,
      COUNT: 50,
    })) {
      pendingDelete.push(String(key));

      if (pendingDelete.length >= 50) {
        await this.redisClient.del(pendingDelete);
        pendingDelete.length = 0;
      }
    }

    if (pendingDelete.length > 0) {
      await this.redisClient.del(pendingDelete);
    }
  }
}
