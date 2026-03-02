import { z } from 'zod';
import { ConnectionStatusSchema, UserTypeSchema } from './enums';

export const ConnectionUserSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  company: z.string(),
  avatar: z.string().nullable().optional(),
  userType: UserTypeSchema,
});

export const ConnectionItemSchema = z.object({
  id: z.uuid(),
  requesterId: z.uuid(),
  addresseeId: z.uuid(),
  status: ConnectionStatusSchema,
  message: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  otherUser: ConnectionUserSummarySchema,
});

export const ConnectionListResponseSchema = z.object({
  accepted: z.array(ConnectionItemSchema),
  pendingReceived: z.array(ConnectionItemSchema),
  pendingSent: z.array(ConnectionItemSchema),
});

export const CreateConnectionRequestSchema = z.object({
  addresseeId: z.uuid(),
  message: z.string().trim().max(1000).optional(),
});

export const FollowToggleResponseSchema = z.object({
  isFollowing: z.boolean(),
});

export const TopicSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  followersCount: z.number().int().nonnegative(),
  isFollowing: z.boolean(),
});

export const TopicListResponseSchema = z.object({
  items: z.array(TopicSummarySchema),
});

export const TopicFollowToggleResponseSchema = z.object({
  topicId: z.uuid(),
  isFollowing: z.boolean(),
  followersCount: z.number().int().nonnegative(),
});

export type ConnectionUserSummary = z.infer<typeof ConnectionUserSummarySchema>;
export type ConnectionItem = z.infer<typeof ConnectionItemSchema>;
export type ConnectionListResponse = z.infer<typeof ConnectionListResponseSchema>;
export type CreateConnectionRequest = z.infer<typeof CreateConnectionRequestSchema>;
export type FollowToggleResponse = z.infer<typeof FollowToggleResponseSchema>;
export type TopicSummary = z.infer<typeof TopicSummarySchema>;
export type TopicListResponse = z.infer<typeof TopicListResponseSchema>;
export type TopicFollowToggleResponse = z.infer<typeof TopicFollowToggleResponseSchema>;
