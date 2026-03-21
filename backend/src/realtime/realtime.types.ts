import { z } from 'zod';

export const ConversationRoomBodySchema = z.object({
  conversationId: z.uuid(),
});

export const MessageDeliveredBodySchema = z.object({
  conversationId: z.uuid(),
  messageId: z.uuid(),
});

export type RealtimeEventType =
  | 'message.created'
  | 'message.delivered'
  | 'message.read'
  | 'typing.started'
  | 'typing.stopped'
  | 'presence.updated';

export interface RealtimeEventTargets {
  userIds?: string[];
  conversationIds?: string[];
  broadcast?: boolean;
}

export interface RealtimeMessageBody {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
}

export interface RealtimeMessageCreatedPayload {
  messageId: string;
  conversationId: string;
  connectionId: string | null;
  senderId: string;
  participantIds: string[];
  message: RealtimeMessageBody;
}

export interface RealtimeMessageDeliveredPayload {
  conversationId: string;
  messageId: string;
  senderId: string;
  deliveredByUserId: string;
}

export interface RealtimeMessageReadPayload {
  conversationId: string;
  connectionId: string | null;
  readByUserId: string;
  messageIds: string[];
  participantIds: string[];
}

export interface RealtimeTypingPayload {
  conversationId: string;
  userId: string;
}

export interface RealtimePresencePayload {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string;
}

export interface RealtimeEventEnvelope<TPayload extends object> {
  type: RealtimeEventType;
  payload: TPayload;
  targets?: RealtimeEventTargets;
}
