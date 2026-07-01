import type { MediaAsset, PublicUser } from './user.js';
import type { Message } from './message.js';

export type ConversationType = 'direct' | 'group' | 'channel' | 'workspace_channel';
export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface ConversationLastMessage {
  messageId: string;
  content: string;
  senderId: string;
  type: string;
  timestamp: string;
}

export interface Conversation {
  _id: string;
  type: ConversationType;
  participants?: string[];
  createdBy: string;
  lastMessage?: ConversationLastMessage;
  lastActivity: string;
  metadata: {
    name?: string;
    description?: string;
    avatar?: MediaAsset;
    isArchived: boolean;
    isPinned: boolean;
    isReadOnly: boolean;
  };
  status: 'active' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMember {
  _id: string;
  conversationId: string;
  userId: string;
  user?: PublicUser;
  role: MemberRole;
  joinedAt: string;
  leftAt?: string;
  lastReadMessageId?: string;
  lastReadAt?: string;
  unreadCount: number;
  notificationSettings: {
    muted: boolean;
    muteUntil?: string;
    mentionsOnly: boolean;
  };
}

export interface ConversationWithMeta extends Conversation {
  members?: ConversationMember[];
  messages?: Message[];
  myMembership?: ConversationMember;
}
