import type {
  GroupMsgType,
  GroupPermission,
  GroupMemberRole,
  GroupType,
  GroupStatus,
  InvitePermission,
  MessagePermission,
} from '../../../../shared/types/group.js';

// Re-export shared types that the module uses internally
export type { GroupMsgType, GroupPermission, GroupMemberRole, GroupType, GroupStatus };

export interface GroupSettings {
  messagePermission: MessagePermission;
  invitePermission: InvitePermission;
  joinApprovalRequired: boolean;
  mediaPermission: MessagePermission;
  pollPermission: MessagePermission;
  disappearingMessages: boolean;
  disappearingDuration: number;
  slowMode: boolean;
  slowModeSeconds: number;
  muteNotifications: boolean;
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  handle?: string;
  type: GroupType;
  communityId?: string;
  maxMembers?: number;
  settings?: Partial<GroupSettings>;
  categories?: string[];
  tags?: string[];
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  handle?: string;
  type?: GroupType;
  maxMembers?: number;
  settings?: Partial<GroupSettings>;
  categories?: string[];
  tags?: string[];
}

export interface GroupQuery {
  page?: number;
  limit?: number;
  q?: string;
  type?: GroupType;
  status?: GroupStatus;
}

export interface SendGroupMessageDto {
  groupId: string;
  channelId?: string;
  type?: GroupMsgType;
  content: string;
  replyTo?: string;
  mentions?: { userId: string; offset: number; length: number }[];
  media?: {
    url: string;
    publicId?: string;
    mimeType?: string;
    size?: number;
    name?: string;
    duration?: number;
    width?: number;
    height?: number;
    thumbnail?: string;
    waveform?: number[];
  }[];
}

export interface GroupMessageQuery {
  groupId: string;
  channelId?: string;
  limit?: number;
  before?: string;
  after?: string;
}
