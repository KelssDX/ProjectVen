import {
  profilesApi,
  type BusinessProfileDto,
  type TrendingBusinessDto,
  type UpsertMyBusinessProfileRequestDto,
} from '@/api/profiles';
import { ApiClientError } from '@/api/types';
import { mockProfiles, trendingBusinesses } from '@/data/mockProfiles';
import type {
  BusinessProfile,
  PaginatedResponse,
  SearchFilters,
  TrendingBusiness,
} from '@/types';

const USE_REAL_PROFILES = import.meta.env.VITE_FEATURE_USE_REAL_PROFILES === 'true';

function mapProfileDto(dto: BusinessProfileDto): BusinessProfile {
  return {
    id: dto.id,
    userId: dto.userId,
    companyName: dto.companyName,
    tagline: dto.tagline ?? undefined,
    description: dto.description,
    industry: dto.industry,
    subIndustry: dto.subIndustry ?? undefined,
    location: dto.location,
    website: dto.website ?? undefined,
    foundedYear: dto.foundedYear ?? undefined,
    teamSize: dto.teamSize ?? undefined,
    stage: dto.stage,
    fundingNeeded: dto.fundingNeeded,
    fundingAmount: dto.fundingAmount ?? undefined,
    skills: dto.skills,
    lookingFor: dto.lookingFor,
    achievements: dto.achievements,
    socialLinks: {
      linkedin: dto.socialLinks.linkedin,
      twitter: dto.socialLinks.twitter,
      facebook: dto.socialLinks.facebook,
    },
    coverImage: dto.coverImage ?? undefined,
    logo: dto.logo ?? undefined,
    isPublic: dto.isPublic,
    views: dto.views,
    connections: dto.connections,
  };
}

function mapTrendingDto(dto: TrendingBusinessDto): TrendingBusiness {
  return {
    profileId: dto.profileId,
    profile: mapProfileDto(dto.profile),
    score: dto.score,
    viewsLastWeek: dto.viewsLastWeek,
    connectionsLastWeek: dto.connectionsLastWeek,
    rank: dto.rank,
    category: dto.category,
  };
}

function mergeProfiles(
  base: BusinessProfile,
  updates: Partial<BusinessProfile>,
): BusinessProfile {
  return {
    ...base,
    ...updates,
    location: {
      ...base.location,
      ...updates.location,
    },
    socialLinks: {
      ...base.socialLinks,
      ...updates.socialLinks,
    },
    skills: updates.skills ?? base.skills,
    lookingFor: updates.lookingFor ?? base.lookingFor,
    achievements: updates.achievements ?? base.achievements,
  };
}

