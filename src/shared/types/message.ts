import type { MediaAsset, PublicUser } from './user.js';

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'sticker'
  | 'gif'
  | 'location'
  | 'contact'
  | 'poll'
  | 'system'
  | 'call_ended';

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'deleted';

export interface MessageMedia extends MediaAsset {
  type: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  originalName?: string;
}

export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface ReadReceipt {
  userId: string;
  readAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  sender?: PublicUser;
  type: MessageType;
  content: string;
  media?: MessageMedia[];
  replyTo?: string | Message;
  mentions?: string[];
  reactions: MessageReaction[];
  readBy: ReadReceipt[];
  status: MessageStatus;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
}

export interface SendMessagePayload {
  conversationId: string;
  type: MessageType;
  content: string;
  replyTo?: string;
  mentions?: string[];
  media?: string[];
}

export interface EditMessagePayload {
  messageId: string;
  content: string;
}
