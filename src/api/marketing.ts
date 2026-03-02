import { z } from 'zod';
import { apiClient } from './http';

const marketingCampaignSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  campaignType: z.enum(['banner', 'featured', 'newsletter', 'sponsored']),
  budget: z.number(),
  spentAmount: z.number(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']),
});

export type MarketingCampaignDto = z.infer<typeof marketingCampaignSchema>;

export const marketingApi = {
  async createCampaign(payload: {
    name: string;
    campaignType: z.infer<typeof marketingCampaignSchema.shape.campaignType>;
    budget: number;
    startAt: string;
    endAt: string;
  }) {
    return apiClient.request<MarketingCampaignDto>('/marketing/campaigns', {
      method: 'POST',
      body: payload,
      schema: marketingCampaignSchema,
    });
  },

  async getCampaignMetrics(campaignId: string) {
    return apiClient.request<{
      impressions: number;
      clicks: number;
      conversions: number;
    }>(`/marketing/campaigns/${campaignId}/metrics`, {
      method: 'GET',
      schema: z.object({
        impressions: z.number(),
        clicks: z.number(),
        conversions: z.number(),
      }),
    });
  },
};
