import { z } from 'zod';
import { apiClient } from './http';

const connectionUserSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  company: z.string(),
  avatar: z.string().nullable().optional(),
  userType: z.enum(['sme', 'entrepreneur', 'investor', 'mentor', 'admin']),
});

const connectionSchema = z.object({
  id: z.uuid(),
  requesterId: z.uuid(),
  addresseeId: z.uuid(),
  status: z.enum(['pending', 'accepted', 'rejected', 'blocked']),
  message: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  otherUser: connectionUserSummarySchema,
});

const connectionListSchema = z.object({
  accepted: z.array(connectionSchema),
  pendingReceived: z.array(connectionSchema),
  pendingSent: z.array(connectionSchema),
});

const followToggleSchema = z.object({
  isFollowing: z.boolean(),
});

const topicSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  followersCount: z.number().int().nonnegative(),
  isFollowing: z.boolean(),
});

const topicListSchema = z.object({
  items: z.array(topicSummarySchema),
});

const topicFollowToggleSchema = z.object({
  topicId: z.uuid(),
  isFollowing: z.boolean(),
  followersCount: z.number().int().nonnegative(),
});

export type ConnectionDto = z.infer<typeof connectionSchema>;
export type ConnectionListDto = z.infer<typeof connectionListSchema>;
export type TopicSummaryDto = z.infer<typeof topicSummarySchema>;

export const connectionsApi = {
  async getMine(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiClient.request<ConnectionListDto>(`/connections/mine${query}`, {
      method: 'GET',
      schema: connectionListSchema,
    });
  },

  async requestConnection(addresseeId: string, message?: string) {
    return apiClient.request<ConnectionDto>('/connections/requests', {
      method: 'POST',
      body: { addresseeId, message },
      schema: connectionSchema,
    });
  },

  async acceptConnection(connectionId: string) {
    return apiClient.request<ConnectionDto>(`/connections/${connectionId}/accept`, {
      method: 'POST',
      schema: connectionSchema,
    });
  },

  async rejectConnection(connectionId: string) {
    return apiClient.request<ConnectionDto>(`/connections/${connectionId}/reject`, {
      method: 'POST',
      schema: connectionSchema,
    });
  },

  async toggleFollow(userId: string) {
    return apiClient.request<z.infer<typeof followToggleSchema>>(
      `/connections/follows/${userId}/toggle`,
      {
        method: 'POST',
        schema: followToggleSchema,
      },
    );
  },

  async getTopics(params?: { search?: string; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.search) {
      search.set('search', params.search);
    }
    if (params?.limit) {
      search.set('limit', String(params.limit));
    }
    const query = search.size > 0 ? `?${search.toString()}` : '';
    return apiClient.request<z.infer<typeof topicListSchema>>(`/connections/topics${query}`, {
      method: 'GET',
      schema: topicListSchema,
    });
  },

  async toggleTopicFollow(topicId: string) {
    return apiClient.request<z.infer<typeof topicFollowToggleSchema>>(
      `/connections/topics/${topicId}/toggle`,
      {
        method: 'POST',
        schema: topicFollowToggleSchema,
      },
    );
  },
};
