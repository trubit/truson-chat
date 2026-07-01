import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['user', 'admin', 'business']).optional(),
  status: z.enum(['active', 'suspended', 'deleted', 'pending_verification']).optional(),
  sort: z.enum(['createdAt', 'username', 'lastSeen']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, digits, _, ., and -')
    .optional(),
  phone: z
    .string()
    .refine(
      (val) => val === '' || /^\+[1-9]\d{6,14}$/.test(val),
      'Phone must be in E.164 format or empty string to remove',
    )
    .optional(),
});

export const userIdParamSchema = z.object({
  id: z
    .string()
    .regex(OBJECT_ID_REGEX, 'Invalid user ID format'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'deleted']),
  reason: z.string().max(500).optional(),
});
