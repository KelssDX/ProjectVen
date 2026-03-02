import { z } from 'zod';
import {
  ApiClientError,
  type ApiErrorEnvelope,
  type ApiSuccessEnvelope,
  type RequestOptions,
} from './types';

const API_TIMEOUT_MS = 15_000;

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type TokenProvider = () => string | null;
type RefreshHandler = () => Promise<string | null>;

interface ApiClientConfig {
  baseURL: string;
  getToken?: TokenProvider;
  refreshToken?: RefreshHandler;
}

export class ApiClient {
  private readonly baseURL: string;
  private getToken?: TokenProvider;
  private refreshToken?: RefreshHandler;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL.replace(/\/+$/, '');
    this.getToken = config.getToken;
    this.refreshToken = config.refreshToken;
  }

  configureAuth(handlers: {
    getToken?: TokenProvider;
    refreshToken?: RefreshHandler;
  }): void {
    this.getToken = handlers.getToken;
    this.refreshToken = handlers.refreshToken;
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions<T> = {},
    hasRetried = false,
  ): Promise<ApiSuccessEnvelope<T>> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const requestId = options.requestId ?? createRequestId();

    const headers = new Headers(options.headers ?? {});
    headers.set('Accept', 'application/json');
    headers.set('X-Request-Id', requestId);

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    const token = this.getToken?.();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (
      response.status === 401 &&
      this.refreshToken &&
      !hasRetried &&
      !options.skipAuthRefresh
    ) {
      const newToken = await this.refreshToken();
      if (newToken) {
        return this.request(endpoint, options, true);
      }
    }

    const json = (await response.json().catch(() => ({}))) as
      | ApiSuccessEnvelope<unknown>
      | ApiErrorEnvelope
      | Record<string, unknown>;

    if (!response.ok) {
      const envelope = json as ApiErrorEnvelope;
      throw new ApiClientError(
        envelope.error?.message ?? `Request failed: ${response.status}`,
        response.status,
        envelope.error?.code ?? 'HTTP_ERROR',
        envelope.error?.details,
      );
    }

    const successEnvelope = json as ApiSuccessEnvelope<unknown>;
    if (!('data' in successEnvelope)) {
      throw new ApiClientError(
        'Invalid API response: missing data envelope',
        response.status,
        'INVALID_ENVELOPE',
      );
    }

    if (!options.schema) {
      return successEnvelope as ApiSuccessEnvelope<T>;
    }

    const parsed = options.schema.safeParse(successEnvelope.data);
    if (!parsed.success) {
      throw new ApiClientError(
        'Invalid API response schema',
        response.status,
        'INVALID_RESPONSE_SCHEMA',
        z.treeifyError(parsed.error),
      );
    }

    return {
      ...successEnvelope,
      data: parsed.data,
    };
  }
}

export const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1',
});

export function setApiClientAuth(handlers: {
  getToken?: TokenProvider;
  refreshToken?: RefreshHandler;
}): void {
  apiClient.configureAuth(handlers);
}
