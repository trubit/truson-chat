import { z } from 'zod';
import mongoose from 'mongoose';

const isObjectId = (v: string) => mongoose.isValidObjectId(v);

export const blockUserSchema = z.object({
  reason: z.string().max(200).optional(),
});

export const muteUserSchema = z.object({
  mutedNotifications: z.boolean().optional(),
  mutedMessages: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string().refine(isObjectId, 'Invalid user ID'),
});

export const blockListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
