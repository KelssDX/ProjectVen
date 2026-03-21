import { z } from 'zod';
import {
  BeginCalendarOauthRequestSchema,
  CompleteCalendarOauthRequestSchema,
  CalendarProviderSchema,
  ConnectCalendarIntegrationRequestSchema,
  CreateCalendarEventRequestSchema,
  UpdateCalendarEventRequestSchema,
} from '../contracts/calendar';

export const CalendarEventListQuerySchema = z.object({
  startAt: z.string().trim().min(1).optional(),
  endAt: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(250),
});

export const CreateCalendarEventBodySchema = CreateCalendarEventRequestSchema;

export const UpdateCalendarEventBodySchema = UpdateCalendarEventRequestSchema;

export const ConnectCalendarIntegrationBodySchema =
  ConnectCalendarIntegrationRequestSchema;

export const BeginCalendarOauthBodySchema = BeginCalendarOauthRequestSchema;

export const CompleteCalendarOauthBodySchema =
  CompleteCalendarOauthRequestSchema;

export type CalendarEventListQuery = z.infer<
  typeof CalendarEventListQuerySchema
>;
export type CreateCalendarEventBody = z.infer<
  typeof CreateCalendarEventBodySchema
>;
export type UpdateCalendarEventBody = z.infer<
  typeof UpdateCalendarEventBodySchema
>;
export type ConnectCalendarIntegrationBody = z.infer<
  typeof ConnectCalendarIntegrationBodySchema
>;
export type BeginCalendarOauthBody = z.infer<
  typeof BeginCalendarOauthBodySchema
>;
export type CompleteCalendarOauthBody = z.infer<
  typeof CompleteCalendarOauthBodySchema
>;
export type CalendarProvider = z.infer<typeof CalendarProviderSchema>;
