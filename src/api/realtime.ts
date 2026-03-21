import { io, type Socket } from 'socket.io-client';

export interface RealtimeMessageBody {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
}

export interface RealtimeMessageCreatedEvent {
  messageId: string;
  conversationId: string;
  connectionId: string | null;
  senderId: string;
  participantIds: string[];
  message: RealtimeMessageBody;
}

export interface RealtimeMessageDeliveredEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  deliveredByUserId: string;
}

export interface RealtimeMessageReadEvent {
  conversationId: string;
  connectionId: string | null;
  readByUserId: string;
  messageIds: string[];
  participantIds: string[];
}

export interface RealtimeTypingEvent {
  conversationId: string;
  userId: string;
}

export interface RealtimePresenceEvent {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string;
}

export interface RealtimeServerToClientEvents {
  'message.created': (payload: RealtimeMessageCreatedEvent) => void;
  'message.delivered': (payload: RealtimeMessageDeliveredEvent) => void;
  'message.read': (payload: RealtimeMessageReadEvent) => void;
  'typing.started': (payload: RealtimeTypingEvent) => void;
  'typing.stopped': (payload: RealtimeTypingEvent) => void;
  'presence.updated': (payload: RealtimePresenceEvent) => void;
}

export interface RealtimeClientToServerEvents {
  'conversation.join': (payload: { conversationId: string }) => void;
  'conversation.leave': (payload: { conversationId: string }) => void;
  'presence.heartbeat': () => void;
  'typing.start': (payload: { conversationId: string }) => void;
  'typing.stop': (payload: { conversationId: string }) => void;
  'message.delivered': (payload: { conversationId: string; messageId: string }) => void;
}

export type RealtimeSocket = Socket<
  RealtimeServerToClientEvents,
  RealtimeClientToServerEvents
>;

function getRealtimeBaseUrl(): string {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return 'http://localhost:4000';
  }
}

export function createRealtimeSocket(token: string): RealtimeSocket {
  return io(`${getRealtimeBaseUrl()}/realtime`, {
    transports: ['websocket'],
    withCredentials: true,
    auth: {
      token,
    },
  });
}
