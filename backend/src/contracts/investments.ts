import { z } from 'zod';
import { CampaignStatusSchema, PaymentStatusSchema } from './enums';
import { FeedAuthorSchema } from './posts';

export const InvestmentCampaignSchema = z.object({
  campaignId: z.uuid().nullable().optional(),
  postId: z.uuid(),
  ownerUserId: z.uuid(),
  author: FeedAuthorSchema,
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
  status: CampaignStatusSchema,
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const InvestmentCampaignListSchema = z.object({
  items: z.array(InvestmentCampaignSchema),
});

export const InvestmentCommitmentSchema = z.object({
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
  status: PaymentStatusSchema,
  createdAt: z.string(),
});

export const InvestmentCommitmentListSchema = z.object({
  items: z.array(InvestmentCommitmentSchema),
});

export const CreateInvestmentCommitmentRequestSchema = z.object({
  amount: z.number().positive(),
  comment: z.string().trim().max(1000).optional(),
  isAnonymous: z.boolean().optional().default(false),
});

export const InvestmentCommitmentMutationResultSchema = z.object({
  commitment: InvestmentCommitmentSchema,
  campaign: InvestmentCampaignSchema,
});

export type InvestmentCampaign = z.infer<typeof InvestmentCampaignSchema>;
export type InvestmentCampaignList = z.infer<typeof InvestmentCampaignListSchema>;
export type InvestmentCommitment = z.infer<typeof InvestmentCommitmentSchema>;
export type InvestmentCommitmentList = z.infer<typeof InvestmentCommitmentListSchema>;
export type CreateInvestmentCommitmentRequest = z.infer<
  typeof CreateInvestmentCommitmentRequestSchema
>;
export type InvestmentCommitmentMutationResult = z.infer<
  typeof InvestmentCommitmentMutationResultSchema
>;
