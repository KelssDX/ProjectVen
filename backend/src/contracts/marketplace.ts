import { z } from 'zod';
import { BookingStatusSchema, OrderStatusSchema, UserTypeSchema } from './enums';
import { ProductDetailsSchema, ServiceDetailsSchema } from './posts';

export const MarketplaceSellerSchema = z.object({
  userId: z.uuid(),
  name: z.string(),
  company: z.string(),
  avatar: z.string().nullable().optional(),
  userType: UserTypeSchema,
});

export const MarketplaceReviewSummarySchema = z.object({
  average: z.number().nonnegative(),
  count: z.number().int().nonnegative(),
  verifiedCount: z.number().int().nonnegative(),
});

export const MarketplaceProductListingSchema = z.object({
  postId: z.uuid(),
  seller: MarketplaceSellerSchema,
  content: z.string(),
  primaryImageUrl: z.string().nullable().optional(),
  bookmarks: z.number().int().nonnegative(),
  createdAt: z.string(),
  product: ProductDetailsSchema,
  reviewSummary: MarketplaceReviewSummarySchema,
});

export const MarketplaceServiceListingSchema = z.object({
  postId: z.uuid(),
  seller: MarketplaceSellerSchema,
  content: z.string(),
  primaryImageUrl: z.string().nullable().optional(),
  bookmarks: z.number().int().nonnegative(),
  createdAt: z.string(),
  service: ServiceDetailsSchema,
  reviewSummary: MarketplaceReviewSummarySchema,
});

export const MarketplaceProductListingListSchema = z.object({
  items: z.array(MarketplaceProductListingSchema),
});

export const MarketplaceServiceListingListSchema = z.object({
  items: z.array(MarketplaceServiceListingSchema),
});

export const MarketplaceReviewSchema = z.object({
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

export const MarketplaceReviewListSchema = z.object({
  items: z.array(MarketplaceReviewSchema),
});

export const CreateMarketplaceReviewRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(2_000),
  verifiedPurchase: z.boolean().default(false),
});

export const MarketplaceReviewMutationResultSchema = z.object({
  review: MarketplaceReviewSchema,
  summary: MarketplaceReviewSummarySchema,
});

export const CreateMarketplaceOrderRequestSchema = z.object({
  quantity: z.number().int().min(1).max(1_000).default(1),
  deliveryAddress: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1_000).optional(),
});

export const MarketplaceOrderSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  buyerId: z.uuid(),
  sellerId: z.uuid(),
  status: OrderStatusSchema,
  totalAmount: z.number().nonnegative(),
  currency: z.string().length(3),
  quantity: z.number().int().positive(),
  itemName: z.string(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const CreateMarketplaceBookingRequestSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  notes: z.string().trim().max(1_000).optional(),
});

export const MarketplaceBookingSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  clientId: z.uuid(),
  providerId: z.uuid(),
  status: BookingStatusSchema,
  price: z.number().nonnegative(),
  currency: z.string().length(3),
  serviceName: z.string(),
  startAt: z.string(),
  endAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type MarketplaceSeller = z.infer<typeof MarketplaceSellerSchema>;
export type MarketplaceReviewSummary = z.infer<
  typeof MarketplaceReviewSummarySchema
>;
export type MarketplaceProductListing = z.infer<
  typeof MarketplaceProductListingSchema
>;
export type MarketplaceServiceListing = z.infer<
  typeof MarketplaceServiceListingSchema
>;
export type MarketplaceProductListingList = z.infer<
  typeof MarketplaceProductListingListSchema
>;
export type MarketplaceServiceListingList = z.infer<
  typeof MarketplaceServiceListingListSchema
>;
export type MarketplaceReview = z.infer<typeof MarketplaceReviewSchema>;
export type MarketplaceReviewList = z.infer<typeof MarketplaceReviewListSchema>;
export type CreateMarketplaceReviewRequest = z.infer<
  typeof CreateMarketplaceReviewRequestSchema
>;
export type MarketplaceReviewMutationResult = z.infer<
  typeof MarketplaceReviewMutationResultSchema
>;
export type CreateMarketplaceOrderRequest = z.infer<
  typeof CreateMarketplaceOrderRequestSchema
>;
export type MarketplaceOrder = z.infer<typeof MarketplaceOrderSchema>;
export type CreateMarketplaceBookingRequest = z.infer<
  typeof CreateMarketplaceBookingRequestSchema
>;
export type MarketplaceBooking = z.infer<typeof MarketplaceBookingSchema>;