function emptyToNullableString(value?: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function emptyToOptionalString(value?: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function uniqueTrimmed(values?: string[]): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function buildUpsertPayload(
  profile: Partial<BusinessProfile>,
): UpsertMyBusinessProfileRequestDto {
  return {
    companyName: profile.companyName ?? '',
    tagline: emptyToNullableString(profile.tagline),
    description: profile.description ?? '',
    industry: profile.industry ?? '',
    subIndustry: emptyToNullableString(profile.subIndustry),
    location: {
      city: profile.location?.city ?? '',
      country: profile.location?.country ?? '',
    },
    website: emptyToNullableString(profile.website),
    foundedYear: profile.foundedYear ?? null,
    teamSize: emptyToNullableString(profile.teamSize),
    stage: profile.stage ?? 'idea',
    fundingNeeded: Boolean(profile.fundingNeeded),
    fundingAmount: profile.fundingNeeded ? profile.fundingAmount ?? null : null,
    skills: uniqueTrimmed(profile.skills),
    lookingFor: uniqueTrimmed(profile.lookingFor),
    achievements: uniqueTrimmed(profile.achievements),
    socialLinks: {
      linkedin: emptyToOptionalString(profile.socialLinks?.linkedin),
      twitter: emptyToOptionalString(profile.socialLinks?.twitter),
      facebook: emptyToOptionalString(profile.socialLinks?.facebook),
    },
    coverImage: emptyToNullableString(profile.coverImage),
    logo: emptyToNullableString(profile.logo),
    isPublic: profile.isPublic ?? true,
  };
}

class ProfileService {
  private profiles: BusinessProfile[] = mockProfiles;

  async getProfiles(
    page = 1,
    limit = 10,
    filters?: SearchFilters,
  ): Promise<PaginatedResponse<BusinessProfile>> {
    if (USE_REAL_PROFILES) {
      try {
        const { data } = await profilesApi.getProfiles({
          page,
          limit,
          query: filters?.query,
          userType: filters?.userType,
          industry: filters?.industry,
          stage: filters?.stage,
          skills: filters?.skills,
          location: filters?.location,
          fundingNeeded: filters?.fundingNeeded,
          verifiedOnly: filters?.verifiedOnly,
        });

        return {
          data: data.items.map(mapProfileDto),
          total: data.total,
          page: data.page,
          limit: data.limit,
          hasMore: data.hasMore,
        };
      } catch (error) {
        console.error('Failed to load live profiles, falling back to fixtures:', error);
      }
    }

    let filteredProfiles = [...this.profiles];

    if (filters) {
      if (filters.query) {
        const query = filters.query.toLowerCase();
        filteredProfiles = filteredProfiles.filter(
          (profile) =>
            profile.companyName.toLowerCase().includes(query) ||
            profile.description.toLowerCase().includes(query) ||
            profile.industry.toLowerCase().includes(query) ||
            profile.tagline?.toLowerCase().includes(query),
        );
      }

      if (filters.industry && filters.industry.length > 0) {
        filteredProfiles = filteredProfiles.filter((profile) =>
          filters.industry?.includes(profile.industry),
        );
      }

      if (filters.stage && filters.stage.length > 0) {
        filteredProfiles = filteredProfiles.filter((profile) =>
          filters.stage?.includes(profile.stage),
        );
      }

      if (filters.location) {
        filteredProfiles = filteredProfiles.filter(
          (profile) =>
            profile.location.city.toLowerCase().includes(filters.location!.toLowerCase()) ||
            profile.location.country.toLowerCase().includes(filters.location!.toLowerCase()),
        );
      }

      if (filters.skills && filters.skills.length > 0) {
        filteredProfiles = filteredProfiles.filter((profile) =>
          filters.skills?.some((skill) => profile.skills.includes(skill)),
        );
      }

      if (filters.fundingNeeded !== undefined) {
        filteredProfiles = filteredProfiles.filter(
          (profile) => profile.fundingNeeded === filters.fundingNeeded,
        );
      }
    }

    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: filteredProfiles.slice(start, end),
      total: filteredProfiles.length,
      page,
      limit,
      hasMore: end < filteredProfiles.length,
    };
  }

  async getProfileById(id: string): Promise<BusinessProfile | null> {
    if (USE_REAL_PROFILES) {
      try {
        const { data } = await profilesApi.getProfile(id);
        return mapProfileDto(data);
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 404) {
          return null;
        }

        console.error('Failed to load live profile, falling back to fixtures:', error);
      }
    }

    return this.profiles.find((profile) => profile.id === id || profile.userId === id) ?? null;
  }

  async getProfileByUserId(userId: string): Promise<BusinessProfile | null> {
    return this.getProfileById(userId);
  }

  async createProfile(
    profile: Omit<BusinessProfile, 'id' | 'views' | 'connections'>,
  ): Promise<BusinessProfile> {
    if (USE_REAL_PROFILES) {
      const { data } = await profilesApi.upsertMyProfile(buildUpsertPayload(profile));
      return mapProfileDto(data);
    }

    const newProfile: BusinessProfile = {
      ...profile,
      id: String(Date.now()),
      views: 0,
      connections: 0,
    };
    this.profiles.push(newProfile);
    return newProfile;
  }

  async updateProfile(
    id: string,
    updates: Partial<BusinessProfile>,
  ): Promise<BusinessProfile | null> {
    if (USE_REAL_PROFILES) {
      const current = await this.getProfileById(id);
      if (!current) {
        return null;
      }

      const merged = mergeProfiles(current, updates);
      const { data } = await profilesApi.upsertMyProfile(buildUpsertPayload(merged));
      return mapProfileDto(data);
    }

    const index = this.profiles.findIndex((profile) => profile.id === id);
    if (index === -1) {
      return null;
    }

    this.profiles[index] = mergeProfiles(this.profiles[index], updates);
    return this.profiles[index];
  }

  async getTrendingBusinesses(limit = 5): Promise<TrendingBusiness[]> {
    if (USE_REAL_PROFILES) {
      try {
        const { data } = await profilesApi.getTrending(limit);
        return data.items.map(mapTrendingDto);
      } catch (error) {
        console.error('Failed to load live trending profiles, falling back to fixtures:', error);
      }
    }

    return trendingBusinesses.slice(0, limit);
  }

  async getSimilarBusinesses(profileId: string, limit = 4): Promise<BusinessProfile[]> {
    if (USE_REAL_PROFILES) {
      try {
        const { data } = await profilesApi.getSimilarProfiles(profileId, limit);
        return data.items.map(mapProfileDto);
      } catch (error) {
        console.error('Failed to load similar profiles, falling back to fixtures:', error);
      }
    }

    const profile = this.profiles.find((candidate) => candidate.id === profileId);
    if (!profile) {
      return [];
    }

    return this.profiles
      .filter((candidate) => candidate.id !== profileId)
      .map((candidate) => {
        let score = 0;
        if (candidate.industry === profile.industry) score += 3;
        if (candidate.stage === profile.stage) score += 2;
        score += candidate.skills.filter((skill) => profile.skills.includes(skill)).length;
        return { profile: candidate, score };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((item) => item.profile);
  }

  async incrementViews(id: string): Promise<void> {
    if (USE_REAL_PROFILES) {
      try {
        await profilesApi.incrementView(id);
        return;
      } catch (error) {
        console.error('Failed to increment live profile views:', error);
        return;
      }
    }

    const profile = this.profiles.find((candidate) => candidate.id === id);
    if (profile) {
      profile.views += 1;
    }
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    if (USE_REAL_PROFILES) {
      try {
        const { data } = await profilesApi.getSuggestions(query, 5);
        return data.items;
      } catch (error) {
        console.error('Failed to load live profile suggestions, falling back to fixtures:', error);
      }
    }

    if (!query || query.length < 2) {
      return [];
    }

    const suggestions = new Set<string>();
    const lowerQuery = query.toLowerCase();

    this.profiles.forEach((profile) => {
      if (profile.companyName.toLowerCase().includes(lowerQuery)) {
        suggestions.add(profile.companyName);
      }
      if (profile.industry.toLowerCase().includes(lowerQuery)) {
        suggestions.add(profile.industry);
      }
      if (profile.location.city.toLowerCase().includes(lowerQuery)) {
        suggestions.add(profile.location.city);
      }
    });

    return Array.from(suggestions).slice(0, 5);
  }
}

export const profileService = new ProfileService();
export default profileService;
