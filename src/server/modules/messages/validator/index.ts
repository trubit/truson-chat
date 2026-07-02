import { z } from 'zod';

// ---------------------------------------------------------------------------
// Message validators
// ---------------------------------------------------------------------------

const MESSAGE_TYPES = [
  'text',
  'image',
  'video',
  'audio',
  'file',
  'sticker',
  'gif',
  'location',
  'contact',
  'system',
  'call_ended',
] as const;

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required'),
  type: z.enum(MESSAGE_TYPES).default('text'),
  content: z.string().max(10000),
  replyTo: z.string().optional(),
  mentions: z.array(z.string()).optional(),
});

export const editMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export const reactSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export const messageQuerySchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required'),
  limit: z.coerce.number().int().positive().max(50).default(30),
  before: z.string().optional(),
  after: z.string().optional(),
});

export const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  conversationId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const markReadSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required'),
  messageId: z.string().min(1, 'messageId is required'),
});

export const markDeliveredSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required'),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type ReactInput = z.infer<typeof reactSchema>;
export type MessageQueryInput = z.infer<typeof messageQuerySchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
export type MarkDeliveredInput = z.infer<typeof markDeliveredSchema>;
