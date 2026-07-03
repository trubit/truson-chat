// ---------------------------------------------------------------------------
// DTOs and response types for the conversations module
// ---------------------------------------------------------------------------

export interface CreateConversationDto {
  participantId: string; // for direct conversations
  type?: 'direct';       // only direct supported now
}

export interface UpdateConversationDto {
  name?: string;
  description?: string;
}

export interface MuteConversationDto {
  duration?: number; // minutes; undefined = indefinite
}

export interface MarkReadDto {
  messageId: string; // last-read message ID
}

export interface ConversationListQuery {
  page?: number;
  limit?: number;
  archived?: boolean;
}

export interface MemberProfile {
  userId: string;
  displayName: string;
  username: string;
  avatar?: string;
}

export interface ConversationResponse {
  _id: string;
  type: string;
  participants: string[];
  createdBy: string;
  lastMessage?: {
    messageId: string;
    senderId: string;
    content: string;
    type: string;
    sentAt: string;
  };
  lastActivity: string;
  metadata: {
    name?: string;
    description?: string;
    avatar?: { url: string; publicId: string };
    isReadOnly: boolean;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  // membership fields for this user
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  muteUntil?: string;
  myRole: string;
  // participant display info
  memberProfiles: MemberProfile[];
}
