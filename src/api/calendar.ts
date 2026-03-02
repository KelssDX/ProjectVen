import { z } from 'zod';
import { apiClient } from './http';

const calendarEventSchema = z.object({
  id: z.string(),
  source: z.enum(['vendrom', 'google', 'microsoft']),
  title: z.string(),
  startAt: z.string(),
  endAt: z.string().nullable().optional(),
  eventType: z.enum(['meeting', 'deadline', 'event', 'booking', 'reminder']),
});

const calendarIntegrationSchema = z.object({
  id: z.string(),
  provider: z.enum(['vendrom', 'google', 'microsoft']),
  connected: z.boolean(),
  lastSyncAt: z.string().nullable().optional(),
});

export type CalendarEventDto = z.infer<typeof calendarEventSchema>;

export const calendarApi = {
  async getEvents(startAt?: string, endAt?: string) {
    const query = new URLSearchParams();
    if (startAt) query.set('startAt', startAt);
    if (endAt) query.set('endAt', endAt);
    const suffix = query.toString() ? `?${query.toString()}` : '';

    return apiClient.request<{ items: CalendarEventDto[] }>(`/calendar/events${suffix}`, {
      method: 'GET',
      schema: z.object({ items: z.array(calendarEventSchema) }),
    });
  },

  async getIntegrations() {
    return apiClient.request<{ items: z.infer<typeof calendarIntegrationSchema>[] }>(
      '/calendar/integrations',
      {
        method: 'GET',
        schema: z.object({ items: z.array(calendarIntegrationSchema) }),
      },
    );
  },
};
