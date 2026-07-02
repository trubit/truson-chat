import { z } from 'zod';
import mongoose from 'mongoose';

const isObjectId = (v: string) => mongoose.isValidObjectId(v);

export const sendFriendRequestSchema = z.object({
  userId: z.string().min(1).refine(isObjectId, 'Invalid user ID'),
  message: z.string().max(200).optional(),
});

export const requestIdParamSchema = z.object({
  requestId: z.string().refine(isObjectId, 'Invalid request ID'),
});

export const friendIdParamSchema = z.object({
  friendId: z.string().refine(isObjectId, 'Invalid friend ID'),
});

export const userIdParamSchema = z.object({
  userId: z.string().refine(isObjectId, 'Invalid user ID'),
});

export const friendListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
