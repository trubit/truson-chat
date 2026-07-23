// ---------------------------------------------------------------------------
// Shared types for Phase 7 — Groups, Communities, Channels
// Used by both client and server (no Mongoose/Node-specific imports)
// ---------------------------------------------------------------------------

// ============ ENUMERATIONS ============

export type GroupType = 'public' | 'private' | 'restricted';
export type GroupStatus = 'active' | 'archived' | 'deleted';
export type InvitePermission = 'everyone' | 'admins' | 'owner';
export type MessagePermission = 'everyone' | 'admins' | 'owner';

export type GroupMemberRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';
export type GroupPermission =
  | 'send_messages'
  | 'send_media'
  | 'send_voice'
  | 'send_stickers'
  | 'send_gifs'
  | 'send_polls'
  | 'pin_messages'
  | 'delete_others_messages'
  | 'mute_members'
  | 'ban_members'
  | 'kick_members'
  | 'invite_members'
  | 'manage_group'
  | 'manage_channels'
  | 'manage_roles'
  | 'view_audit_log'
  | 'mention_everyone'
  | 'change_nickname'
  | 'read_message_history';

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
export type InvitationType = 'link' | 'direct';

export type CommunityType = 'public' | 'private';
export type CommunityStatus = 'active' | 'archived' | 'deleted';
export type CommunityMemberRole = 'owner' | 'admin' | 'moderator' | 'member';

export type ChannelType = 'text' | 'announcement' | 'voice' | 'stage';
export type ChannelStatus = 'active' | 'archived' | 'deleted';

export type AnnouncementScope = 'group' | 'community' | 'channel';
export type AnnouncementStatus = 'active' | 'scheduled' | 'expired' | 'deleted';

export type GroupMsgType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'sticker'
  | 'gif'
  | 'location'
  | 'contact'
  | 'voice_note'
  | 'system'
  | 'announcement'
  | 'pinned';

// ============ SETTINGS ============

export interface GroupSettings {
  messagePermission: MessagePermission;
  invitePermission: InvitePermission;
  joinApprovalRequired: boolean;
  mediaPermission: MessagePermission;
  pollPermission: MessagePermission;
  disappearingMessages: boolean;
  disappearingDuration: number; // seconds
  slowMode: boolean;
  slowModeSeconds: number;
  muteNotifications: boolean;
}

export interface CommunitySettings {
  joinApprovalRequired: boolean;
  invitePermission: 'everyone' | 'admins';
  discoverability: 'public' | 'link_only' | 'invite_only';
}

// ============ DTOs ============

export interface GroupAvatar {
  url: string;
  publicId: string;
}

