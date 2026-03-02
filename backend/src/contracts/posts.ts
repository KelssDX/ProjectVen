import { z } from 'zod';
import {
  BookmarkCategorySchema,
  BookmarkTypeSchema,
  MediaTypeSchema,
  PostTypeSchema,
  PostVisibilitySchema,
  UserTypeSchema,
} from './enums';

export const FeedAuthorSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  company: z.string(),
  avatar: z.string().nullable().optional(),
  userType: UserTypeSchema,
});

export const FeedPostMediaSchema = z.object({
  type: MediaTypeSchema,
  url: z.string(),
});

export const FeedPostSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  author: FeedAuthorSchema,
  type: PostTypeSchema,
  content: z.string(),
  visibility: PostVisibilitySchema,
  media: z.array(FeedPostMediaSchema).default([]),
  likes: z.number().int().nonnegative(),
  loves: z.number().int().nonnegative(),
  interests: z.number().int().nonnegative(),
  bookmarks: z.number().int().nonnegative(),
  reposts: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  isLiked: z.boolean().optional(),
  isLoved: z.boolean().optional(),
  isInterested: z.boolean().optional(),
  isShared: z.boolean().optional(),
  isReposted: z.boolean().optional(),
  isBookmarked: z.boolean().optional(),
  createdAt: z.string(),
});

export const FeedPageSchema = z.object({
  items: z.array(FeedPostSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const CreatePostRequestSchema = z.object({
  type: PostTypeSchema,
  content: z.string().trim().min(1).max(10_000),
  visibility: PostVisibilitySchema.optional(),
});

export const TogglePostReactionRequestSchema = z.object({
  reaction: z.enum(['like', 'love', 'interest']),
});

export const TogglePostReactionResponseSchema = z.object({
  reaction: TogglePostReactionRequestSchema.shape.reaction,
  isActive: z.boolean(),
  counts: z.object({
    likes: z.number().int().nonnegative(),
    loves: z.number().int().nonnegative(),
    interests: z.number().int().nonnegative(),
  }),
});

export const TogglePostBookmarkResponseSchema = z.object({
  isBookmarked: z.boolean(),
  bookmarks: z.number().int().nonnegative(),
});

export const TogglePostShareResponseSchema = z.object({
  isShared: z.boolean(),
  shares: z.number().int().nonnegative(),
});

export const TogglePostRepostResponseSchema = z.object({
  isReposted: z.boolean(),
  reposts: z.number().int().nonnegative(),
});

export const CreatePostCommentRequestSchema = z.object({
  content: z.string().trim().min(1).max(2_000),
  parentCommentId: z.uuid().optional(),
});

export const PostCommentSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  userId: z.uuid(),
  content: z.string(),
  likes: z.number().int().nonnegative(),
  createdAt: z.string(),
  author: z.object({
    name: z.string(),
    avatar: z.string().nullable().optional(),
  }),
});

export const PostCommentListSchema = z.object({
  items: z.array(PostCommentSchema),
});

export const BookmarkItemSchema = z.object({
  id: z.uuid(),
  sourceId: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  type: BookmarkTypeSchema,
  category: BookmarkCategorySchema,
  tags: z.array(z.string()),
  imageUrl: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  authorAvatar: z.string().nullable().optional(),
  createdAt: z.string(),
  savedAt: z.string(),
});

export const BookmarkListSchema = z.object({
  items: z.array(BookmarkItemSchema),
});

export const BookmarkDeleteResponseSchema = z.object({
  id: z.uuid(),
  removed: z.boolean(),
});

export type FeedPost = z.infer<typeof FeedPostSchema>;
export type FeedPage = z.infer<typeof FeedPageSchema>;
export type CreatePostRequest = z.infer<typeof CreatePostRequestSchema>;
export type TogglePostReactionRequest = z.infer<typeof TogglePostReactionRequestSchema>;
export type TogglePostReactionResponse = z.infer<typeof TogglePostReactionResponseSchema>;
export type TogglePostBookmarkResponse = z.infer<typeof TogglePostBookmarkResponseSchema>;
export type TogglePostShareResponse = z.infer<typeof TogglePostShareResponseSchema>;
export type TogglePostRepostResponse = z.infer<typeof TogglePostRepostResponseSchema>;
export type CreatePostCommentRequest = z.infer<typeof CreatePostCommentRequestSchema>;
export type PostComment = z.infer<typeof PostCommentSchema>;
export type PostCommentList = z.infer<typeof PostCommentListSchema>;
export type BookmarkItem = z.infer<typeof BookmarkItemSchema>;
export type BookmarkList = z.infer<typeof BookmarkListSchema>;
export type BookmarkDeleteResponse = z.infer<typeof BookmarkDeleteResponseSchema>;
