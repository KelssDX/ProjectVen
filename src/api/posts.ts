import { z } from 'zod';
import { apiClient } from './http';

const postTypeSchema = z.enum([
  'update',
  'product',
  'service',
  'idea',
  'crowdfunding',
  'investment',
  'mentorship',
  'promo',
]);

const visibilitySchema = z.enum(['public', 'connections', 'private']);

const mediaSchema = z.object({
  type: z.enum(['image', 'video', 'document']),
  url: z.string(),
});

const pitchAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
});

const pitchLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

const pitchSchema = z.object({
  videoUrl: z.string().optional(),
  deckUrl: z.string().optional(),
  attachments: z.array(pitchAttachmentSchema).optional(),
  links: z.array(pitchLinkSchema).optional(),
});

const productSchema = z.object({
  name: z.string(),
  price: z.number().nonnegative(),
  currency: z.string(),
  description: z.string(),
  category: z.string(),
  inStock: z.boolean(),
  quantity: z.number().int().nonnegative().optional(),
});

const serviceSchema = z.object({
  name: z.string(),
  price: z.number().nonnegative(),
  currency: z.string(),
  priceType: z.enum(['hourly', 'project', 'monthly']),
  description: z.string(),
  category: z.string(),
  availability: z.enum(['immediate', '1-week', '2-weeks', '1-month']),
});

const crowdfundingSchema = z.object({
  target: z.number().nonnegative(),
  raised: z.number().nonnegative(),
  backers: z.number().int().nonnegative(),
  daysLeft: z.number().int().nonnegative(),
  minInvestment: z.number().nonnegative(),
  maxInvestment: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  equity: z.string().optional(),
  pitch: pitchSchema.optional(),
});

const investmentSchema = z.object({
  amount: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
  }),
  stage: z.array(z.string()),
  industries: z.array(z.string()),
});

const investmentRequestSchema = z.object({
  amount: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
  }),
  stage: z.array(z.string()),
  industries: z.array(z.string()),
  pitch: pitchSchema.optional(),
  timeline: z.string().optional(),
});

const mentorshipSchema = z.object({
  expertise: z.array(z.string()),
  commitment: z.enum(['full-time', 'part-time', 'ad-hoc']),
  duration: z.string(),
});

const promoSchema = z.object({
  discount: z.number().nonnegative(),
  code: z.string(),
  validUntil: z.string(),
});

const postAuthorSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  company: z.string(),
  avatar: z.string().nullable().optional(),
  userType: z.enum(['sme', 'entrepreneur', 'investor', 'mentor', 'admin']),
});

const postSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  author: postAuthorSchema,
  type: postTypeSchema,
  content: z.string(),
  visibility: visibilitySchema,
  media: z.array(mediaSchema).default([]),
  pitch: pitchSchema.optional(),
  product: productSchema.optional(),
  service: serviceSchema.optional(),
  crowdfunding: crowdfundingSchema.optional(),
  investment: investmentSchema.optional(),
  investmentRequest: investmentRequestSchema.optional(),
  mentorship: mentorshipSchema.optional(),
  promo: promoSchema.optional(),
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

const feedPageSchema = z.object({
  items: z.array(postSchema),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean().optional(),
});

const reactionToggleResponseSchema = z.object({
  reaction: z.enum(['like', 'love', 'interest']),
  isActive: z.boolean(),
  counts: z.object({
    likes: z.number().int().nonnegative(),
    loves: z.number().int().nonnegative(),
    interests: z.number().int().nonnegative(),
  }),
});

const bookmarkToggleResponseSchema = z.object({
  isBookmarked: z.boolean(),
  bookmarks: z.number().int().nonnegative(),
});

const shareToggleResponseSchema = z.object({
  isShared: z.boolean(),
  shares: z.number().int().nonnegative(),
});

const repostToggleResponseSchema = z.object({
  isReposted: z.boolean(),
  reposts: z.number().int().nonnegative(),
});

