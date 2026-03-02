import { z } from 'zod';
import { UserTypeSchema, VerificationLevelSchema } from './enums';

export const RegisterRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  userType: UserTypeSchema,
});

export const LoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const AuthUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  userType: UserTypeSchema,
  isVerified: z.boolean(),
  verificationLevel: VerificationLevelSchema,
});

export const AuthTokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresInSeconds: z.int().positive(),
  refreshTokenExpiresInSeconds: z.int().positive(),
});

export const AuthSessionResponseSchema = z.object({
  user: AuthUserSchema,
  tokens: AuthTokenPairSchema,
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthTokenPair = z.infer<typeof AuthTokenPairSchema>;
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;
