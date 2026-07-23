import { create } from 'zustand';
import type { IFriendData, IFriendRequestData } from '@shared/types/social';

interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface FriendsState {
  friends: IFriendData[];
  friendsMeta: PaginatedMeta;
  receivedRequests: IFriendRequestData[];
  receivedMeta: PaginatedMeta;
  sentRequests: IFriendRequestData[];
  sentMeta: PaginatedMeta;
  isLoading: boolean;
}

interface FriendsActions {
  setFriends: (friends: IFriendData[], meta: PaginatedMeta) => void;
  addFriend: (friend: IFriendData) => void;
  removeFriend: (friendId: string) => void;
  setReceivedRequests: (requests: IFriendRequestData[], meta: PaginatedMeta) => void;
  setSentRequests: (requests: IFriendRequestData[], meta: PaginatedMeta) => void;
  addReceivedRequest: (request: IFriendRequestData) => void;
  addSentRequest: (request: IFriendRequestData) => void;
  removeRequest: (requestId: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

type FriendsStore = FriendsState & FriendsActions;

const emptyMeta: PaginatedMeta = { page: 1, limit: 20, total: 0, hasMore: false };

export const useFriendsStore = create<FriendsStore>((set) => ({
  friends: [],
  friendsMeta: emptyMeta,
  receivedRequests: [],
  receivedMeta: emptyMeta,
  sentRequests: [],
  sentMeta: emptyMeta,
  isLoading: false,

  setFriends: (friends, meta) => set({ friends, friendsMeta: meta }),

  addFriend: (friend) =>
    set((state) => ({
      friends: [friend, ...state.friends],
      friendsMeta: { ...state.friendsMeta, total: state.friendsMeta.total + 1 },
    })),

  removeFriend: (friendId) =>
    set((state) => ({
      friends: state.friends.filter((f) => f.friendId !== friendId),
      friendsMeta: { ...state.friendsMeta, total: Math.max(0, state.friendsMeta.total - 1) },
    })),

  setReceivedRequests: (receivedRequests, meta) => set({ receivedRequests, receivedMeta: meta }),

  setSentRequests: (sentRequests, meta) => set({ sentRequests, sentMeta: meta }),

  addReceivedRequest: (request) =>
    set((state) => ({
      receivedRequests: [request, ...state.receivedRequests],
      receivedMeta: { ...state.receivedMeta, total: state.receivedMeta.total + 1 },
    })),

  addSentRequest: (request) =>
    set((state) => ({
      sentRequests: [request, ...state.sentRequests],
      sentMeta: { ...state.sentMeta, total: state.sentMeta.total + 1 },
    })),

  removeRequest: (requestId) =>
    set((state) => ({
      receivedRequests: state.receivedRequests.filter((r) => r.id !== requestId),
      sentRequests: state.sentRequests.filter((r) => r.id !== requestId),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () =>
    set({
      friends: [],
      friendsMeta: emptyMeta,
      receivedRequests: [],
      receivedMeta: emptyMeta,
      sentRequests: [],
      sentMeta: emptyMeta,
      isLoading: false,
    }),
}));
