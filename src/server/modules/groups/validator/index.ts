import { z } from 'zod';

const GROUP_TYPES = ['public', 'private', 'restricted'] as const;
const GROUP_MSG_TYPES = [
  'text',
  'image',
  'video',
  'audio',
  'file',
  'sticker',
  'gif',
  'location',
  'contact',
  'voice_note',
  'system',
  'announcement',
  'pinned',
] as const;

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  handle: z
    .string()
    .regex(/^[a-z0-9_]{3,32}$/, 'Handle must be 3-32 lowercase alphanumeric chars or underscores')
    .optional(),
  type: z.enum(GROUP_TYPES).default('public'),
  communityId: z.string().optional(),
  maxMembers: z.number().int().min(2).max(200_000).default(1024),
  categories: z.array(z.string().max(50)).max(10).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  settings: z
    .object({
      messagePermission: z.enum(['everyone', 'admins', 'owner']).optional(),
      invitePermission: z.enum(['everyone', 'admins', 'owner']).optional(),
      joinApprovalRequired: z.boolean().optional(),
      mediaPermission: z.enum(['everyone', 'admins', 'owner']).optional(),
      slowMode: z.boolean().optional(),
      slowModeSeconds: z.number().int().min(0).max(21600).optional(),
    })
    .optional(),
});

export const updateGroupSchema = createGroupSchema.partial().omit({ communityId: true });

export const groupQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  q: z.string().optional(),
  type: z.enum(GROUP_TYPES).optional(),
});

const mentionSchema = z.object({
  userId: z.string().min(1),
  offset: z.number().int().min(0),
  length: z.number().int().min(1),
});

const mediaSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  name: z.string().optional(),
  duration: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  thumbnail: z.string().optional(),
  waveform: z.array(z.number()).optional(),
});

export const sendGroupMessageSchema = z.object({
  groupId: z.string().min(1),
  channelId: z.string().optional(),
  type: z.enum(GROUP_MSG_TYPES).default('text'),
  content: z.string().max(10_000).default(''),
  replyTo: z.string().optional(),
  mentions: z.array(mentionSchema).optional(),
  media: z.array(mediaSchema).optional(),
});

export const editGroupMessageSchema = z.object({
  content: z.string().min(1).max(10_000),
});

export const reactGroupMessageSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export const groupMessageQuerySchema = z.object({
  groupId: z.string().min(1),
  channelId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(30),
  before: z.string().optional(),
  after: z.string().optional(),
});

export const markGroupReadSchema = z.object({
  groupId: z.string().min(1),
  lastMessageId: z.string().min(1),
});

export const pinMessageSchema = z.object({
  pin: z.boolean(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type GroupQueryInput = z.infer<typeof groupQuerySchema>;
export type SendGroupMessageInput = z.infer<typeof sendGroupMessageSchema>;
export type EditGroupMessageInput = z.infer<typeof editGroupMessageSchema>;
export type ReactGroupMessageInput = z.infer<typeof reactGroupMessageSchema>;
export type GroupMessageQueryInput = z.infer<typeof groupMessageQuerySchema>;
export type MarkGroupReadInput = z.infer<typeof markGroupReadSchema>;
