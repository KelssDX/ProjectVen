import { z } from 'zod';
import { apiClient } from './http';

const calendarProviderSchema = z.enum(['google', 'microsoft']);

const calendarEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  integrationId: z.string().nullable().optional(),
  source: z.enum(['vendrom', 'google', 'microsoft']),
  externalEventId: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startAt: z.string(),
  endAt: z.string().nullable().optional(),
  eventType: z.enum(['meeting', 'deadline', 'event', 'booking', 'reminder']),
  recurrenceRule: z.string().nullable().optional(),
  meetingMode: z.enum(['virtual', 'physical']).nullable().optional(),
  meetingLink: z.string().nullable().optional(),
  sourceLink: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const calendarIntegrationSchema = z.object({
  provider: calendarProviderSchema,
  connected: z.boolean(),
  externalAccountId: z.string().nullable().optional(),
  accountEmail: z.string().nullable().optional(),
  lastSyncAt: z.string().nullable().optional(),
  scope: z.string().nullable().optional(),
});

const calendarOauthStartSchema = z.object({
  authUrl: z.string().url(),
  state: z.string(),
  expiresAt: z.string(),
});

const calendarSyncResultSchema = z.object({
  provider: calendarProviderSchema,
  importedCount: z.number().int().nonnegative(),
  updatedCount: z.number().int().nonnegative(),
  deletedCount: z.number().int().nonnegative(),
  pushedCount: z.number().int().nonnegative(),
  skippedMirroredCount: z.number().int().nonnegative(),
  lastSyncAt: z.string(),
});

export type CalendarEventDto = z.infer<typeof calendarEventSchema>;
export type CalendarIntegrationDto = z.infer<typeof calendarIntegrationSchema>;
export type CalendarProviderDto = z.infer<typeof calendarProviderSchema>;

export interface CalendarEventQuery {
  startAt?: string;
  endAt?: string;
  limit?: number;
}

export interface CalendarEventUpsertInput {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt?: string;
  eventType: CalendarEventDto['eventType'];
  recurrenceRule?: string;
  meetingMode?: 'virtual' | 'physical';
  meetingLink?: string;
  sourceLink?: string;
}

export interface ConnectCalendarIntegrationInput {
  externalAccountId?: string;
  scope?: string;
  providerMetadata?: Record<string, unknown>;
}

export interface BeginCalendarOauthInput {
  redirectUri: string;
}

export interface CompleteCalendarOauthInput {
  code: string;
  state: string;
  redirectUri: string;
}

export const calendarApi = {
  async getEvents(query: CalendarEventQuery = {}) {
    const { startAt, endAt, limit } = query;
    const params = new URLSearchParams();
    if (startAt) params.set('startAt', startAt);
    if (endAt) params.set('endAt', endAt);
    if (limit !== undefined) params.set('limit', String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';

    return apiClient.request<{ items: CalendarEventDto[] }>(`/calendar/events${suffix}`, {
      method: 'GET',
      schema: z.object({ items: z.array(calendarEventSchema) }),
    });
  },

  async createEvent(body: CalendarEventUpsertInput) {
    return apiClient.request<CalendarEventDto>('/calendar/events', {
      method: 'POST',
      body,
      schema: calendarEventSchema,
    });
  },

  async updateEvent(eventId: string, body: CalendarEventUpsertInput) {
    return apiClient.request<CalendarEventDto>(`/calendar/events/${eventId}`, {
      method: 'PATCH',
      body,
      schema: calendarEventSchema,
    });
  },

  async deleteEvent(eventId: string) {
    return apiClient.request<{ id: string; deleted: true }>(
      `/calendar/events/${eventId}`,
      {
        method: 'DELETE',
        schema: z.object({
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
    );
  },

  async getIntegrations() {
    return apiClient.request<{ items: CalendarIntegrationDto[] }>('/calendar/integrations', {
      method: 'GET',
      schema: z.object({ items: z.array(calendarIntegrationSchema) }),
    });
  },

  async connectIntegration(
    provider: CalendarProviderDto,
    body: ConnectCalendarIntegrationInput,
  ) {
    return apiClient.request<CalendarIntegrationDto>(
      `/calendar/integrations/${provider}/connect`,
      {
        method: 'POST',
        body,
        schema: calendarIntegrationSchema,
      },
    );
  },

  async beginOauth(provider: CalendarProviderDto, body: BeginCalendarOauthInput) {
    return apiClient.request<z.infer<typeof calendarOauthStartSchema>>(
      `/calendar/integrations/${provider}/oauth/start`,
      {
        method: 'POST',
        body,
        schema: calendarOauthStartSchema,
      },
    );
  },

  async completeOauth(
    provider: CalendarProviderDto,
    body: CompleteCalendarOauthInput,
  ) {
    return apiClient.request<CalendarIntegrationDto>(
      `/calendar/integrations/${provider}/oauth/complete`,
      {
        method: 'POST',
        body,
        schema: calendarIntegrationSchema,
      },
    );
  },

  async disconnectIntegration(provider: CalendarProviderDto) {
    return apiClient.request<CalendarIntegrationDto>(
      `/calendar/integrations/${provider}/disconnect`,
      {
        method: 'POST',
        body: {},
        schema: calendarIntegrationSchema,
      },
    );
  },

  async syncIntegration(provider: CalendarProviderDto) {
    return apiClient.request<z.infer<typeof calendarSyncResultSchema>>(
      `/calendar/integrations/${provider}/sync`,
      {
        method: 'POST',
        body: {},
        schema: calendarSyncResultSchema,
      },
    );
  },
};
