import type { BusinessProfile, SearchFilters, PaginatedResponse } from '@/types';
import { mockProfiles, trendingBusinesses } from '@/data/mockProfiles';

class ProfileService {
  private profiles: BusinessProfile[] = mockProfiles;

  // Get all profiles with pagination
  async getProfiles(
    page: number = 1,
    limit: number = 10,
    filters?: SearchFilters
  ): Promise<PaginatedResponse<BusinessProfile>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let filteredProfiles = [...this.profiles];

    // Apply filters
    if (filters) {
      if (filters.query) {
        const query = filters.query.toLowerCase();
        filteredProfiles = filteredProfiles.filter(
          p =>
            p.companyName.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.industry.toLowerCase().includes(query) ||
            p.tagline?.toLowerCase().includes(query)
        );
      }

      if (filters.industry && filters.industry.length > 0) {
        filteredProfiles = filteredProfiles.filter(p =>
          filters.industry?.includes(p.industry)
        );
      }

      if (filters.stage && filters.stage.length > 0) {
        filteredProfiles = filteredProfiles.filter(p =>
          filters.stage?.includes(p.stage)
        );
      }

      if (filters.location) {
        filteredProfiles = filteredProfiles.filter(
          p =>
            p.location.city.toLowerCase().includes(filters.location!.toLowerCase()) ||
            p.location.country.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }

      if (filters.skills && filters.skills.length > 0) {
        filteredProfiles = filteredProfiles.filter(p =>
          filters.skills?.some(skill => p.skills.includes(skill))
        );
      }

      if (filters.fundingNeeded !== undefined) {
        filteredProfiles = filteredProfiles.filter(
          p => p.fundingNeeded === filters.fundingNeeded
        );
      }
    }

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedProfiles = filteredProfiles.slice(start, end);

    return {
      data: paginatedProfiles,
      total: filteredProfiles.length,
      page,
      limit,
      hasMore: end < filteredProfiles.length,
    };
  }

  // Get profile by ID
  async getProfileById(id: string): Promise<BusinessProfile | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.profiles.find(p => p.id === id) || null;
  }

  // Get profile by user ID
  async getProfileByUserId(userId: string): Promise<BusinessProfile | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.profiles.find(p => p.userId === userId) || null;
  }

  // Create profile
  async createProfile(
    profile: Omit<BusinessProfile, 'id' | 'views' | 'connections'>
  ): Promise<BusinessProfile> {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newProfile: BusinessProfile = {
      ...profile,
      id: String(Date.now()),
      views: 0,
      connections: 0,
    };
    this.profiles.push(newProfile);
    return newProfile;
  }

  // Update profile
  async updateProfile(
    id: string,
    updates: Partial<BusinessProfile>
  ): Promise<BusinessProfile | null> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const index = this.profiles.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.profiles[index] = { ...this.profiles[index], ...updates };
    return this.profiles[index];
  }

  // Get trending businesses
  async getTrendingBusinesses(limit: number = 5): Promise<typeof trendingBusinesses> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return trendingBusinesses.slice(0, limit);
  }

  // Get similar businesses
  async getSimilarBusinesses(
    profileId: string,
    limit: number = 4
  ): Promise<BusinessProfile[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const profile = this.profiles.find(p => p.id === profileId);
    if (!profile) return [];

    // Find similar profiles based on industry and skills
    const similar = this.profiles
      .filter(p => p.id !== profileId)
      .map(p => {
        let score = 0;
        if (p.industry === profile.industry) score += 3;
        if (p.stage === profile.stage) score += 2;
        const commonSkills = p.skills.filter(s => profile.skills.includes(s));
        score += commonSkills.length;
        return { profile: p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.profile);

    return similar;
  }

  // Increment profile views
  async incrementViews(id: string): Promise<void> {
    const profile = this.profiles.find(p => p.id === id);
    if (profile) {
      profile.views += 1;
    }
  }

  // Search suggestions
  async getSearchSuggestions(query: string): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    if (!query || query.length < 2) return [];

    const suggestions = new Set<string>();
    const lowerQuery = query.toLowerCase();

    this.profiles.forEach(p => {
      if (p.companyName.toLowerCase().includes(lowerQuery)) {
        suggestions.add(p.companyName);
      }
      if (p.industry.toLowerCase().includes(lowerQuery)) {
        suggestions.add(p.industry);
      }
      if (p.location.city.toLowerCase().includes(lowerQuery)) {
        suggestions.add(p.location.city);
      }
    });

    return Array.from(suggestions).slice(0, 5);
  }
}

export const profileService = new ProfileService();
export default profileService;
