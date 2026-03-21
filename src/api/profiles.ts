import { z } from 'zod';
import { apiClient } from './http';

const userTypeSchema = z.enum(['sme', 'entrepreneur', 'investor', 'mentor', 'admin']);
const verificationLevelSchema = z.enum(['basic', 'verified', 'trusted']);
const businessStageSchema = z.enum(['idea', 'seed', 'early', 'growth', 'established']);

const businessProfileLocationSchema = z.object({
  city: z.string(),
  country: z.string(),
});

const businessProfileSocialLinksSchema = z.object({
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
});

const businessProfileOwnerSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  avatar: z.string().nullable().optional(),
  userType: userTypeSchema,
  isVerified: z.boolean(),
  verificationLevel: verificationLevelSchema,
});

const businessProfileSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  companyName: z.string(),
  tagline: z.string().nullable().optional(),
  description: z.string(),
  industry: z.string(),
  subIndustry: z.string().nullable().optional(),
  location: businessProfileLocationSchema,
  website: z.string().nullable().optional(),
  foundedYear: z.number().int().nullable().optional(),
  teamSize: z.string().nullable().optional(),
  stage: businessStageSchema,
  fundingNeeded: z.boolean(),
  fundingAmount: z.number().nullable().optional(),
  skills: z.array(z.string()),
  lookingFor: z.array(z.string()),
  achievements: z.array(z.string()),
  socialLinks: businessProfileSocialLinksSchema,
  coverImage: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  isPublic: z.boolean(),
  views: z.number().int().nonnegative(),
  connections: z.number().int().nonnegative(),
  owner: businessProfileOwnerSchema,
});

const businessProfilePageSchema = z.object({
  items: z.array(businessProfileSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
});

const businessProfileCollectionSchema = z.object({
  items: z.array(businessProfileSchema),
});

const businessProfileSuggestionListSchema = z.object({
  items: z.array(z.string()),
});

const trendingBusinessSchema = z.object({
  profileId: z.uuid(),
  profile: businessProfileSchema,
  score: z.number().int().nonnegative(),
  viewsLastWeek: z.number().int().nonnegative(),
  connectionsLastWeek: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
  category: z.string(),
});

const trendingBusinessListSchema = z.object({
  items: z.array(trendingBusinessSchema),
});

const upsertMyBusinessProfileRequestSchema = z.object({
  companyName: z.string(),
  tagline: z.string().nullable().optional(),
  description: z.string(),
  industry: z.string(),
  subIndustry: z.string().nullable().optional(),
  location: businessProfileLocationSchema,
  website: z.string().nullable().optional(),
  foundedYear: z.number().int().nullable().optional(),
  teamSize: z.string().nullable().optional(),
  stage: businessStageSchema,
  fundingNeeded: z.boolean(),
  fundingAmount: z.number().nullable().optional(),
  skills: z.array(z.string()),
  lookingFor: z.array(z.string()),
  achievements: z.array(z.string()),
  socialLinks: businessProfileSocialLinksSchema,
  coverImage: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  isPublic: z.boolean(),
});

const incrementProfileViewResponseSchema = z.object({
  id: z.uuid(),
  views: z.number().int().nonnegative(),
});

export type BusinessProfileDto = z.infer<typeof businessProfileSchema>;
export type BusinessProfilePageDto = z.infer<typeof businessProfilePageSchema>;
export type TrendingBusinessDto = z.infer<typeof trendingBusinessSchema>;
export type UpsertMyBusinessProfileRequestDto = z.infer<
  typeof upsertMyBusinessProfileRequestSchema
>;

export const profilesApi = {
  async getProfiles(params?: {
    page?: number;
    limit?: number;
    query?: string;
    userType?: string[];
    industry?: string[];
    stage?: string[];
    skills?: string[];
    location?: string;
    fundingNeeded?: boolean;
    verifiedOnly?: boolean;
  }) {
    const search = new URLSearchParams();
    if (params?.page) {
      search.set('page', String(params.page));
    }
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    if (params?.query) {
      search.set('query', params.query);
    }
    for (const value of params?.userType ?? []) {
      search.append('userType', value);
    }
    for (const value of params?.industry ?? []) {
      search.append('industry', value);
    }
    for (const value of params?.stage ?? []) {
      search.append('stage', value);
    }
    for (const value of params?.skills ?? []) {
      search.append('skills', value);
    }
    if (params?.location) {
      search.set('location', params.location);
    }
    if (typeof params?.fundingNeeded === 'boolean') {
      search.set('fundingNeeded', String(params.fundingNeeded));
    }
    if (typeof params?.verifiedOnly === 'boolean') {
      search.set('verifiedOnly', String(params.verifiedOnly));
    }

    const query = search.size > 0 ? `?${search.toString()}` : '';
    return apiClient.request<BusinessProfilePageDto>(`/profiles${query}`, {
      method: 'GET',
      schema: businessProfilePageSchema,
    });
  },

  async getProfile(id: string) {
    return apiClient.request<BusinessProfileDto>(`/profiles/${id}`, {
      method: 'GET',
      schema: businessProfileSchema,
    });
  },

  async getSimilarProfiles(id: string, limit = 4) {
    return apiClient.request<z.infer<typeof businessProfileCollectionSchema>>(
      `/profiles/${id}/similar?limit=${limit}`,
      {
        method: 'GET',
        schema: businessProfileCollectionSchema,
      },
    );
  },

  async getSuggestions(query: string, limit = 5) {
    const search = new URLSearchParams({
      query,
      limit: String(limit),
    });
    return apiClient.request<z.infer<typeof businessProfileSuggestionListSchema>>(
      `/profiles/suggestions?${search.toString()}`,
      {
        method: 'GET',
        schema: businessProfileSuggestionListSchema,
      },
    );
  },

  async getTrending(limit = 20) {
    return apiClient.request<z.infer<typeof trendingBusinessListSchema>>(
      `/profiles/trending?limit=${limit}`,
      {
        method: 'GET',
        schema: trendingBusinessListSchema,
      },
    );
  },

  async upsertMyProfile(payload: UpsertMyBusinessProfileRequestDto) {
    return apiClient.request<BusinessProfileDto>('/profiles/me', {
      method: 'PUT',
      body: payload,
      schema: businessProfileSchema,
    });
  },

  async incrementView(id: string) {
    return apiClient.request<z.infer<typeof incrementProfileViewResponseSchema>>(
      `/profiles/${id}/views`,
      {
        method: 'POST',
        schema: incrementProfileViewResponseSchema,
      },
    );
  },
};
