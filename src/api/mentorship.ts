import { z } from 'zod';
import { apiClient } from './http';

const mentorshipAvailabilitySchema = z.enum(['full-time', 'part-time', 'ad-hoc']);
const mentorshipStatusSchema = z.enum(['pending', 'active', 'completed', 'cancelled']);

const mentorSchema = z.object({
  userId: z.uuid(),
  profileId: z.uuid(),
  name: z.string(),
  company: z.string(),
  avatar: z.string().nullable().optional(),
  expertise: z.array(z.string()),
  experienceYears: z.number().int().nonnegative(),
  rating: z.number().nonnegative(),
  reviews: z.number().int().nonnegative(),
  mentees: z.number().int().nonnegative(),
  availability: mentorshipAvailabilitySchema,
  hourlyRate: z.number().nonnegative().optional(),
  bio: z.string(),
});

const mentorListSchema = z.object({
  items: z.array(mentorSchema),
});

const mentorshipRequestSchema = z.object({
  postId: z.uuid(),
  menteeUserId: z.uuid(),
  authorName: z.string(),
  company: z.string(),
  avatar: z.string().nullable().optional(),
  userType: z.enum(['sme', 'entrepreneur', 'investor', 'mentor', 'admin']),
  content: z.string(),
  expertise: z.array(z.string()),
  commitment: mentorshipAvailabilitySchema,
  duration: z.string(),
  createdAt: z.string(),
});

const mentorshipRequestListSchema = z.object({
  items: z.array(mentorshipRequestSchema),
});

const myMentorshipSchema = z.object({
  id: z.uuid(),
  role: z.enum(['mentor', 'mentee']),
  status: mentorshipStatusSchema,
  counterpartUserId: z.uuid(),
  counterpartName: z.string(),
  counterpartCompany: z.string(),
  counterpartAvatar: z.string().nullable().optional(),
  expertise: z.array(z.string()),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  sessionsCompleted: z.number().int().nonnegative(),
  rating: z.number().int().min(1).max(5).optional(),
  review: z.string().nullable().optional(),
  sourcePostId: z.string().nullable().optional(),
  createdAt: z.string(),
});

const myMentorshipListSchema = z.object({
  items: z.array(myMentorshipSchema),
});

export type MentorshipMentorDto = z.infer<typeof mentorSchema>;
export type MentorshipRequestDto = z.infer<typeof mentorshipRequestSchema>;
export type MyMentorshipDto = z.infer<typeof myMentorshipSchema>;

export const mentorshipApi = {
  async getMentors(params?: { search?: string; expertise?: string; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.search) {
      search.set('search', params.search);
    }
    if (params?.expertise) {
      search.set('expertise', params.expertise);
    }
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    const query = search.size > 0 ? `?${search.toString()}` : '';

    return apiClient.request<z.infer<typeof mentorListSchema>>(
      `/mentorship/mentors${query}`,
      {
        method: 'GET',
        schema: mentorListSchema,
      },
    );
  },

  async getRequests(params?: { search?: string; expertise?: string; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.search) {
      search.set('search', params.search);
    }
    if (params?.expertise) {
      search.set('expertise', params.expertise);
    }
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    const query = search.size > 0 ? `?${search.toString()}` : '';

    return apiClient.request<z.infer<typeof mentorshipRequestListSchema>>(
      `/mentorship/requests${query}`,
      {
        method: 'GET',
        schema: mentorshipRequestListSchema,
      },
    );
  },

  async getMine() {
    return apiClient.request<z.infer<typeof myMentorshipListSchema>>('/mentorship/mine', {
      method: 'GET',
      schema: myMentorshipListSchema,
    });
  },

  async createOffer(postId: string, payload: { message?: string }) {
    return apiClient.request<z.infer<typeof myMentorshipSchema>>(
      `/mentorship/posts/${postId}/offers`,
      {
        method: 'POST',
        body: payload,
        schema: myMentorshipSchema,
      },
    );
  },

  async updateStatus(
    relationshipId: string,
    payload: {
      status: 'active' | 'completed' | 'cancelled';
      rating?: number;
      review?: string;
      sessionsCompleted?: number;
    },
  ) {
    return apiClient.request<z.infer<typeof myMentorshipSchema>>(
      `/mentorship/relationships/${relationshipId}/status`,
      {
        method: 'POST',
        body: payload,
        schema: myMentorshipSchema,
      },
    );
  },
};
