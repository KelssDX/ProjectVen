import { z } from 'zod';
import { apiClient } from './http';

const sellerSchema = z.object({
  userId: z.uuid(),
  name: z.string(),
  company: z.string(),
  avatar: z.string().nullable().optional(),
  userType: z.enum(['sme', 'entrepreneur', 'investor', 'mentor', 'admin']),
});

const reviewSummarySchema = z.object({
  average: z.number().nonnegative(),
  count: z.number().int().nonnegative(),
  verifiedCount: z.number().int().nonnegative(),
});

const productSchema = z.object({
  name: z.string(),
  price: z.number().nonnegative(),
  currency: z.string().length(3),
  description: z.string(),
  category: z.string(),
  inStock: z.boolean(),
  quantity: z.number().int().nonnegative().optional(),
});

const serviceSchema = z.object({
  name: z.string(),
  price: z.number().nonnegative(),
  currency: z.string().length(3),
  priceType: z.enum(['hourly', 'project', 'monthly']),
  description: z.string(),
  category: z.string(),
  availability: z.enum(['immediate', '1-week', '2-weeks', '1-month']),
});

const productListingSchema = z.object({
  postId: z.uuid(),
  seller: sellerSchema,
  content: z.string(),
  primaryImageUrl: z.string().nullable().optional(),
  bookmarks: z.number().int().nonnegative(),
  createdAt: z.string(),
  product: productSchema,
  reviewSummary: reviewSummarySchema,
});

const serviceListingSchema = z.object({
  postId: z.uuid(),
  seller: sellerSchema,
  content: z.string(),
  primaryImageUrl: z.string().nullable().optional(),
  bookmarks: z.number().int().nonnegative(),
  createdAt: z.string(),
  service: serviceSchema,
  reviewSummary: reviewSummarySchema,
});

const productListingsSchema = z.object({
  items: z.array(productListingSchema),
});

const serviceListingsSchema = z.object({
  items: z.array(serviceListingSchema),
});

const reviewSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  reviewerId: z.uuid(),
  reviewerName: z.string(),
  reviewerAvatar: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  verifiedPurchase: z.boolean(),
  createdAt: z.string(),
});

const reviewListSchema = z.object({
  items: z.array(reviewSchema),
});

const reviewMutationSchema = z.object({
  review: reviewSchema,
  summary: reviewSummarySchema,
});

const orderSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  buyerId: z.uuid(),
  sellerId: z.uuid(),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded']),
  totalAmount: z.number().nonnegative(),
  currency: z.string().length(3),
  quantity: z.number().int().positive(),
  itemName: z.string(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
});

const bookingSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  clientId: z.uuid(),
  providerId: z.uuid(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  price: z.number().nonnegative(),
  currency: z.string().length(3),
  serviceName: z.string(),
  startAt: z.string(),
  endAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type MarketplaceProductListingDto = z.infer<typeof productListingSchema>;
export type MarketplaceServiceListingDto = z.infer<typeof serviceListingSchema>;
export type MarketplaceReviewDto = z.infer<typeof reviewSchema>;
export type MarketplaceReviewSummaryDto = z.infer<typeof reviewSummarySchema>;

export const marketplaceApi = {
  async getProducts(params?: {
    search?: string;
    category?: string;
    limit?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.search) {
      search.set('search', params.search);
    }
    if (params?.category) {
      search.set('category', params.category);
    }
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    const query = search.size > 0 ? `?${search.toString()}` : '';

    return apiClient.request<z.infer<typeof productListingsSchema>>(
      `/marketplace/products${query}`,
      {
        method: 'GET',
        schema: productListingsSchema,
      },
    );
  },

  async getServices(params?: {
    search?: string;
    category?: string;
    limit?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.search) {
      search.set('search', params.search);
    }
    if (params?.category) {
      search.set('category', params.category);
    }
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    const query = search.size > 0 ? `?${search.toString()}` : '';

    return apiClient.request<z.infer<typeof serviceListingsSchema>>(
      `/marketplace/services${query}`,
      {
        method: 'GET',
        schema: serviceListingsSchema,
      },
    );
  },

  async getReviews(postId: string, limit = 20) {
    const search = new URLSearchParams();
    search.set('limit', String(limit));
    return apiClient.request<z.infer<typeof reviewListSchema>>(
      `/marketplace/posts/${postId}/reviews?${search.toString()}`,
      {
        method: 'GET',
        schema: reviewListSchema,
      },
    );
  },

  async createReview(
    postId: string,
    payload: {
      rating: number;
      comment: string;
      verifiedPurchase?: boolean;
    },
  ) {
    return apiClient.request<z.infer<typeof reviewMutationSchema>>(
      `/marketplace/posts/${postId}/reviews`,
      {
        method: 'POST',
        body: payload,
        schema: reviewMutationSchema,
      },
    );
  },

  async createOrder(
    postId: string,
    payload: {
      quantity: number;
      deliveryAddress?: string;
      notes?: string;
    },
  ) {
    return apiClient.request<z.infer<typeof orderSchema>>(
      `/marketplace/products/${postId}/orders`,
      {
        method: 'POST',
        body: payload,
        schema: orderSchema,
      },
    );
  },

  async createBooking(
    postId: string,
    payload: {
      startAt: string;
      endAt?: string;
      notes?: string;
    },
  ) {
    return apiClient.request<z.infer<typeof bookingSchema>>(
      `/marketplace/services/${postId}/bookings`,
      {
        method: 'POST',
        body: payload,
        schema: bookingSchema,
      },
    );
  },
};
