import { z } from 'zod';

export const UserTypeSchema = z.enum([
  'sme',
  'entrepreneur',
  'investor',
  'mentor',
  'admin',
]);

export const OauthProviderSchema = z.enum(['google', 'facebook', 'linkedin']);
export const VerificationLevelSchema = z.enum(['basic', 'verified', 'trusted']);
export const ConnectionStatusSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
  'blocked',
]);
export const PostVisibilitySchema = z.enum(['public', 'connections', 'private']);
export const PostTypeSchema = z.enum([
  'update',
  'product',
  'service',
  'idea',
  'crowdfunding',
  'investment',
  'mentorship',
  'promo',
]);
export const MediaTypeSchema = z.enum(['image', 'video', 'document']);
export const ReactionTypeSchema = z.enum(['like', 'love', 'interest', 'share']);
export const OrderTypeSchema = z.enum(['product', 'service']);
export const OrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'refunded',
]);
export const BookingStatusSchema = z.enum([
  'pending',
  'confirmed',
  'completed',
  'cancelled',
]);
export const PaymentStatusSchema = z.enum([
  'initiated',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
]);
export const CampaignStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled',
]);
export const CampaignTypeSchema = z.enum([
  'banner',
  'featured',
  'newsletter',
  'sponsored',
]);
export const CalendarSourceSchema = z.enum(['vendrom', 'google', 'microsoft']);
export const CalendarEventTypeSchema = z.enum([
  'meeting',
  'deadline',
  'event',
  'booking',
  'reminder',
]);
export const MeetingModeSchema = z.enum(['virtual', 'physical']);
export const MentorshipStatusSchema = z.enum([
  'pending',
  'active',
  'completed',
  'cancelled',
]);
export const LedgerEntryTypeSchema = z.enum(['debit', 'credit']);
export const NotificationTypeSchema = z.enum([
  'system',
  'message',
  'connection',
  'payment',
  'marketing',
  'security',
]);
export const AuditActorTypeSchema = z.enum(['user', 'service', 'admin']);
export const ModerationStatusSchema = z.enum([
  'pending',
  'under_review',
  'actioned',
  'dismissed',
]);
export const BookmarkTypeSchema = z.enum([
  'post',
  'profile',
  'article',
  'resource',
  'opportunity',
]);
export const BookmarkCategorySchema = z.enum([
  'business',
  'networking',
  'investment',
  'mentorship',
  'marketing',
  'news',
  'resources',
  'inspiration',
]);

export type UserType = z.infer<typeof UserTypeSchema>;
export type OauthProvider = z.infer<typeof OauthProviderSchema>;
export type VerificationLevel = z.infer<typeof VerificationLevelSchema>;
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;
export type PostVisibility = z.infer<typeof PostVisibilitySchema>;
export type PostType = z.infer<typeof PostTypeSchema>;
export type MediaType = z.infer<typeof MediaTypeSchema>;
export type ReactionType = z.infer<typeof ReactionTypeSchema>;
export type OrderType = z.infer<typeof OrderTypeSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export type CampaignType = z.infer<typeof CampaignTypeSchema>;
export type CalendarSource = z.infer<typeof CalendarSourceSchema>;
export type CalendarEventType = z.infer<typeof CalendarEventTypeSchema>;
export type MeetingMode = z.infer<typeof MeetingModeSchema>;
export type MentorshipStatus = z.infer<typeof MentorshipStatusSchema>;
export type LedgerEntryType = z.infer<typeof LedgerEntryTypeSchema>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type AuditActorType = z.infer<typeof AuditActorTypeSchema>;
export type ModerationStatus = z.infer<typeof ModerationStatusSchema>;
export type BookmarkType = z.infer<typeof BookmarkTypeSchema>;
export type BookmarkCategory = z.infer<typeof BookmarkCategorySchema>;
