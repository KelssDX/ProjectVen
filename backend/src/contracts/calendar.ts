import { z } from 'zod';
import {
  CalendarEventTypeSchema,
  CalendarSourceSchema,
  MeetingModeSchema,
} from './enums';

export const CalendarProviderSchema = z.enum(['google', 'microsoft']);

export const CalendarEventSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  integrationId: z.uuid().nullable().optional(),
  source: CalendarSourceSchema,
  externalEventId: z.string().nullable().optional(),
  eventType: CalendarEventTypeSchema,
  title: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startAt: z.string(),
  endAt: z.string().nullable().optional(),
  recurrenceRule: z.string().nullable().optional(),
  meetingMode: MeetingModeSchema.nullable().optional(),
  meetingLink: z.string().nullable().optional(),
  sourceLink: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CalendarEventListSchema = z.object({
  items: z.array(CalendarEventSchema),
});

export const CalendarIntegrationSchema = z.object({
  provider: CalendarProviderSchema,
  connected: z.boolean(),
  externalAccountId: z.string().nullable().optional(),
  accountEmail: z.string().nullable().optional(),
  lastSyncAt: z.string().nullable().optional(),
  scope: z.string().nullable().optional(),
});

export const CalendarIntegrationListSchema = z.object({
  items: z.array(CalendarIntegrationSchema),
});

export const CreateCalendarEventRequestSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4_000).optional(),
  location: z.string().trim().max(255).optional(),
  startAt: z.string(),
  endAt: z.string().optional(),
  eventType: CalendarEventTypeSchema,
  recurrenceRule: z.string().trim().max(500).optional(),
  meetingMode: MeetingModeSchema.optional(),
  meetingLink: z.string().trim().max(2_048).optional(),
  sourceLink: z.string().trim().max(2_048).optional(),
});

export const UpdateCalendarEventRequestSchema =
  CreateCalendarEventRequestSchema;

export const ConnectCalendarIntegrationRequestSchema = z.object({
  externalAccountId: z.string().trim().max(255).optional(),
  scope: z.string().trim().max(500).optional(),
  providerMetadata: z.record(z.string(), z.unknown()).optional(),
});

export const BeginCalendarOauthRequestSchema = z.object({
  redirectUri: z.url(),
});

export const BeginCalendarOauthResponseSchema = z.object({
  authUrl: z.url(),
  state: z.string(),
  expiresAt: z.string(),
});

export const CompleteCalendarOauthRequestSchema = z.object({
  code: z.string().trim().min(1),
  state: z.string().trim().min(1),
  redirectUri: z.url(),
});

export const CalendarSyncResultSchema = z.object({
  provider: CalendarProviderSchema,
  importedCount: z.number().int().nonnegative(),
  updatedCount: z.number().int().nonnegative(),
  deletedCount: z.number().int().nonnegative(),
  pushedCount: z.number().int().nonnegative(),
  skippedMirroredCount: z.number().int().nonnegative(),
  lastSyncAt: z.string(),
});

export const CalendarWebhookAckSchema = z.object({
  accepted: z.literal(true),
  provider: CalendarProviderSchema,
  integrationIds: z.array(z.uuid()),
});

export const DeleteCalendarEventResultSchema = z.object({
  id: z.uuid(),
  deleted: z.literal(true),
});

export type CalendarProvider = z.infer<typeof CalendarProviderSchema>;
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
export type CalendarEventList = z.infer<typeof CalendarEventListSchema>;
export type CalendarIntegration = z.infer<typeof CalendarIntegrationSchema>;
export type CalendarIntegrationList = z.infer<
  typeof CalendarIntegrationListSchema
>;
export type CreateCalendarEventRequest = z.infer<
  typeof CreateCalendarEventRequestSchema
>;
export type UpdateCalendarEventRequest = z.infer<
  typeof UpdateCalendarEventRequestSchema
>;
export type ConnectCalendarIntegrationRequest = z.infer<
  typeof ConnectCalendarIntegrationRequestSchema
>;
export type BeginCalendarOauthRequest = z.infer<
  typeof BeginCalendarOauthRequestSchema
>;
export type BeginCalendarOauthResponse = z.infer<
  typeof BeginCalendarOauthResponseSchema
>;
export type CompleteCalendarOauthRequest = z.infer<
  typeof CompleteCalendarOauthRequestSchema
>;
export type CalendarSyncResult = z.infer<typeof CalendarSyncResultSchema>;
export type CalendarWebhookAck = z.infer<typeof CalendarWebhookAckSchema>;
export type DeleteCalendarEventResult = z.infer<
  typeof DeleteCalendarEventResultSchema
>;
