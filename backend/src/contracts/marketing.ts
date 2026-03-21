import { z } from 'zod';
import { CampaignStatusSchema, CampaignTypeSchema, UserTypeSchema } from './enums';

export const MarketingTargetAudienceSchema = z.object({
  industries: z.array(z.string()),
  locations: z.array(z.string()),
  userTypes: z.array(UserTypeSchema),
});

export const MarketingCampaignSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  campaignType: CampaignTypeSchema,
  budget: z.number().nonnegative(),
  spentAmount: z.number().nonnegative(),
  status: CampaignStatusSchema,
  startAt: z.string(),
  endAt: z.string(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  targetAudience: MarketingTargetAudienceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const MarketingCampaignListSchema = z.object({
  items: z.array(MarketingCampaignSchema),
});

export const CreateMarketingCampaignRequestSchema = z.object({
  name: z.string().trim().min(1).max(160),
  campaignType: CampaignTypeSchema,
  budget: z.number().nonnegative(),
  startAt: z.string(),
  endAt: z.string(),
  targetIndustries: z.array(z.string().min(1).max(120)).default([]),
  targetLocations: z.array(z.string().min(1).max(120)).default([]),
  targetUserTypes: z.array(UserTypeSchema).default([]),
});

export const UpdateMarketingCampaignStatusRequestSchema = z.object({
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']),
});

export const MarketingCampaignMetricsSchema = z.object({
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  spentAmount: z.number().nonnegative(),
});

export const IngestMarketingCampaignMetricsRequestSchema = z.object({
  impressionsDelta: z.number().int().nonnegative().optional().default(0),
  clicksDelta: z.number().int().nonnegative().optional().default(0),
  conversionsDelta: z.number().int().nonnegative().optional().default(0),
  spentAmountDelta: z.number().nonnegative().optional().default(0),
});

export type MarketingTargetAudience = z.infer<typeof MarketingTargetAudienceSchema>;
export type MarketingCampaign = z.infer<typeof MarketingCampaignSchema>;
export type MarketingCampaignList = z.infer<typeof MarketingCampaignListSchema>;
export type CreateMarketingCampaignRequest = z.infer<
  typeof CreateMarketingCampaignRequestSchema
>;
export type UpdateMarketingCampaignStatusRequest = z.infer<
  typeof UpdateMarketingCampaignStatusRequestSchema
>;
export type MarketingCampaignMetrics = z.infer<typeof MarketingCampaignMetricsSchema>;
export type IngestMarketingCampaignMetricsRequest = z.infer<
  typeof IngestMarketingCampaignMetricsRequestSchema
>;
