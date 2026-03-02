import type { ZodType } from 'zod';

export interface ApiMeta {
  requestId?: string;
  cursor?: string | null;
  nextCursor?: string | null;
  hasMore?: boolean;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorEnvelope {
  error: ApiErrorPayload;
  meta?: ApiMeta;
}

export interface RequestOptions<T> extends Omit<RequestInit, 'body'> {
  body?: unknown;
  schema?: ZodType<T>;
  timeoutMs?: number;
  requestId?: string;
  skipAuthRefresh?: boolean;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    status: number,
    code = 'UNKNOWN_API_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
