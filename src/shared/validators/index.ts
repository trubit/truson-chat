import { z } from 'zod';

/**
 * Common Zod schemas re-used across both client and server.
 */

// ── Identifiers ───────────────────────────────────────────────────────────────

/** Validates a 24-character hexadecimal MongoDB ObjectId string. */
export const objectIdSchema = z
  .string()
  .length(24)
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid MongoDB ObjectId');

/** Validates a UUID v4 string. */
export const uuidSchema = z.string().uuid('Must be a valid UUID v4');

// ── Pagination ────────────────────────────────────────────────────────────────

/** Query params for cursor- or page-based pagination. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ── Contact ───────────────────────────────────────────────────────────────────

/**
 * International phone number (E.164-ish).
 * Optional leading +, 7-15 digits, first digit 1-9.
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Must be a valid international phone number');

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Password strength: minimum 8 characters with at least one uppercase letter,
 * one lowercase letter, one digit, and one special character.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Username: 3-30 characters; letters, digits, underscores, dots, and hyphens only.
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(
    /^[a-zA-Z0-9_.-]+$/,
    'Username may only contain letters, numbers, underscores, dots, and hyphens',
  );
