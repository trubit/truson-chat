import { z } from 'zod';

export const shareLocationSchema = z.object({
  conversationId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  altitude: z.number().optional(),
  name: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
});

export type ShareLocationInput = z.infer<typeof shareLocationSchema>;
