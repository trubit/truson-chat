import type { PublicUser } from './user.js';

type NewType =
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
  | 'voice_note'
  | 'system'
  | 'call_ended';

export type MessageType = NewType;

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'deleted';

export interface MessageMedia {
  url: string;
  publicId?: string;
  mimeType?: string;
  type?: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  originalName?: string;
  waveform?: number[];
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
  media?: MessageMedia[];
}

export interface EditMessagePayload {
  messageId: string;
  content: string;
}
