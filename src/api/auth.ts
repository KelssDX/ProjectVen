import { z } from 'zod';
import { apiClient } from './http';

const authUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  userType: z.enum(['sme', 'entrepreneur', 'investor', 'mentor', 'admin']),
  isVerified: z.boolean(),
  verificationLevel: z.enum(['basic', 'verified', 'trusted']),
});

const authTokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresInSeconds: z.number().int().positive(),
  refreshTokenExpiresInSeconds: z.number().int().positive(),
});

const authSessionSchema = z.object({
  user: authUserSchema,
  tokens: authTokenPairSchema,
});

const verificationSchema = z.object({
  isVerified: z.boolean(),
  verificationLevel: z.enum(['basic', 'verified', 'trusted']),
});

const loginPayloadSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

const registerPayloadSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  userType: z.enum(['sme', 'entrepreneur', 'investor', 'mentor']),
});

export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type RegisterPayload = z.infer<typeof registerPayloadSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;

export const authApi = {
  async login(payload: LoginPayload) {
    return apiClient.request<AuthSession>('/auth/login', {
      method: 'POST',
      body: loginPayloadSchema.parse(payload),
      schema: authSessionSchema,
      skipAuthRefresh: true,
    });
  },

  async register(payload: RegisterPayload) {
    return apiClient.request<AuthSession>('/auth/register', {
      method: 'POST',
      body: registerPayloadSchema.parse(payload),
      schema: authSessionSchema,
      skipAuthRefresh: true,
    });
  },

  async refresh(refreshToken: string) {
    return apiClient.request<AuthSession>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      schema: authSessionSchema,
      skipAuthRefresh: true,
    });
  },

  async logout(refreshToken: string) {
    return apiClient.request<{ success: true }>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      schema: z.object({ success: z.literal(true) }),
      skipAuthRefresh: true,
    });
  },

  async me() {
    return apiClient.request<z.infer<typeof authUserSchema>>('/auth/me', {
      method: 'GET',
      schema: authUserSchema,
    });
  },

  async myVerification() {
    return apiClient.request<z.infer<typeof verificationSchema>>(
      '/auth/me/verification',
      {
        method: 'GET',
        schema: verificationSchema,
      },
    );
  },
};
