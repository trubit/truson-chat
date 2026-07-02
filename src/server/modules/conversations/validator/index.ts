import { z } from 'zod';

// ---------------------------------------------------------------------------
// Conversation validators
// ---------------------------------------------------------------------------

export const createConversationSchema = z.object({
  participantId: z.string().min(1, 'participantId is required'),
});

export const muteConversationSchema = z.object({
  duration: z.number().int().positive().optional(),
});

export const markReadSchema = z.object({
  messageId: z.string().min(1, 'messageId is required'),
});

export const listConversationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  archived: z.coerce.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type MuteConversationInput = z.infer<typeof muteConversationSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
export type ListConversationsInput = z.infer<typeof listConversationsSchema>;
