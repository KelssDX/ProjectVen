import { z } from 'zod';
import {
  CreateMarketplaceBookingRequestSchema,
  CreateMarketplaceOrderRequestSchema,
  CreateMarketplaceReviewRequestSchema,
} from '../contracts/marketplace';

export const MarketplaceListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export const MarketplaceReviewListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CreateMarketplaceReviewBodySchema =
  CreateMarketplaceReviewRequestSchema;
export const CreateMarketplaceOrderBodySchema =
  CreateMarketplaceOrderRequestSchema;
export const CreateMarketplaceBookingBodySchema =
  CreateMarketplaceBookingRequestSchema;

export type MarketplaceListQuery = z.infer<typeof MarketplaceListQuerySchema>;
export type MarketplaceReviewListQuery = z.infer<
  typeof MarketplaceReviewListQuerySchema
>;
export type CreateMarketplaceReviewBody = z.infer<
  typeof CreateMarketplaceReviewBodySchema
>;
export type CreateMarketplaceOrderBody = z.infer<
  typeof CreateMarketplaceOrderBodySchema
>;
export type CreateMarketplaceBookingBody = z.infer<
  typeof CreateMarketplaceBookingBodySchema
>;
