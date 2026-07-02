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

export interface SuggestionQuery {
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
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
