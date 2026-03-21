import { z } from 'zod';
import {
  ConversationListSchema,
  ConversationMessageListSchema,
  ConversationMessageSchema,
  CreateConversationMessageRequestSchema,
  MarkConversationReadResponseSchema,
  type ConversationList,
  type ConversationMessage,
  type ConversationMessageList,
  type MarkConversationReadResponse,
} from '../contracts/messages';

export const ConversationListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const MessageListQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const CreateMessageBodySchema = CreateConversationMessageRequestSchema;

export type ConversationListQuery = z.infer<typeof ConversationListQuerySchema>;
export type MessageListQuery = z.infer<typeof MessageListQuerySchema>;
export type CreateMessageBody = z.infer<typeof CreateMessageBodySchema>;
export type ConversationListResponse = ConversationList;
export type ConversationMessageItem = ConversationMessage;
export type ConversationMessagePage = ConversationMessageList;
export type MarkConversationReadResult = MarkConversationReadResponse;

export {
  ConversationListSchema,
  ConversationMessageListSchema,
  ConversationMessageSchema,
  MarkConversationReadResponseSchema,
};
