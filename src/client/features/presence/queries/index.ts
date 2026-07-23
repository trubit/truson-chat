import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { usePresenceStore } from '@/store/presenceStore';
import type { IPresenceData, PublicPresenceData, UpdatePresenceDto } from '@shared/types/social';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const PRESENCE_KEYS = {
  own: ['presence', 'me'] as const,
  user: (userId: string) => ['presence', userId] as const,
  batch: (userIds: string[]) => ['presence', 'batch', userIds.join(',')] as const,
};

// ─── Response wrappers ────────────────────────────────────────────────────────

interface OwnPresenceResponse {
  success: boolean;
  data: IPresenceData;
}

interface PublicPresenceResponse {
  success: boolean;
  data: PublicPresenceData;
}

interface BatchPresenceResponse {
  success: boolean;
  data: PublicPresenceData[];
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useOwnPresence() {
  const setOwnPresence = usePresenceStore((s) => s.setOwnPresence);

  return useQuery({
    queryKey: PRESENCE_KEYS.own,
    queryFn: async () => {
      const res = await apiService.get<OwnPresenceResponse>('/presence/me');
      setOwnPresence(res.data);
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useUserPresence(userId: string) {
  const setPresence = usePresenceStore((s) => s.setPresence);

  return useQuery({
    queryKey: PRESENCE_KEYS.user(userId),
    queryFn: async () => {
      const res = await apiService.get<PublicPresenceResponse>(`/presence/${userId}`);
      setPresence(userId, res.data);
      return res.data;
    },
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useBatchPresence(userIds: string[]) {
  const setPresences = usePresenceStore((s) => s.setPresences);

  return useQuery({
    queryKey: PRESENCE_KEYS.batch(userIds),
    queryFn: async () => {
      const res = await apiService.post<BatchPresenceResponse>('/presence/batch', { userIds });
      setPresences(res.data);
      return res.data;
    },
    enabled: userIds.length > 0,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdatePresence() {
  const queryClient = useQueryClient();
  const setOwnPresence = usePresenceStore((s) => s.setOwnPresence);

  return useMutation({
    mutationFn: (dto: UpdatePresenceDto) =>
      apiService.patch<OwnPresenceResponse>('/presence/me', dto),
    onSuccess: (res) => {
      setOwnPresence(res.data);
      queryClient.invalidateQueries({ queryKey: PRESENCE_KEYS.own });
    },
  });
}
