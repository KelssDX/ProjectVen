import { z } from 'zod';
import { apiClient } from './http';

const investmentCampaignSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  title: z.string(),
  targetAmount: z.number(),
  raisedAmount: z.number(),
  currency: z.string().length(3),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']),
});

export type InvestmentCampaignDto = z.infer<typeof investmentCampaignSchema>;

export const investmentsApi = {
  async getCampaigns() {
    return apiClient.request<{ items: InvestmentCampaignDto[] }>(
      '/investments/campaigns',
      {
        method: 'GET',
        schema: z.object({ items: z.array(investmentCampaignSchema) }),
      },
    );
  },

  async commitToCampaign(campaignId: string, amount: number) {
    return apiClient.request<{ id: string; status: string }>(
      `/investments/campaigns/${campaignId}/commitments`,
      {
        method: 'POST',
        body: { amount },
        schema: z.object({ id: z.string(), status: z.string() }),
      },
    );
  },
};
