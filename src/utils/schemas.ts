import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(1, 'Name is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const transcriptSegmentSchema = z.object({
  timestamp: z.string().regex(/^\d{2,}:\d{2}$/, 'Timestamp must be in MM:SS or HH:MM:SS format'),
  speaker: z.string().min(1, 'Speaker is required'),
  text: z.string().min(1, 'Text content is required'),
});

export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Meeting title is required'),
  participants: z.array(z.string().email('Invalid participant email')).min(1, 'At least one participant is required'),
  meetingDate: z.string().datetime({ message: 'Invalid ISO date-time string (e.g. 2026-05-20T10:00:00Z)' }),
  transcript: z.array(transcriptSegmentSchema).min(1, 'Transcript must contain at least one segment'),
});

export const listMeetingsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a positive integer').optional().default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').optional().default('10'),
});

export const citationSchema = z.object({
  timestamp: z.string().regex(/^\d{2,}:\d{2}$/, 'Timestamp must be in MM:SS or HH:MM:SS format'),
});

export const createActionItemSchema = z.object({
  task: z.string().min(1, 'Task description is required'),
  assignee: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().datetime({ message: 'Invalid ISO date-time string for due date' }),
  meetingId: z.string().uuid('Invalid meeting ID (must be a valid UUID)'),
  citations: z.array(citationSchema).optional().default([]),
});

export const updateActionItemStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
});

export const getActionItemsQuerySchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
  assignee: z.string().optional(),
  meetingId: z.string().uuid('Invalid meeting ID').optional(),
});
