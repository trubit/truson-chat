import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useBlockingStore } from '@/store/blockingStore';
import type {
  BlockListQuery,
  BlockedListResult,
  MutedListResult,
  IBlockData,
  IMuteData,
  BlockUserDto,
  MuteUserDto,
} from '@shared/types/social';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const BLOCKING_KEYS = {
  blocked: (query?: BlockListQuery) => ['blocking', 'blocked', query] as const,
  muted: (query?: BlockListQuery) => ['blocking', 'muted', query] as const,
  status: (userId: string) => ['blocking', 'status', userId] as const,
};

// ─── Response wrappers ────────────────────────────────────────────────────────

interface BlockedListResponse {
  success: boolean;
  data: BlockedListResult;
}

interface MutedListResponse {
  success: boolean;
  data: MutedListResult;
}

interface BlockResponse {
  success: boolean;
  data: IBlockData;
}

interface MuteResponse {
  success: boolean;
  data: IMuteData;
}

interface BlockStatusResponse {
  success: boolean;
  data: { isBlocked: boolean; isMutedByMe: boolean };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useBlockedList(query?: BlockListQuery) {
  const setBlockedList = useBlockingStore((s) => s.setBlockedList);

  return useQuery({
    queryKey: BLOCKING_KEYS.blocked(query),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query?.page) params.set('page', String(query.page));
      if (query?.limit) params.set('limit', String(query.limit));

      const qs = params.toString();
      const res = await apiService.get<BlockedListResponse>(
        `/blocking${qs ? `?${qs}` : ''}`,
      );
      setBlockedList(res.data.blocks, res.data.meta);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMutedList(query?: BlockListQuery) {
  const setMutedList = useBlockingStore((s) => s.setMutedList);

  return useQuery({
    queryKey: BLOCKING_KEYS.muted(query),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query?.page) params.set('page', String(query.page));
      if (query?.limit) params.set('limit', String(query.limit));

      const qs = params.toString();
      const res = await apiService.get<MutedListResponse>(
        `/blocking/muted${qs ? `?${qs}` : ''}`,
      );
      setMutedList(res.data.mutes, res.data.meta);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCheckBlockStatus(userId: string) {
  return useQuery({
    queryKey: BLOCKING_KEYS.status(userId),
    queryFn: async () => {
      const res = await apiService.get<BlockStatusResponse>(`/blocking/${userId}/status`);
      return res.data;
    },
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useBlockUser() {
  const queryClient = useQueryClient();
  const addBlocked = useBlockingStore((s) => s.addBlocked);

  return useMutation({
    mutationFn: ({ userId, dto }: { userId: string; dto?: BlockUserDto }) =>
      apiService.post<BlockResponse>(`/blocking/${userId}`, dto ?? {}),
    onSuccess: (res, { userId }) => {
      addBlocked(res.data);
      queryClient.invalidateQueries({ queryKey: BLOCKING_KEYS.blocked() });
      queryClient.invalidateQueries({ queryKey: BLOCKING_KEYS.status(userId) });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  const removeBlocked = useBlockingStore((s) => s.removeBlocked);

  return useMutation({
    mutationFn: (userId: string) =>
      apiService.del<{ success: boolean }>(`/blocking/${userId}`),
    onSuccess: (_, userId) => {
      removeBlocked(userId);
      queryClient.invalidateQueries({ queryKey: BLOCKING_KEYS.blocked() });
      queryClient.invalidateQueries({ queryKey: BLOCKING_KEYS.status(userId) });
    },
  });
}

export function useMuteUser() {
  const queryClient = useQueryClient();
  const addMuted = useBlockingStore((s) => s.addMuted);

  return useMutation({
    mutationFn: ({ userId, dto }: { userId: string; dto?: MuteUserDto }) =>
      apiService.post<MuteResponse>(`/blocking/muted/${userId}`, dto ?? {}),
    onSuccess: (res, { userId }) => {
      addMuted(res.data);
      queryClient.invalidateQueries({ queryKey: BLOCKING_KEYS.muted() });
      queryClient.invalidateQueries({ queryKey: BLOCKING_KEYS.status(userId) });
    },
  });
}

export function useUnmuteUser() {
  const queryClient = useQueryClient();
  const removeMuted = useBlockingStore((s) => s.removeMuted);

  return useMutation({
    mutationFn: (userId: string) =>
      apiService.del<{ success: boolean }>(`/blocking/muted/${userId}`),
    onSuccess: (_, userId) => {
      removeMuted(userId);
      queryClient.invalidateQueries({ queryKey: BLOCKING_KEYS.muted() });
      queryClient.invalidateQueries({ queryKey: BLOCKING_KEYS.status(userId) });
    },
  });
}
