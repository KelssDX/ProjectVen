import { z } from 'zod';
import {
  BookmarkCategorySchema,
  BookmarkTypeSchema,
  MediaTypeSchema,
  PostTypeSchema,
  PostVisibilitySchema,
  UserTypeSchema,
} from '../contracts/enums';

export const FeedQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: PostTypeSchema.optional(),
});

export const CreatePostBodySchema = z.object({
  type: PostTypeSchema,
  content: z.string().trim().min(1).max(10_000),
  visibility: PostVisibilitySchema.default('public'),
});

export const ToggleReactionBodySchema = z.object({
  reaction: z.enum(['like', 'love', 'interest']),
});

export const CreateCommentBodySchema = z.object({
  content: z.string().trim().min(1).max(2_000),
  parentCommentId: z.uuid().optional(),
});

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

export const ReactionToggleResponseSchema = z.object({
  reaction: ToggleReactionBodySchema.shape.reaction,
  isActive: z.boolean(),
  counts: z.object({
    likes: z.number().int().nonnegative(),
    loves: z.number().int().nonnegative(),
    interests: z.number().int().nonnegative(),
  }),
});

export const BookmarkToggleResponseSchema = z.object({
  isBookmarked: z.boolean(),
  bookmarks: z.number().int().nonnegative(),
});

export const ShareToggleResponseSchema = z.object({
  isShared: z.boolean(),
  shares: z.number().int().nonnegative(),
});

export const RepostToggleResponseSchema = z.object({
  isReposted: z.boolean(),
  reposts: z.number().int().nonnegative(),
});

export const BookmarkListQuerySchema = z.object({
  category: BookmarkCategorySchema.optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
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

export const BookmarkListResponseSchema = z.object({
  items: z.array(BookmarkItemSchema),
});

export const BookmarkDeleteResponseSchema = z.object({
  id: z.uuid(),
  removed: z.boolean(),
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
