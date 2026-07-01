import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const VISIBILITY_VALUES = ['everyone', 'contacts', 'nobody'] as const;

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z
    .string()
    .refine(
      (val) => val === '' || /^https?:\/\/.+/.test(val),
      'Website must be a valid URL or empty string',
    )
    .max(200)
    .optional(),
  statusMessage: z.string().max(100).optional(),
});

export const updatePrivacySchema = z.object({
  profileVisibility: z.enum(VISIBILITY_VALUES).optional(),
  lastSeenVisibility: z.enum(VISIBILITY_VALUES).optional(),
  profilePhotoVisibility: z.enum(VISIBILITY_VALUES).optional(),
  aboutVisibility: z.enum(VISIBILITY_VALUES).optional(),
});

export const userIdParamSchema = z.object({
  userId: z
    .string()
    .regex(OBJECT_ID_REGEX, 'Invalid user ID format'),
});

export const usernameParamSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_.\-]+$/, 'Username contains invalid characters'),
});

export const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().min(2).max(10).optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      inApp: z.boolean().optional(),
      sms: z.boolean().optional(),
      marketing: z.boolean().optional(),
    })
    .optional(),
  privacy: z
    .object({
      profileVisibility: z.string().optional(),
      lastSeenVisibility: z.string().optional(),
      readReceipts: z.boolean().optional(),
      onlineStatus: z.boolean().optional(),
    })
    .optional(),
  accessibility: z
    .object({
      fontSize: z.string().optional(),
      reducedMotion: z.boolean().optional(),
      highContrast: z.boolean().optional(),
    })
    .optional(),
  communication: z
    .object({
      autoDownloadMedia: z.boolean().optional(),
      soundEnabled: z.boolean().optional(),
      vibrationEnabled: z.boolean().optional(),
    })
    .optional(),
});
