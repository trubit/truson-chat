import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useFriendsStore } from '@/store/friendsStore';
import type {
  FriendListQuery,
  FriendPaginatedResult,
  IFriendData,
  IFriendRequestData,
  SendFriendRequestDto,
  FriendshipStatusResult,
  PaginationQuery,
} from '@shared/types/social';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const FRIEND_KEYS = {
  all: ['friends'] as const,
  list: (query?: FriendListQuery) => ['friends', 'list', query] as const,
  received: (query?: PaginationQuery) => ['friends', 'requests', 'received', query] as const,
  sent: (query?: PaginationQuery) => ['friends', 'requests', 'sent', query] as const,
  status: (userId: string) => ['friends', 'status', userId] as const,
};

// ─── Response wrappers ────────────────────────────────────────────────────────

interface FriendListResponse {
  success: boolean;
  data: FriendPaginatedResult<IFriendData>;
}

interface RequestListResponse {
  success: boolean;
  data: FriendPaginatedResult<IFriendRequestData>;
}

interface FriendRequestResponse {
  success: boolean;
  data: IFriendRequestData;
}

interface FriendResponse {
  success: boolean;
  data: IFriendData;
}

interface FriendStatusResponse {
  success: boolean;
  data: FriendshipStatusResult;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useFriends(query?: FriendListQuery) {
  const setFriends = useFriendsStore((s) => s.setFriends);

  return useQuery({
    queryKey: FRIEND_KEYS.list(query),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query?.page) params.set('page', String(query.page));
      if (query?.limit) params.set('limit', String(query.limit));
      if (query?.search) params.set('search', query.search);

      const qs = params.toString();
      const res = await apiService.get<FriendListResponse>(
        `/friends${qs ? `?${qs}` : ''}`,
      );
      setFriends(res.data.items, res.data.meta);
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useReceivedRequests(query?: PaginationQuery) {
  const setReceived = useFriendsStore((s) => s.setReceivedRequests);

  return useQuery({
    queryKey: FRIEND_KEYS.received(query),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query?.page) params.set('page', String(query.page));
      if (query?.limit) params.set('limit', String(query.limit));

      const qs = params.toString();
      const res = await apiService.get<RequestListResponse>(
        `/friends/requests${qs ? `?${qs}` : ''}`,
      );
      setReceived(res.data.items, res.data.meta);
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useSentRequests(query?: PaginationQuery) {
  const setSent = useFriendsStore((s) => s.setSentRequests);

  return useQuery({
    queryKey: FRIEND_KEYS.sent(query),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query?.page) params.set('page', String(query.page));
      if (query?.limit) params.set('limit', String(query.limit));

      const qs = params.toString();
      const res = await apiService.get<RequestListResponse>(
        `/friends/requests/sent${qs ? `?${qs}` : ''}`,
      );
      setSent(res.data.items, res.data.meta);
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useFriendshipStatus(userId: string) {
  return useQuery({
    queryKey: FRIEND_KEYS.status(userId),
    queryFn: async () => {
      const res = await apiService.get<FriendStatusResponse>(`/friends/${userId}/status`);
      return res.data;
    },
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  const addSent = useFriendsStore((s) => s.addSentRequest);

  return useMutation({
    mutationFn: (dto: SendFriendRequestDto) =>
      apiService.post<FriendRequestResponse>('/friends/requests', dto),
    onSuccess: (res) => {
      addSent(res.data);
      queryClient.invalidateQueries({ queryKey: FRIEND_KEYS.sent() });
      queryClient.invalidateQueries({ queryKey: FRIEND_KEYS.status(res.data.recipient.id) });
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  const addFriend = useFriendsStore((s) => s.addFriend);
  const removeRequest = useFriendsStore((s) => s.removeRequest);

  return useMutation({
    mutationFn: (requestId: string) =>
      apiService.post<FriendResponse>(`/friends/requests/${requestId}/accept`),
    onSuccess: (res, requestId) => {
      addFriend(res.data);
      removeRequest(requestId);
      queryClient.invalidateQueries({ queryKey: FRIEND_KEYS.all });
    },
  });
}

export function useRejectFriendRequest() {
  const queryClient = useQueryClient();
  const removeRequest = useFriendsStore((s) => s.removeRequest);

  return useMutation({
    mutationFn: (requestId: string) =>
      apiService.post<{ success: boolean }>(`/friends/requests/${requestId}/reject`),
    onSuccess: (_, requestId) => {
      removeRequest(requestId);
      queryClient.invalidateQueries({ queryKey: FRIEND_KEYS.received() });
    },
  });
}

export function useCancelFriendRequest() {
  const queryClient = useQueryClient();
  const removeRequest = useFriendsStore((s) => s.removeRequest);

  return useMutation({
    mutationFn: (requestId: string) =>
      apiService.del<{ success: boolean }>(`/friends/requests/${requestId}`),
    onSuccess: (_, requestId) => {
      removeRequest(requestId);
      queryClient.invalidateQueries({ queryKey: FRIEND_KEYS.sent() });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  const removeFriend = useFriendsStore((s) => s.removeFriend);

  return useMutation({
    mutationFn: (friendId: string) =>
      apiService.del<{ success: boolean }>(`/friends/${friendId}`),
    onSuccess: (_, friendId) => {
      removeFriend(friendId);
      queryClient.invalidateQueries({ queryKey: FRIEND_KEYS.list() });
      queryClient.invalidateQueries({ queryKey: FRIEND_KEYS.status(friendId) });
    },
  });
}
