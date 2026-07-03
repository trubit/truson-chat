import type { IMessageMedia } from '../../../database/models/Message.js';

// ---------------------------------------------------------------------------
// DTOs and response types for the messages module
// ---------------------------------------------------------------------------

export type MsgTypeValues =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice_note'
  | 'file'
  | 'sticker'
  | 'gif'
  | 'location'
  | 'contact'
  | 'system'
  | 'call_ended';

export interface SendMessageDto {
  conversationId: string;
  type: MsgTypeValues;
  content: string;
  replyTo?: string;
  mentions?: string[];
  media?: IMessageMedia[];
}

export interface EditMessageDto {
  content: string;
}

export interface ReactDto {
  emoji: string; // max 10 chars
}

export interface MessageQuery {
  conversationId: string;
  limit?: number;
  before?: string; // messageId for cursor (fetch older)
  after?: string;  // messageId for cursor (fetch newer)
}

export interface MessageSearchQuery {
  q: string;
  conversationId?: string;
  page?: number;
  limit?: number;
}

export interface MessageResponse {
  _id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string;
  media: IMessageMedia[];
  replyTo?: MessageResponse | string;
  mentions: string[];
  reactions: { emoji: string; users: string[]; count: number }[];
  readBy: { userId: string; readAt: string }[];
  status: string;
  isEdited: boolean;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}
