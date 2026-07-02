import { z } from 'zod';
import mongoose from 'mongoose';

const isObjectId = (v: string) => mongoose.isValidObjectId(v);

export const updatePresenceSchema = z.object({
  status: z.enum(['online', 'offline', 'away', 'busy', 'invisible']).optional(),
  customStatus: z.string().max(100).nullable().optional(),
  statusMessage: z.string().max(200).nullable().optional(),
  statusExpiresAt: z.string().datetime().nullable().optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string().refine(isObjectId, 'Invalid user ID'),
});

export const batchPresenceSchema = z.object({
  userIds: z.array(z.string()).min(1).max(100),
});
