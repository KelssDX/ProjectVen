import { z } from 'zod';
import { apiClient } from './http';

const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.string().or(z.date()),
});

const conversationSchema = z.object({
  id: z.string(),
  participants: z.array(z.string()),
  lastMessageAt: z.string().or(z.date()).optional(),
});

export type MessageDto = z.infer<typeof messageSchema>;

export const messagesApi = {
  async getConversations() {
    return apiClient.request<{ items: z.infer<typeof conversationSchema>[] }>(
      '/conversations',
      {
        method: 'GET',
        schema: z.object({ items: z.array(conversationSchema) }),
      },
    );
  },

  async getMessages(conversationId: string, cursor?: string) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiClient.request<{ items: MessageDto[]; nextCursor?: string | null }>(
      `/conversations/${conversationId}/messages${query}`,
      {
        method: 'GET',
        schema: z.object({
          items: z.array(messageSchema),
          nextCursor: z.string().nullable().optional(),
        }),
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
};
