import { z } from 'zod';
import {
  BookmarkCategorySchema,
  PostTypeSchema,
} from '../contracts/enums';
import {
  BookmarkDeleteResponseSchema,
  BookmarkItemSchema,
  BookmarkListSchema as BookmarkListResponseSchema,
  CreatePostCommentRequestSchema,
  CreatePostRequestSchema,
  FeedPageSchema,
  FeedPostSchema,
  PostCommentListSchema,
  PostCommentSchema,
  TogglePostBookmarkResponseSchema as BookmarkToggleResponseSchema,
  TogglePostReactionRequestSchema,
  TogglePostReactionResponseSchema as ReactionToggleResponseSchema,
  TogglePostRepostResponseSchema as RepostToggleResponseSchema,
  TogglePostShareResponseSchema as ShareToggleResponseSchema,
} from '../contracts/posts';

export const CreatePostBodySchema = CreatePostRequestSchema;
export const ToggleReactionBodySchema = TogglePostReactionRequestSchema;
export const CreateCommentBodySchema = CreatePostCommentRequestSchema;

export const FeedQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: PostTypeSchema.optional(),
});

export const BookmarkListQuerySchema = z.object({
  category: BookmarkCategorySchema.optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type FeedQuery = z.infer<typeof FeedQuerySchema>;
export type CreatePostBody = z.infer<typeof CreatePostBodySchema>;
export type ToggleReactionBody = z.infer<typeof ToggleReactionBodySchema>;
export type CreateCommentBody = z.infer<typeof CreateCommentBodySchema>;
export type FeedPost = z.infer<typeof FeedPostSchema>;
export type FeedPage = z.infer<typeof FeedPageSchema>;
export type PostComment = z.infer<typeof PostCommentSchema>;
export type PostCommentList = z.infer<typeof PostCommentListSchema>;
export type ReactionToggleResponse = z.infer<typeof ReactionToggleResponseSchema>;
export type BookmarkToggleResponse = z.infer<typeof BookmarkToggleResponseSchema>;
export type ShareToggleResponse = z.infer<typeof ShareToggleResponseSchema>;
export type RepostToggleResponse = z.infer<typeof RepostToggleResponseSchema>;
export type BookmarkListQuery = z.infer<typeof BookmarkListQuerySchema>;
export type BookmarkItem = z.infer<typeof BookmarkItemSchema>;
export type BookmarkListResponse = z.infer<typeof BookmarkListResponseSchema>;
export type BookmarkDeleteResponse = z.infer<typeof BookmarkDeleteResponseSchema>;
