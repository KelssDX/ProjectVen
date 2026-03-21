import { z } from 'zod';
import { apiClient } from './http';

const conversationUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  company: z.string(),
  avatar: z.string().nullable().optional(),
  userType: z.enum(['sme', 'entrepreneur', 'investor', 'mentor', 'admin']),
});

const conversationLastMessageSchema = z.object({
  id: z.uuid(),
  senderId: z.uuid(),
  content: z.string(),
  createdAt: z.string(),
});

const conversationSchema = z.object({
  id: z.uuid(),
  connectionId: z.uuid().nullable(),
  createdAt: z.string(),
  lastMessageAt: z.string().nullable(),
  unreadCount: z.number().int().nonnegative(),
  otherUser: conversationUserSchema,
  lastMessage: conversationLastMessageSchema.nullable(),
});

const messageSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  senderId: z.uuid(),
  content: z.string(),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
  isReadByViewer: z.boolean(),
  isReadByOtherParticipant: z.boolean(),
});

const conversationListSchema = z.object({
  items: z.array(conversationSchema),
});

const messagePageSchema = z.object({
  items: z.array(messageSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

const markConversationReadSchema = z.object({
  conversationId: z.uuid(),
  readCount: z.number().int().nonnegative(),
});

export type MessageDto = z.infer<typeof messageSchema>;
export type ConversationDto = z.infer<typeof conversationSchema>;

export const messagesApi = {
  async getConversations(params?: { search?: string; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.search) {
      search.set('search', params.search);
    }
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    const query = search.size > 0 ? `?${search.toString()}` : '';

    return apiClient.request<z.infer<typeof conversationListSchema>>(
      `/conversations${query}`,
      {
        method: 'GET',
        schema: conversationListSchema,
      },
    );
  },

  async getMessages(conversationId: string, params?: { cursor?: string; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.cursor) {
      search.set('cursor', params.cursor);
    }
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    const query = search.size > 0 ? `?${search.toString()}` : '';

    return apiClient.request<z.infer<typeof messagePageSchema>>(
      `/conversations/${conversationId}/messages${query}`,
      {
        method: 'GET',
        schema: messagePageSchema,
      },
    );
  },

  async sendMessage(conversationId: string, content: string) {
    return apiClient.request<MessageDto>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { content },
      schema: messageSchema,
    });
  },

  async markConversationRead(conversationId: string) {
    return apiClient.request<z.infer<typeof markConversationReadSchema>>(
      `/conversations/${conversationId}/read`,
      {
        method: 'POST',
        schema: markConversationReadSchema,
      },
    );
  },
};
