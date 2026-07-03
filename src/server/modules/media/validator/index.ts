import { z } from 'zod';

export const mediaQuerySchema = z.object({
  conversationId: z.string().optional(),
  type:           z.enum(['image','video','audio','voice_note','document','gif','sticker']).optional(),
  page:           z.coerce.number().int().positive().default(1),
  limit:          z.coerce.number().int().min(1).max(100).default(20),
});

export type MediaQueryInput = z.infer<typeof mediaQuerySchema>;
