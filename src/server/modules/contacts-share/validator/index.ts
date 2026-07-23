import { z } from 'zod';

export const createSharedContactSchema = z.object({
  conversationId: z.string().min(1),
  displayName: z.string().min(1).max(200),
  phones: z
    .array(
      z.object({
        number: z.string().min(1),
        type: z.enum(['mobile', 'home', 'work', 'other']),
      }),
    )
    .min(1),
  emails: z
    .array(
      z.object({
        email: z.string().email(),
        type: z.enum(['personal', 'work', 'other']),
      }),
    )
    .optional(),
  avatar: z.string().url().optional(),
  note: z.string().max(500).optional(),
});

export type CreateSharedContactInput = z.infer<typeof createSharedContactSchema>;
