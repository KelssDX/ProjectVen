import { z } from 'zod';
import { CreateInvestmentCommitmentRequestSchema } from '../contracts/investments';

export const InvestmentCampaignListQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const InvestmentCommitmentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CreateInvestmentCommitmentBodySchema =
  CreateInvestmentCommitmentRequestSchema;

export type InvestmentCampaignListQuery = z.infer<
  typeof InvestmentCampaignListQuerySchema
>;
export type InvestmentCommitmentListQuery = z.infer<
  typeof InvestmentCommitmentListQuerySchema
>;
export type CreateInvestmentCommitmentBody = z.infer<
  typeof CreateInvestmentCommitmentBodySchema
>;
