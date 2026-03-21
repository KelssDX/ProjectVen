import { z } from 'zod';
import {
  CreateMarketingCampaignRequestSchema,
  IngestMarketingCampaignMetricsRequestSchema,
  UpdateMarketingCampaignStatusRequestSchema,
} from '../contracts/marketing';

export const MarketingCampaignListQuerySchema = z.object({
  status: z
    .enum(['draft', 'active', 'paused', 'completed', 'cancelled'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const CreateMarketingCampaignBodySchema =
  CreateMarketingCampaignRequestSchema;

export const UpdateMarketingCampaignStatusBodySchema =
  UpdateMarketingCampaignStatusRequestSchema;

export const IngestMarketingCampaignMetricsBodySchema =
  IngestMarketingCampaignMetricsRequestSchema;

export type MarketingCampaignListQuery = z.infer<
  typeof MarketingCampaignListQuerySchema
>;
export type CreateMarketingCampaignBody = z.infer<
  typeof CreateMarketingCampaignBodySchema
>;
export type UpdateMarketingCampaignStatusBody = z.infer<
  typeof UpdateMarketingCampaignStatusBodySchema
>;
export type IngestMarketingCampaignMetricsBody = z.infer<
  typeof IngestMarketingCampaignMetricsBodySchema
>;
