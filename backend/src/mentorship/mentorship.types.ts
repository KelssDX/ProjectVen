import { z } from 'zod';
import {
  CreateMentorshipOfferRequestSchema,
  MentorshipAvailabilitySchema,
  UpdateMentorshipStatusRequestSchema,
} from '../contracts/mentorship';

export const MentorshipMentorListQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  expertise: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export const MentorshipRequestListQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  expertise: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export const CreateMentorshipOfferBodySchema =
  CreateMentorshipOfferRequestSchema;

export const UpdateMentorshipStatusBodySchema =
  UpdateMentorshipStatusRequestSchema;

export type MentorshipMentorListQuery = z.infer<
  typeof MentorshipMentorListQuerySchema
>;
export type MentorshipRequestListQuery = z.infer<
  typeof MentorshipRequestListQuerySchema
>;
export type CreateMentorshipOfferBody = z.infer<
  typeof CreateMentorshipOfferBodySchema
>;
export type UpdateMentorshipStatusBody = z.infer<
  typeof UpdateMentorshipStatusBodySchema
>;
export type MentorshipAvailability = z.infer<
  typeof MentorshipAvailabilitySchema
>;
