import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  type: z.enum(['text', 'image', 'video', 'audio', 'file', 'sticker', 'gif', 'location', 'contact', 'poll']),
  content: z.string().max(LIMITS.MAX_MESSAGE_LENGTH),
  replyTo: z.string().optional(),
  mentions: z.array(z.string()).max(50).optional(),
  media: z.array(z.string()).max(10).optional(),
});

export const editMessageSchema = z.object({
  messageId: z.string().min(1),
  content: z.string().min(1).max(LIMITS.MAX_MESSAGE_LENGTH),
});

export const reactMessageSchema = z.object({
  messageId: z.string().min(1),
  conversationId: z.string().min(1),
  emoji: z.string().min(1).max(8),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type ReactMessageInput = z.infer<typeof reactMessageSchema>;
