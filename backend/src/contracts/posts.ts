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

export const PitchAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
});

export const PitchLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export const PitchInfoSchema = z.object({
  videoUrl: z.string().optional(),
  deckUrl: z.string().optional(),
  attachments: z.array(PitchAttachmentSchema).optional(),
  links: z.array(PitchLinkSchema).optional(),
});

export const ProductDetailsSchema = z.object({
  name: z.string(),
  price: z.number().nonnegative(),
  currency: z.string(),
  description: z.string(),
  category: z.string(),
  inStock: z.boolean(),
  quantity: z.number().int().nonnegative().optional(),
});

export const ServiceDetailsSchema = z.object({
  name: z.string(),
  price: z.number().nonnegative(),
  currency: z.string(),
  priceType: z.enum(['hourly', 'project', 'monthly']),
  description: z.string(),
  category: z.string(),
  availability: z.enum(['immediate', '1-week', '2-weeks', '1-month']),
});

export const CrowdfundingDetailsSchema = z.object({
  target: z.number().nonnegative(),
  raised: z.number().nonnegative(),
  backers: z.number().int().nonnegative(),
  daysLeft: z.number().int().nonnegative(),
  minInvestment: z.number().nonnegative(),
  maxInvestment: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  equity: z.string().optional(),
  pitch: PitchInfoSchema.optional(),
});

export const InvestmentDetailsSchema = z.object({
  amount: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
  }),
  stage: z.array(z.string()),
  industries: z.array(z.string()),
});

export const InvestmentRequestDetailsSchema = z.object({
  amount: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
  }),
  stage: z.array(z.string()),
  industries: z.array(z.string()),
  pitch: PitchInfoSchema.optional(),
  timeline: z.string().optional(),
});

export const MentorshipDetailsSchema = z.object({
  expertise: z.array(z.string()),
  commitment: z.enum(['full-time', 'part-time', 'ad-hoc']),
  duration: z.string(),
});

export const PromoDetailsSchema = z.object({
  discount: z.number().nonnegative(),
  code: z.string(),
  validUntil: z.string(),
});

export const FeedPostSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  author: FeedAuthorSchema,
  type: PostTypeSchema,
  content: z.string(),
  visibility: PostVisibilitySchema,
  media: z.array(FeedPostMediaSchema).default([]),
  pitch: PitchInfoSchema.optional(),
  product: ProductDetailsSchema.optional(),
  service: ServiceDetailsSchema.optional(),
  crowdfunding: CrowdfundingDetailsSchema.optional(),
  investment: InvestmentDetailsSchema.optional(),
  investmentRequest: InvestmentRequestDetailsSchema.optional(),
  mentorship: MentorshipDetailsSchema.optional(),
  promo: PromoDetailsSchema.optional(),
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
export type PitchAttachment = z.infer<typeof PitchAttachmentSchema>;
export type PitchLink = z.infer<typeof PitchLinkSchema>;
export type PitchInfo = z.infer<typeof PitchInfoSchema>;
export type ProductDetails = z.infer<typeof ProductDetailsSchema>;
export type ServiceDetails = z.infer<typeof ServiceDetailsSchema>;
export type CrowdfundingDetails = z.infer<typeof CrowdfundingDetailsSchema>;
export type InvestmentDetails = z.infer<typeof InvestmentDetailsSchema>;
export type InvestmentRequestDetails = z.infer<typeof InvestmentRequestDetailsSchema>;
export type MentorshipDetails = z.infer<typeof MentorshipDetailsSchema>;
export type PromoDetails = z.infer<typeof PromoDetailsSchema>;
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
