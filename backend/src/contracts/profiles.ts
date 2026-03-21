import { z } from 'zod';
import { UserTypeSchema, VerificationLevelSchema } from './enums';

export const BusinessStageSchema = z.enum([
  'idea',
  'seed',
  'early',
  'growth',
  'established',
]);

export const BusinessProfileLocationSchema = z.object({
  city: z.string().min(1).max(120),
  country: z.string().min(1).max(120),
});

export const BusinessProfileSocialLinksSchema = z.object({
  linkedin: z.string().url().optional(),
  twitter: z.string().max(120).optional(),
  facebook: z.string().url().optional(),
});

export const BusinessProfileSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  companyName: z.string().min(1).max(160),
  tagline: z.string().max(200).nullable().optional(),
  description: z.string().min(1).max(10_000),
  industry: z.string().min(1).max(120),
  subIndustry: z.string().max(120).nullable().optional(),
  location: BusinessProfileLocationSchema,
  website: z.string().url().nullable().optional(),
  foundedYear: z.number().int().min(1800).max(3000).nullable().optional(),
  teamSize: z.string().max(80).nullable().optional(),
  stage: BusinessStageSchema,
  fundingNeeded: z.boolean(),
  fundingAmount: z.number().nonnegative().nullable().optional(),
  skills: z.array(z.string()),
  lookingFor: z.array(z.string()),
  achievements: z.array(z.string()),
  socialLinks: BusinessProfileSocialLinksSchema,
  coverImage: z.string().url().nullable().optional(),
  logo: z.string().url().nullable().optional(),
  isPublic: z.boolean(),
  views: z.number().int().nonnegative(),
  connections: z.number().int().nonnegative(),
  owner: z.object({
    firstName: z.string(),
    lastName: z.string(),
    avatar: z.string().nullable().optional(),
    userType: UserTypeSchema,
    isVerified: z.boolean(),
    verificationLevel: VerificationLevelSchema,
  }),
});

export const BusinessProfilePageSchema = z.object({
  items: z.array(BusinessProfileSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
});

export const BusinessProfileCollectionSchema = z.object({
  items: z.array(BusinessProfileSchema),
});

export const BusinessProfileSuggestionListSchema = z.object({
  items: z.array(z.string()),
});

export const TrendingBusinessSchema = z.object({
  profileId: z.uuid(),
  profile: BusinessProfileSchema,
  score: z.number().int().nonnegative(),
  viewsLastWeek: z.number().int().nonnegative(),
  connectionsLastWeek: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
  category: z.string(),
});

export const TrendingBusinessListSchema = z.object({
  items: z.array(TrendingBusinessSchema),
});

export const UpsertMyBusinessProfileRequestSchema = z.object({
  companyName: z.string().min(1).max(160),
  tagline: z.string().max(200).optional().nullable(),
  description: z.string().min(1).max(10_000),
  industry: z.string().min(1).max(120),
  subIndustry: z.string().max(120).optional().nullable(),
  location: BusinessProfileLocationSchema,
  website: z.string().url().optional().nullable(),
  foundedYear: z.number().int().min(1800).max(3000).optional().nullable(),
  teamSize: z.string().max(80).optional().nullable(),
  stage: BusinessStageSchema,
  fundingNeeded: z.boolean().default(false),
  fundingAmount: z.number().nonnegative().optional().nullable(),
  skills: z.array(z.string().min(1).max(120)).default([]),
  lookingFor: z.array(z.string().min(1).max(160)).default([]),
  achievements: z.array(z.string().min(1).max(240)).default([]),
  socialLinks: BusinessProfileSocialLinksSchema.default({}),
  coverImage: z.string().url().optional().nullable(),
  logo: z.string().url().optional().nullable(),
  isPublic: z.boolean().default(true),
});

export const IncrementProfileViewResponseSchema = z.object({
  id: z.uuid(),
  views: z.number().int().nonnegative(),
});

export type BusinessStage = z.infer<typeof BusinessStageSchema>;
export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;
export type BusinessProfilePage = z.infer<typeof BusinessProfilePageSchema>;
export type BusinessProfileCollection = z.infer<
  typeof BusinessProfileCollectionSchema
>;
export type BusinessProfileSuggestionList = z.infer<
  typeof BusinessProfileSuggestionListSchema
>;
export type TrendingBusiness = z.infer<typeof TrendingBusinessSchema>;
export type TrendingBusinessList = z.infer<typeof TrendingBusinessListSchema>;
export type UpsertMyBusinessProfileRequest = z.infer<
  typeof UpsertMyBusinessProfileRequestSchema
>;
export type IncrementProfileViewResponse = z.infer<
  typeof IncrementProfileViewResponseSchema
>;
