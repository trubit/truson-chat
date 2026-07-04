import type { Message, SendMessagePayload, EditMessagePayload } from './message.js';
import type { Conversation } from './conversation.js';
import type { PublicUser } from './user.js';
import type {
  GroupSummary, GroupDetail, GroupMessage, GroupMemberSummary,
  GroupRoleSummary, GroupJoinRequestSummary, GroupInvitationSummary,
  CommunitySummary, ChannelSummary, AnnouncementSummary,
  SendGroupMessagePayload, EditGroupMessagePayload, DeleteGroupMessagePayload,
  ReactGroupMessagePayload,
} from './group.js';

// === SERVER → CLIENT EVENTS ===
export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:updated': (message: Pick<Message, '_id' | 'conversationId' | 'content' | 'editedAt'>) => void;
  'message:deleted': (payload: { messageId: string; conversationId: string }) => void;
  'message:reaction': (payload: {
    messageId: string;
    conversationId: string;
    emoji: string;
    userId: string;
    action: 'add' | 'remove';
  }) => void;
  'message:read': (payload: { conversationId: string; userId: string; messageId: string; readAt: string }) => void;
  'message:delivered': (payload: { messageId: string; conversationId: string }) => void;
  'typing:start': (payload: { conversationId: string; userId: string; user: Pick<PublicUser, '_id' | 'displayName'> }) => void;
  'typing:stop': (payload: { conversationId: string; userId: string }) => void;
  'presence:online': (payload: { userId: string }) => void;
  'presence:offline': (payload: { userId: string; lastSeen: string }) => void;
  'presence:updated': (payload: PresenceUpdateEvent) => void;
  'conversation:created': (conversation: Conversation) => void;
  'conversation:updated': (conversation: Partial<Conversation> & { _id: string }) => void;
  'notification:new': (notification: { title: string; body: string; data?: Record<string, unknown> }) => void;
  'friend:request_received': (payload: FriendRequestReceivedEvent) => void;
  'friend:request_accepted': (payload: FriendRequestAcceptedEvent) => void;
  error: (payload: { message: string; code?: string }) => void;

  // --- Groups ---
  'group:created':             (group: GroupSummary) => void;
  'group:updated':             (group: Partial<GroupDetail> & { _id: string }) => void;
  'group:deleted':             (payload: { groupId: string }) => void;
  'group:message:new':         (message: GroupMessage) => void;
  'group:message:updated':     (message: Pick<GroupMessage, '_id' | 'groupId' | 'content' | 'isEdited' | 'editedAt'>) => void;
  'group:message:deleted':     (payload: { messageId: string; groupId: string; deletedBy: string }) => void;
  'group:message:reaction':    (payload: { messageId: string; groupId: string; emoji: string; userId: string; action: 'add' | 'remove'; count: number }) => void;
  'group:message:read':        (payload: { groupId: string; userId: string; lastMessageId: string; lastReadAt: string }) => void;
  'group:typing:start':        (payload: { groupId: string; channelId?: string; userId: string; displayName: string }) => void;
  'group:typing:stop':         (payload: { groupId: string; channelId?: string; userId: string }) => void;
  'group:member:joined':       (payload: { groupId: string; member: GroupMemberSummary }) => void;
  'group:member:left':         (payload: { groupId: string; userId: string }) => void;
  'group:member:role_changed': (payload: { groupId: string; userId: string; role: GroupMemberSummary['role']; updatedBy: string }) => void;
  'group:member:banned':       (payload: { groupId: string; userId: string; bannedBy: string; reason?: string }) => void;
  'group:ban:lifted':          (payload: { groupId: string; userId: string; liftedBy: string }) => void;
  'group:role:created':        (role: GroupRoleSummary) => void;
  'group:role:updated':        (role: Partial<GroupRoleSummary> & { _id: string; groupId: string }) => void;
  'group:role:deleted':        (payload: { roleId: string; groupId: string }) => void;
  'group:invite:created':      (invite: GroupInvitationSummary) => void;
  'group:join_request:new':    (request: GroupJoinRequestSummary) => void;
  'group:join_request:updated':(request: GroupJoinRequestSummary) => void;
  'group:announcement:new':    (announcement: AnnouncementSummary) => void;
  'group:announcement:updated':(announcement: Partial<AnnouncementSummary> & { _id: string }) => void;

  // --- Communities ---
  'community:created':        (community: CommunitySummary) => void;
  'community:updated':        (community: Partial<CommunitySummary> & { _id: string }) => void;
  'community:deleted':        (payload: { communityId: string }) => void;
  'community:group:added':    (payload: { communityId: string; group: GroupSummary }) => void;
  'community:group:removed':  (payload: { communityId: string; groupId: string }) => void;

  // --- Channels ---
  'channel:created':  (channel: ChannelSummary) => void;
  'channel:updated':  (channel: Partial<ChannelSummary> & { _id: string }) => void;
  'channel:deleted':  (payload: { channelId: string; groupId: string }) => void;
}

