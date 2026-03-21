import { z } from 'zod';
import {
  BusinessProfileCollectionSchema,
  BusinessProfilePageSchema,
  BusinessProfileSchema,
  BusinessProfileSuggestionListSchema,
  BusinessStageSchema,
  IncrementProfileViewResponseSchema,
  TrendingBusinessListSchema,
  UpsertMyBusinessProfileRequestSchema,
  UserTypeSchema,
  type BusinessProfileCollection as BusinessProfileCollectionContract,
  type BusinessProfile,
  type BusinessProfilePage,
  type BusinessProfileSuggestionList as BusinessProfileSuggestionListContract,
  type IncrementProfileViewResponse as IncrementProfileViewResponseContract,
  type TrendingBusinessList,
  type UpsertMyBusinessProfileRequest,
} from '../contracts';

function createStringListParamSchema(maxLength = 120) {
  return z.preprocess((value) => {
    const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
    return values
      .flatMap((item) =>
        typeof item === 'string' ? item.split(',') : [],
      )
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(z.string().min(1).max(maxLength)).default([]));
}

function createBooleanParamSchema() {
  return z.preprocess((value) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      if (value === 'true') {
        return true;
      }
      if (value === 'false') {
        return false;
      }
    }

    return undefined;
  }, z.boolean().optional());
}

export const ProfileListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  query: z.string().trim().max(120).optional(),
  userType: z.preprocess((value) => {
    const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
    return values
      .flatMap((item) =>
        typeof item === 'string' ? item.split(',') : [],
      )
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(UserTypeSchema).default([])),
  industry: createStringListParamSchema(),
  stage: z.preprocess((value) => {
    const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
    return values
      .flatMap((item) =>
        typeof item === 'string' ? item.split(',') : [],
      )
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(BusinessStageSchema).default([])),
  skills: createStringListParamSchema(),
  location: z.string().trim().max(120).optional(),
  fundingNeeded: createBooleanParamSchema(),
  verifiedOnly: createBooleanParamSchema(),
});

export const ProfileSuggestionQuerySchema = z.object({
  query: z.string().trim().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(10).default(5),
});

export const SimilarProfilesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(4),
});

export const TrendingProfilesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const UpsertMyProfileBodySchema = UpsertMyBusinessProfileRequestSchema;

export type ProfileListQuery = z.infer<typeof ProfileListQuerySchema>;
export type ProfileSuggestionQuery = z.infer<typeof ProfileSuggestionQuerySchema>;
export type SimilarProfilesQuery = z.infer<typeof SimilarProfilesQuerySchema>;
export type TrendingProfilesQuery = z.infer<typeof TrendingProfilesQuerySchema>;
export type UpsertMyProfileBody = UpsertMyBusinessProfileRequest;
export type BusinessProfileItem = BusinessProfile;
export type BusinessProfileList = BusinessProfilePage;
export type BusinessProfileCollection = BusinessProfileCollectionContract;
export type BusinessProfileSuggestionList = BusinessProfileSuggestionListContract;
export type TrendingProfilesList = TrendingBusinessList;
export type IncrementProfileViewResult = IncrementProfileViewResponseContract;

export {
  BusinessProfileCollectionSchema,
  BusinessProfilePageSchema,
  BusinessProfileSchema,
  BusinessProfileSuggestionListSchema,
  IncrementProfileViewResponseSchema,
  TrendingBusinessListSchema,
};
