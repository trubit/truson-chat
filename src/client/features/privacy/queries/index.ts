import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { usePrivacyStore } from '@/store/privacyStore';
import type {
  IPrivacySettingsData,
  UpdatePrivacyDto,
  PrivacyCheckResult,
} from '@shared/types/social';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const PRIVACY_KEYS = {
  settings: ['privacy', 'settings'] as const,
  check: (userId: string) => ['privacy', 'check', userId] as const,
};

// ─── Response wrappers ────────────────────────────────────────────────────────

interface PrivacySettingsResponse {
  success: boolean;
  data: IPrivacySettingsData;
}

interface PrivacyCheckResponse {
  success: boolean;
  data: PrivacyCheckResult;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function usePrivacySettings() {
  const setSettings = usePrivacyStore((s) => s.setSettings);

  return useQuery({
    queryKey: PRIVACY_KEYS.settings,
    queryFn: async () => {
      const res = await apiService.get<PrivacySettingsResponse>('/privacy');
      setSettings(res.data);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCheckPrivacy(userId: string) {
  return useQuery({
    queryKey: PRIVACY_KEYS.check(userId),
    queryFn: async () => {
      const res = await apiService.get<PrivacyCheckResponse>(`/privacy/check/${userId}`);
      return res.data;
    },
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();
  const setSettings = usePrivacyStore((s) => s.setSettings);

  return useMutation({
    mutationFn: (dto: UpdatePrivacyDto) =>
      apiService.patch<PrivacySettingsResponse>('/privacy', dto),
    onSuccess: (res) => {
      setSettings(res.data);
      queryClient.invalidateQueries({ queryKey: PRIVACY_KEYS.settings });
    },
  });
}
