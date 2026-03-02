import { z } from 'zod';

export const ApiMetaSchema = z.object({
  requestId: z.string().optional(),
  cursor: z.string().nullable().optional(),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean().optional(),
});

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export function successEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: ApiMetaSchema.optional(),
  });
}

export function errorEnvelopeSchema() {
  return z.object({
    error: ApiErrorSchema,
    meta: ApiMetaSchema.optional(),
  });
}

export type ApiMeta = z.infer<typeof ApiMetaSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