// === CLIENT → SERVER EVENTS ===
export interface ClientToServerEvents {
  'message:send': (payload: SendMessagePayload, callback: (response: { success: boolean; messageId?: string; error?: string }) => void) => void;
  'message:edit': (payload: EditMessagePayload, callback: (response: { success: boolean; error?: string }) => void) => void;
  'message:delete': (payload: { messageId: string; conversationId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'message:react': (payload: { messageId: string; conversationId: string; emoji: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'message:read': (payload: { conversationId: string; messageId: string }) => void;
  'typing:start': (payload: { conversationId: string }) => void;
  'typing:stop': (payload: { conversationId: string }) => void;
  'presence:update': (payload: { status: 'online' | 'away' }) => void;
  'presence:set_status': (payload: SetStatusEvent) => void;
  'friend:notify_request': (payload: { recipientId: string }) => void;

  // --- Groups ---
  'group:join':           (payload: { groupId: string }, callback: (r: SocketAck) => void) => void;
  'group:leave':          (payload: { groupId: string }, callback: (r: SocketAck) => void) => void;
  'group:message:send':   (payload: SendGroupMessagePayload,   callback: (r: SocketAck & { message?: GroupMessage }) => void) => void;
  'group:message:edit':   (payload: EditGroupMessagePayload,   callback: (r: SocketAck) => void) => void;
  'group:message:delete': (payload: DeleteGroupMessagePayload, callback: (r: SocketAck) => void) => void;
  'group:message:react':  (payload: ReactGroupMessagePayload,  callback: (r: SocketAck) => void) => void;
  'group:message:read':   (payload: { groupId: string; lastMessageId: string }) => void;
  'group:typing:start':   (payload: { groupId: string; channelId?: string }) => void;
  'group:typing:stop':    (payload: { groupId: string; channelId?: string }) => void;

  // --- Channels ---
  'channel:join':  (payload: { channelId: string }, callback: (r: SocketAck) => void) => void;
  'channel:leave': (payload: { channelId: string }, callback: (r: SocketAck) => void) => void;
}

// === PRESENCE EVENT TYPES ===

export interface PresenceUpdateEvent {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy' | 'invisible';
  customStatus?: string;
  statusMessage?: string;
}

export interface SetStatusEvent {
  status: 'online' | 'offline' | 'away' | 'busy' | 'invisible';
  customStatus?: string;
  statusMessage?: string;
}

// === FRIEND EVENT TYPES ===

export interface FriendRequestReceivedEvent {
  senderId: string;
  senderUsername?: string;
  senderDisplayName?: string;
}

export interface FriendRequestAcceptedEvent {
  friendId: string;
  friendUsername?: string;
}

// === BLOCKING EVENT TYPES ===

export interface UserBlockedEvent {
  blockedId: string;
}

// === UTILITY ===

export interface SocketAck {
  success: boolean;
  error?:  string;
  code?:   string;
}
