import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const deviceIdParamSchema = z.object({
  id: z.string().regex(OBJECT_ID_REGEX, 'Invalid ID'),
});

export const registerDeviceSchema = z.object({
  name: z.string().min(1, 'Device name is required').max(100),
  type: z.enum(['mobile', 'desktop', 'tablet', 'other']),
  platform: z.string().min(1, 'Platform is required').max(100),
  browser: z.string().max(100).optional(),
  fingerprint: z.string().max(256).optional(),
  pushToken: z.string().max(512).optional(),
});

export const trustDeviceSchema = z.object({
  trusted: z.boolean(),
});
