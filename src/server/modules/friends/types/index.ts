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
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
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
