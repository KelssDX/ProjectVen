import { z } from 'zod';
import { apiClient } from './http';

const investmentCampaignSchema = z.object({
  campaignId: z.uuid().nullable().optional(),
  postId: z.uuid(),
  ownerUserId: z.uuid(),
  author: z.object({
    id: z.uuid(),
    name: z.string(),
    company: z.string(),
    avatar: z.string().nullable().optional(),
    userType: z.enum(['sme', 'entrepreneur', 'investor', 'mentor', 'admin']),
  }),
  content: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  primaryImageUrl: z.string().nullable().optional(),
  currency: z.string().length(3),
  targetAmount: z.number().nonnegative(),
  raisedAmount: z.number().nonnegative(),
  backersCount: z.number().int().nonnegative(),
  minInvestment: z.number().nonnegative(),
  maxInvestment: z.number().nonnegative().optional(),
  equity: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const investmentCampaignListSchema = z.object({
  items: z.array(investmentCampaignSchema),
});

const investmentCommitmentSchema = z.object({
  id: z.uuid(),
  campaignId: z.uuid(),
  postId: z.uuid(),
  investorId: z.uuid(),
  investorName: z.string(),
  investorAvatar: z.string().nullable().optional(),
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  comment: z.string().nullable().optional(),
  isAnonymous: z.boolean(),
  status: z.enum([
    'initiated',
    'processing',
    'succeeded',
    'failed',
    'cancelled',
    'refunded',
  ]),
  createdAt: z.string(),
});

const investmentCommitmentListSchema = z.object({
  items: z.array(investmentCommitmentSchema),
});

const investmentCommitmentMutationSchema = z.object({
  commitment: investmentCommitmentSchema,
  campaign: investmentCampaignSchema,
});

export type InvestmentCampaignDto = z.infer<typeof investmentCampaignSchema>;
export type InvestmentCommitmentDto = z.infer<typeof investmentCommitmentSchema>;

export const investmentsApi = {
  async getCampaigns(params?: { search?: string; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.search) {
      search.set('search', params.search);
    }
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    const query = search.size > 0 ? `?${search.toString()}` : '';

    return apiClient.request<z.infer<typeof investmentCampaignListSchema>>(
      `/investments/campaigns${query}`,
      {
        method: 'GET',
        schema: investmentCampaignListSchema,
      },
    );
  },

  async getCommitments(postId: string, limit = 20) {
    const search = new URLSearchParams();
    search.set('limit', String(limit));

    return apiClient.request<z.infer<typeof investmentCommitmentListSchema>>(
      `/investments/posts/${postId}/commitments?${search.toString()}`,
      {
        method: 'GET',
        schema: investmentCommitmentListSchema,
      },
    );
  },

  async createCommitment(
    postId: string,
    payload: { amount: number; comment?: string; isAnonymous?: boolean },
  ) {
    return apiClient.request<z.infer<typeof investmentCommitmentMutationSchema>>(
      `/investments/posts/${postId}/commitments`,
      {
        method: 'POST',
        body: payload,
        schema: investmentCommitmentMutationSchema,
      },
    );
  },
};
