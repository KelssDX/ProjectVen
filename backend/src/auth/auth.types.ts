import { z } from 'zod';

const UserTypeSchema = z.enum(['sme', 'entrepreneur', 'investor', 'mentor']);
const VerificationLevelSchema = z.enum(['basic', 'verified', 'trusted']);

export const RegisterBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  userType: UserTypeSchema,
});

export const LoginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const RefreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const LogoutBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const UpdateVerificationBodySchema = z.object({
  isVerified: z.boolean(),
  verificationLevel: VerificationLevelSchema,
});

export type RegisterBody = z.infer<typeof RegisterBodySchema>;
export type LoginBody = z.infer<typeof LoginBodySchema>;
export type RefreshBody = z.infer<typeof RefreshBodySchema>;
export type LogoutBody = z.infer<typeof LogoutBodySchema>;
export type UpdateVerificationBody = z.infer<typeof UpdateVerificationBodySchema>;

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'sme' | 'entrepreneur' | 'investor' | 'mentor' | 'admin';
  isVerified: boolean;
  verificationLevel: 'basic' | 'verified' | 'trusted';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
}
