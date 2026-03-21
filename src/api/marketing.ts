import { z } from 'zod';
import { apiClient } from './http';

const targetAudienceSchema = z.object({
  industries: z.array(z.string()),
  locations: z.array(z.string()),
  userTypes: z.array(z.enum(['sme', 'entrepreneur', 'investor', 'mentor', 'admin'])),
});

const marketingCampaignSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  campaignType: z.enum(['banner', 'featured', 'newsletter', 'sponsored']),
  budget: z.number().nonnegative(),
  spentAmount: z.number().nonnegative(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']),
  startAt: z.string(),
  endAt: z.string(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  targetAudience: targetAudienceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const marketingCampaignListSchema = z.object({
  items: z.array(marketingCampaignSchema),
});

const marketingMetricsSchema = z.object({
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  spentAmount: z.number().nonnegative(),
});

export type MarketingCampaignDto = z.infer<typeof marketingCampaignSchema>;

export const marketingApi = {
  async getCampaigns(params?: {
    status?: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
    limit?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.status) {
      search.set('status', params.status);
    }
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    const query = search.size > 0 ? `?${search.toString()}` : '';

    return apiClient.request<z.infer<typeof marketingCampaignListSchema>>(
      `/marketing/campaigns${query}`,
      {
        method: 'GET',
        schema: marketingCampaignListSchema,
      },
    );
  },

  async createCampaign(payload: {
    name: string;
    campaignType: z.infer<typeof marketingCampaignSchema.shape.campaignType>;
    budget: number;
    startAt: string;
    endAt: string;
    targetIndustries: string[];
    targetLocations: string[];
    targetUserTypes: z.infer<typeof targetAudienceSchema.shape.userTypes>[number][];
  }) {
    return apiClient.request<MarketingCampaignDto>('/marketing/campaigns', {
      method: 'POST',
      body: payload,
      schema: marketingCampaignSchema,
    });
  },

  async updateStatus(
    campaignId: string,
    status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled',
  ) {
    return apiClient.request<MarketingCampaignDto>(
      `/marketing/campaigns/${campaignId}/status`,
      {
        method: 'POST',
        body: { status },
        schema: marketingCampaignSchema,
      },
    );
  },

  async getCampaignMetrics(campaignId: string) {
    return apiClient.request<z.infer<typeof marketingMetricsSchema>>(
      `/marketing/campaigns/${campaignId}/metrics`,
      {
        method: 'GET',
        schema: marketingMetricsSchema,
      },
    );
  },
};
