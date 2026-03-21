import { z } from 'zod';
import { ConnectionUserSummarySchema } from './connections';

export const ConversationLastMessageSchema = z.object({
  id: z.uuid(),
  senderId: z.uuid(),
  content: z.string(),
  createdAt: z.string(),
});

export const ConversationSummarySchema = z.object({
  id: z.uuid(),
  connectionId: z.uuid().nullable(),
  createdAt: z.string(),
  lastMessageAt: z.string().nullable(),
  unreadCount: z.number().int().nonnegative(),
  otherUser: ConnectionUserSummarySchema,
  lastMessage: ConversationLastMessageSchema.nullable(),
});

export const ConversationListSchema = z.object({
  items: z.array(ConversationSummarySchema),
});

export const ConversationMessageSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  senderId: z.uuid(),
  content: z.string(),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
  isReadByViewer: z.boolean(),
  isReadByOtherParticipant: z.boolean(),
});

export const ConversationMessageListSchema = z.object({
  items: z.array(ConversationMessageSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const CreateConversationMessageRequestSchema = z.object({
  content: z.string().trim().min(1).max(4_000),
});

export const MarkConversationReadResponseSchema = z.object({
  conversationId: z.uuid(),
  readCount: z.number().int().nonnegative(),
});

export type ConversationLastMessage = z.infer<typeof ConversationLastMessageSchema>;
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;
export type ConversationList = z.infer<typeof ConversationListSchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type ConversationMessageList = z.infer<typeof ConversationMessageListSchema>;
export type CreateConversationMessageRequest = z.infer<
  typeof CreateConversationMessageRequestSchema
>;
export type MarkConversationReadResponse = z.infer<
  typeof MarkConversationReadResponseSchema
>;