export interface GroupSummary {
  _id: string;
  name: string;
  handle?: string;
  description?: string;
  type: GroupType;
  status: GroupStatus;
  avatar?: GroupAvatar;
  memberCount: number;
  communityId?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupDetail extends GroupSummary {
  coverImage?: GroupAvatar;
  maxMembers: number;
  settings: GroupSettings;
  categories: string[];
  tags: string[];
  inviteLink?: string;
  inviteLinkExpiry?: string;
  pinnedMessageIds: string[];
  createdBy: string;
  // viewer's membership info — null if not a member
  myMembership?: GroupMemberSummary | null;
}

export interface GroupMemberSummary {
  _id: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  customTitle?: string;
  status: 'active' | 'muted' | 'banned';
  joinedAt: string;
  mutedUntil?: string;
  lastReadAt?: string;
  // denormalized user info
  displayName: string;
  username?: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

export interface GroupRoleSummary {
  _id: string;
  groupId: string;
  name: string;
  color: string;
  permissions: GroupPermission[];
  isDefault: boolean;
  position: number;
}

export interface GroupMessageMedia {
  url: string;
  publicId?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
  name?: string;
  waveform?: number[];
}

export interface GroupMessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface GroupMention {
  userId: string;
  offset: number;
  length: number;
}

export interface GroupMessage {
  _id: string;
  groupId: string;
  channelId?: string;
  senderId: string;
  type: GroupMsgType;
  content: string;
  media: GroupMessageMedia[];
  replyTo?: string;
  mentions: GroupMention[];
  reactions: GroupMessageReaction[];
  status: 'sent' | 'deleted';
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: string;
  deletedAt?: string;
  readCount: number;
  createdAt: string;
  updatedAt: string;
  // populated by API
  sender?: { _id: string; displayName: string; avatarUrl?: string };
}

export interface GroupInvitationSummary {
  _id: string;
  groupId: string;
  type: InvitationType;
  status: InvitationStatus;
  token: string;
  invitedBy: string;
  inviteeId?: string;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  createdAt: string;
}

export interface GroupJoinRequestSummary {
  _id: string;
  groupId: string;
  userId: string;
  status: JoinRequestStatus;
  message?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectReason?: string;
  createdAt: string;
  // populated
  user?: { _id: string; displayName: string; avatarUrl?: string };
}

export interface CommunitySummary {
  _id: string;
  name: string;
  handle?: string;
  description?: string;
  type: CommunityType;
  status: CommunityStatus;
  avatar?: GroupAvatar;
  memberCount: number;
  groupCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityDetail extends CommunitySummary {
  coverImage?: GroupAvatar;
  rules?: string;
  settings: CommunitySettings;
  categories: string[];
  tags: string[];
  createdBy: string;
  myMembership?: CommunityMemberSummary | null;
  groups?: GroupSummary[];
}

export interface CommunityMemberSummary {
  _id: string;
  communityId: string;
  userId: string;
  role: CommunityMemberRole;
  joinedAt: string;
  displayName: string;
  avatarUrl?: string;
}

export interface ChannelSummary {
  _id: string;
  groupId: string;
  name: string;
  description?: string;
  type: ChannelType;
  status: ChannelStatus;
  position: number;
  isPrivate: boolean;
  slowModeSeconds: number;
  topic?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  // unread count for the viewer
  unreadCount?: number;
}

export interface AnnouncementSummary {
  _id: string;
  scope: AnnouncementScope;
  groupId?: string;
  communityId?: string;
  channelId?: string;
  authorId: string;
  title: string;
  content: string;
  status: AnnouncementStatus;
  isPinned: boolean;
  scheduledAt?: string;
  expiresAt?: string;
  publishedAt?: string;
  readCount: number;
  createdAt: string;
  updatedAt: string;
  author?: { _id: string; displayName: string; avatarUrl?: string };
}

// ============ API REQUEST PAYLOADS ============

export interface CreateGroupPayload {
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

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
  handle?: string;
  type?: GroupType;
  maxMembers?: number;
  settings?: Partial<GroupSettings>;
  categories?: string[];
  tags?: string[];
}

export interface SendGroupMessagePayload {
  groupId: string;
  channelId?: string;
  type?: GroupMsgType;
  content: string;
  replyTo?: string;
  mentions?: GroupMention[];
  media?: GroupMessageMedia[];
}

export interface EditGroupMessagePayload {
  messageId: string;
  groupId: string;
  content: string;
}

export interface DeleteGroupMessagePayload {
  messageId: string;
  groupId: string;
}

export interface ReactGroupMessagePayload {
  messageId: string;
  groupId: string;
  emoji: string;
}

export interface CreateInvitePayload {
  groupId: string;
  type: InvitationType;
  inviteeId?: string; // for direct invites
  maxUses?: number;
  expiresAt?: string;
}

export interface ReviewJoinRequestPayload {
  requestId: string;
  action: 'approve' | 'reject';
  rejectReason?: string;
}

export interface UpdateMemberRolePayload {
  groupId: string;
  userId: string;
  role: GroupMemberRole;
}

export interface BanMemberPayload {
  groupId: string;
  userId: string;
  reason?: string;
  expiresAt?: string;
}

export interface CreateCommunityPayload {
  name: string;
  description?: string;
  handle?: string;
  type: CommunityType;
  settings?: Partial<CommunitySettings>;
  categories?: string[];
  tags?: string[];
}

export interface UpdateCommunityPayload {
  name?: string;
  description?: string;
  handle?: string;
  rules?: string;
  type?: CommunityType;
  settings?: Partial<CommunitySettings>;
  categories?: string[];
  tags?: string[];
}

export interface CreateChannelPayload {
  groupId: string;
  name: string;
  description?: string;
  type: ChannelType;
  isPrivate?: boolean;
  slowModeSeconds?: number;
  topic?: string;
  position?: number;
}

export interface UpdateChannelPayload {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  slowModeSeconds?: number;
  topic?: string;
  position?: number;
}

export interface CreateAnnouncementPayload {
  scope: AnnouncementScope;
  groupId?: string;
  communityId?: string;
  channelId?: string;
  title: string;
  content: string;
  isPinned?: boolean;
  scheduledAt?: string;
  expiresAt?: string;
}

// ============ API RESPONSE WRAPPERS ============

export interface PaginatedGroups {
  groups: GroupSummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginatedGroupMessages {
  messages: GroupMessage[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginatedGroupMembers {
  members: GroupMemberSummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginatedCommunities {
  communities: CommunitySummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginatedChannels {
  channels: ChannelSummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginatedAnnouncements {
  announcements: AnnouncementSummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