const commentSchema = z.object({
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

const commentListSchema = z.object({
  items: z.array(commentSchema),
});

const bookmarkTypeSchema = z.enum([
  'post',
  'profile',
  'article',
  'resource',
  'opportunity',
]);

const bookmarkCategorySchema = z.enum([
  'business',
  'networking',
  'investment',
  'mentorship',
  'marketing',
  'news',
  'resources',
  'inspiration',
]);

const bookmarkItemSchema = z.object({
  id: z.uuid(),
  sourceId: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  type: bookmarkTypeSchema,
  category: bookmarkCategorySchema,
  tags: z.array(z.string()),
  imageUrl: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  authorAvatar: z.string().nullable().optional(),
  createdAt: z.string(),
  savedAt: z.string(),
});

const bookmarkListSchema = z.object({
  items: z.array(bookmarkItemSchema),
});

const bookmarkDeleteSchema = z.object({
  id: z.uuid(),
  removed: z.boolean(),
});

export type PostDto = z.infer<typeof postSchema>;
export type PostCommentDto = z.infer<typeof commentSchema>;
export type BookmarkDto = z.infer<typeof bookmarkItemSchema>;

export const postsApi = {
  async getFeed(params?: { cursor?: string; limit?: number; type?: z.infer<typeof postTypeSchema> }) {
    const search = new URLSearchParams();
    if (params?.cursor) {
      search.set('cursor', params.cursor);
    }
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    if (params?.type) {
      search.set('type', params.type);
    }
    const query = search.size > 0 ? `?${search.toString()}` : '';

    return apiClient.request<z.infer<typeof feedPageSchema>>(`/posts${query}`, {
      method: 'GET',
      schema: feedPageSchema,
    });
  },

  async createPost(payload: {
    type: z.infer<typeof postTypeSchema>;
    content: string;
    visibility?: z.infer<typeof visibilitySchema>;
  }) {
    return apiClient.request<PostDto>('/posts', {
      method: 'POST',
      body: payload,
      schema: postSchema,
    });
  },

  async toggleReaction(payload: {
    postId: string;
    reaction: 'like' | 'love' | 'interest';
  }) {
    return apiClient.request<z.infer<typeof reactionToggleResponseSchema>>(
      `/posts/${payload.postId}/reactions`,
      {
        method: 'POST',
        body: {
          reaction: payload.reaction,
        },
        schema: reactionToggleResponseSchema,
      },
    );
  },

  async getComments(postId: string, limit = 50) {
    const search = new URLSearchParams();
    search.set('limit', String(limit));
    return apiClient.request<z.infer<typeof commentListSchema>>(
      `/posts/${postId}/comments?${search.toString()}`,
      {
        method: 'GET',
        schema: commentListSchema,
      },
    );
  },

  async createComment(
    postId: string,
    payload: { content: string; parentCommentId?: string },
  ) {
    return apiClient.request<z.infer<typeof commentSchema>>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: payload,
      schema: commentSchema,
    });
  },

  async toggleBookmark(postId: string) {
    return apiClient.request<z.infer<typeof bookmarkToggleResponseSchema>>(
      `/posts/${postId}/bookmarks`,
      {
        method: 'POST',
        schema: bookmarkToggleResponseSchema,
      },
    );
  },

  async toggleShare(postId: string) {
    return apiClient.request<z.infer<typeof shareToggleResponseSchema>>(
      `/posts/${postId}/shares`,
      {
        method: 'POST',
        schema: shareToggleResponseSchema,
      },
    );
  },

  async toggleRepost(postId: string) {
    return apiClient.request<z.infer<typeof repostToggleResponseSchema>>(
      `/posts/${postId}/reposts`,
      {
        method: 'POST',
        schema: repostToggleResponseSchema,
      },
    );
  },

  async getBookmarks(params?: {
    category?: z.infer<typeof bookmarkCategorySchema>;
    search?: string;
    limit?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.category) {
      search.set('category', params.category);
    }
    if (params?.search) {
      search.set('search', params.search);
    }
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    const query = search.size > 0 ? `?${search.toString()}` : '';

    return apiClient.request<z.infer<typeof bookmarkListSchema>>(`/posts/bookmarks${query}`, {
      method: 'GET',
      schema: bookmarkListSchema,
    });
  },

  async deleteBookmark(bookmarkId: string) {
    return apiClient.request<z.infer<typeof bookmarkDeleteSchema>>(
      `/posts/bookmarks/${bookmarkId}`,
      {
        method: 'DELETE',
        schema: bookmarkDeleteSchema,
      },
    );
  },
};
