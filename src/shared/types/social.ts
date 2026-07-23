// ─── Contacts ────────────────────────────────────────────────────────────────

export type ContactCategory = 'general' | 'work' | 'family' | 'friend' | 'other';

export interface IContactWithUser {
  id: string;
  contactUserId: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  notes?: string;
  category: ContactCategory;
  labels: string[];
  isFavorite: boolean;
  addedVia: string;
  createdAt: string;
}

export interface CreateContactDto {
  userId: string;
  displayName?: string;
  notes?: string;
  category?: ContactCategory;
  labels?: string[];
}

export interface UpdateContactDto {
  displayName?: string | null;
  notes?: string | null;
  category?: ContactCategory;
  labels?: string[];
}

export interface ContactListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: ContactCategory;
  isFavorite?: boolean;
  sort?: 'displayName' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface ContactListResult {
  contacts: IContactWithUser[];
  meta: PaginationMeta;
}

export interface ImportPrepResult {
  toAdd: string[];
  alreadyAdded: string[];
  notFound: string[];
  invalid: string[];
}

// ─── Friends ─────────────────────────────────────────────────────────────────

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

export interface IFriendRequestData {
  id: string;
  sender: { id: string; username: string; displayName: string; avatar?: string };
  recipient: { id: string; username: string; displayName: string; avatar?: string };
  status: FriendRequestStatus;
  message?: string;
  expiresAt: string;
  respondedAt?: string;
  createdAt: string;
}

export interface IFriendData {
  friendshipId: string;
  friendId: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  friendedAt: string;
}

export interface SendFriendRequestDto {
  userId: string;
  message?: string;
}

export interface FriendListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface FriendPaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface FriendshipStatusResult {
  areFriends: boolean;
  pendingRequest?: {
    id: string;
    direction: 'sent' | 'received';
    status: FriendRequestStatus;
    createdAt: string;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy' | 'invisible';

export interface IPresenceData {
  userId: string;
  status: PresenceStatus;
  customStatus?: string;
  statusMessage?: string;
  statusExpiresAt?: string;
  lastSeen: string;
}

export interface PublicPresenceData {
  userId: string;
  status: PresenceStatus;
  lastSeen?: string;
  customStatus?: string;
  statusMessage?: string;
}

export interface UpdatePresenceDto {
  status?: PresenceStatus;
  customStatus?: string | null;
  statusMessage?: string | null;
  statusExpiresAt?: string | null;
}

// ─── Privacy ──────────────────────────────────────────────────────────────────

export type VisibilityLevel = 'everyone' | 'contacts' | 'friends' | 'nobody';
export type LimitedVisibility = 'nobody' | 'contacts' | 'friends';
export type RequestVisibility = 'everyone' | 'contacts' | 'friends';

export interface IPrivacySettingsData {
  userId: string;
  profileVisibility: VisibilityLevel;
  phoneVisibility: LimitedVisibility;
  emailVisibility: LimitedVisibility;
  lastSeenVisibility: VisibilityLevel;
  onlineStatusVisibility: VisibilityLevel;
  friendRequestsFrom: RequestVisibility;
  searchVisibility: RequestVisibility;
  discoverable: boolean;
  allowContactFromEveryone: boolean;
}

export interface UpdatePrivacyDto {
  profileVisibility?: VisibilityLevel;
  phoneVisibility?: LimitedVisibility;
  emailVisibility?: LimitedVisibility;
  lastSeenVisibility?: VisibilityLevel;
  onlineStatusVisibility?: VisibilityLevel;
  friendRequestsFrom?: RequestVisibility;
  searchVisibility?: RequestVisibility;
  discoverable?: boolean;
  allowContactFromEveryone?: boolean;
}

export interface PrivacyCheckResult {
  canViewProfile: boolean;
  canViewPhone: boolean;
  canViewEmail: boolean;
  canViewLastSeen: boolean;
  canViewOnlineStatus: boolean;
  canSendFriendRequest: boolean;
  canFindInSearch: boolean;
  canAddContact: boolean;
}

// ─── Blocking ─────────────────────────────────────────────────────────────────

export interface IBlockData {
  id: string;
  blockedUser: { id: string; username: string; displayName: string; avatar?: string };
  reason?: string;
  createdAt: string;
}

export interface IMuteData {
  id: string;
  mutedUser: { id: string; username: string; displayName: string; avatar?: string };
  mutedNotifications: boolean;
  mutedMessages: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface BlockUserDto {
  reason?: string;
}

export interface MuteUserDto {
  mutedNotifications?: boolean;
  mutedMessages?: boolean;
  expiresAt?: string | null;
}

export interface BlockListQuery {
  page?: number;
  limit?: number;
}

export interface BlockedListResult {
  blocks: IBlockData[];
  meta: PaginationMeta;
}

export interface MutedListResult {
  mutes: IMuteData[];
  meta: PaginationMeta;
}

// ─── Discovery ────────────────────────────────────────────────────────────────

export interface DiscoveredUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  mutualFriendCount: number;
  isFriend: boolean;
  isContact: boolean;
  pendingRequest?: 'sent' | 'received';
}

export interface UserSearchQuery {
  q: string;
  page?: number;
  limit?: number;
}

export interface RecentSearch {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  searchedAt: string;
}

export interface SearchResult {
  users: DiscoveredUser[];
  meta: PaginationMeta;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
