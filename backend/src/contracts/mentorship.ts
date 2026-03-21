import { z } from 'zod';
import { MentorshipStatusSchema } from './enums';

export const MentorshipAvailabilitySchema = z.enum([
  'full-time',
  'part-time',
  'ad-hoc',
]);

export const MentorshipMentorSchema = z.object({
  userId: z.uuid(),
  profileId: z.uuid(),
  name: z.string(),
  company: z.string(),
  avatar: z.string().nullable().optional(),
  expertise: z.array(z.string()),
  experienceYears: z.number().int().nonnegative(),
  rating: z.number().nonnegative(),
  reviews: z.number().int().nonnegative(),
  mentees: z.number().int().nonnegative(),
  availability: MentorshipAvailabilitySchema,
  hourlyRate: z.number().nonnegative().optional(),
  bio: z.string(),
});

export const MentorshipMentorListSchema = z.object({
  items: z.array(MentorshipMentorSchema),
});

export const MentorshipRequestSchema = z.object({
  postId: z.uuid(),
  menteeUserId: z.uuid(),
  authorName: z.string(),
  company: z.string(),
  avatar: z.string().nullable().optional(),
  userType: z.enum(['sme', 'entrepreneur', 'investor', 'mentor', 'admin']),
  content: z.string(),
  expertise: z.array(z.string()),
  commitment: MentorshipAvailabilitySchema,
  duration: z.string(),
  createdAt: z.string(),
});

export const MentorshipRequestListSchema = z.object({
  items: z.array(MentorshipRequestSchema),
});

export const MyMentorshipSchema = z.object({
  id: z.uuid(),
  role: z.enum(['mentor', 'mentee']),
  status: MentorshipStatusSchema,
  counterpartUserId: z.uuid(),
  counterpartName: z.string(),
  counterpartCompany: z.string(),
  counterpartAvatar: z.string().nullable().optional(),
  expertise: z.array(z.string()),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  sessionsCompleted: z.number().int().nonnegative(),
  rating: z.number().int().min(1).max(5).optional(),
  review: z.string().nullable().optional(),
  sourcePostId: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const MyMentorshipListSchema = z.object({
  items: z.array(MyMentorshipSchema),
});

export const CreateMentorshipOfferRequestSchema = z.object({
  message: z.string().trim().max(2000).optional(),
});

export const UpdateMentorshipStatusRequestSchema = z.object({
  status: z.enum(['active', 'completed', 'cancelled']),
  rating: z.number().int().min(1).max(5).optional(),
  review: z.string().trim().max(2000).optional(),
  sessionsCompleted: z.number().int().min(0).optional(),
});

export type MentorshipAvailability = z.infer<typeof MentorshipAvailabilitySchema>;
export type MentorshipMentor = z.infer<typeof MentorshipMentorSchema>;
export type MentorshipMentorList = z.infer<typeof MentorshipMentorListSchema>;
export type MentorshipRequest = z.infer<typeof MentorshipRequestSchema>;
export type MentorshipRequestList = z.infer<typeof MentorshipRequestListSchema>;
export type MyMentorship = z.infer<typeof MyMentorshipSchema>;
export type MyMentorshipList = z.infer<typeof MyMentorshipListSchema>;
export type CreateMentorshipOfferRequest = z.infer<
  typeof CreateMentorshipOfferRequestSchema
>;
export type UpdateMentorshipStatusRequest = z.infer<
  typeof UpdateMentorshipStatusRequestSchema
>;
