import { z } from 'zod';
import mongoose from 'mongoose';

const isObjectId = (v: string) => mongoose.isValidObjectId(v);

const CATEGORY_VALUES = ['general', 'work', 'family', 'friend', 'other'] as const;

export const createContactSchema = z.object({
  userId: z.string().min(1).refine(isObjectId, 'Invalid user ID'),
  displayName: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  labels: z.array(z.string().max(50)).max(10).optional(),
});

export const updateContactSchema = z.object({
  displayName: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  labels: z.array(z.string().max(50)).max(10).optional(),
});

export const contactListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  isFavorite: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  sort: z.enum(['displayName', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const contactSearchSchema = z.object({
  q: z.string().min(1).max(100),
});

export const contactIdParamSchema = z.object({
  contactId: z.string().refine(isObjectId, 'Invalid contact ID'),
});

export const importPrepSchema = z.object({
  userIds: z.array(z.string()).min(1).max(500),
});
