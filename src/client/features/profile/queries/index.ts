import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useProfileStore } from '@/store/profileStore';
import { useSettingsStore } from '@/store/settingsStore';
import type {
  ProfileResponse,
  PreferencesResponse,
  UpdateProfileInput,
  UpdatePrivacyInput,
  UpdatePreferencesInput,
} from '@/types/auth';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const PROFILE_KEYS = {
  me: ['profile', 'me'] as const,
  user: (userId: string) => ['profile', userId] as const,
  preferences: ['profile', 'preferences'] as const,
};

// ---------------------------------------------------------------------------
// Response wrappers
// ---------------------------------------------------------------------------

interface ProfileApiResponse {
  success: boolean;
  data: ProfileResponse;
}

interface PreferencesApiResponse {
  success: boolean;
  data: PreferencesResponse;
}

// ---------------------------------------------------------------------------
// Get own profile
// ---------------------------------------------------------------------------

export function useGetOwnProfile() {
  const setProfile = useProfileStore((s) => s.setProfile);

  return useQuery({
    queryKey: PROFILE_KEYS.me,
    queryFn: async () => {
      const response = await apiService.get<ProfileApiResponse>('/profile/me');
      setProfile(response.data);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Get another user's profile
// ---------------------------------------------------------------------------

export function useGetProfile(userId: string) {
  return useQuery({
    queryKey: PROFILE_KEYS.user(userId),
    queryFn: async () => {
      const response = await apiService.get<ProfileApiResponse>(`/profile/${userId}`);
      return response.data;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Update profile
// ---------------------------------------------------------------------------

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setProfile = useProfileStore((s) => s.setProfile);

  return useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      apiService.patch<ProfileApiResponse>('/profile', data),
    onSuccess: (response) => {
      setProfile(response.data);
      queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.me });
    },
  });
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const setProfile = useProfileStore((s) => s.setProfile);

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return apiService.post<ProfileApiResponse>('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (response) => {
      setProfile(response.data);
      queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.me });
    },
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  const setProfile = useProfileStore((s) => s.setProfile);

  return useMutation({
    mutationFn: () => apiService.del<ProfileApiResponse>('/profile/avatar'),
    onSuccess: (response) => {
      setProfile(response.data);
      queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.me });
    },
  });
}

// ---------------------------------------------------------------------------
// Cover image
// ---------------------------------------------------------------------------

export function useUploadCoverImage() {
  const queryClient = useQueryClient();
  const setProfile = useProfileStore((s) => s.setProfile);

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('cover', file);
      return apiService.post<ProfileApiResponse>('/profile/cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (response) => {
      setProfile(response.data);
      queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.me });
    },
  });
}

export function useRemoveCoverImage() {
  const queryClient = useQueryClient();
  const setProfile = useProfileStore((s) => s.setProfile);

  return useMutation({
    mutationFn: () => apiService.del<ProfileApiResponse>('/profile/cover'),
    onSuccess: (response) => {
      setProfile(response.data);
      queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.me });
    },
  });
}

// ---------------------------------------------------------------------------
// Privacy settings
// ---------------------------------------------------------------------------

export function useUpdatePrivacy() {
  const queryClient = useQueryClient();
  const setProfile = useProfileStore((s) => s.setProfile);

  return useMutation({
    mutationFn: (data: UpdatePrivacyInput) =>
      apiService.patch<ProfileApiResponse>('/profile/privacy', data),
    onSuccess: (response) => {
      setProfile(response.data);
      queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.me });
    },
  });
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export function useGetPreferences() {
  const setPreferences = useSettingsStore((s) => s.setPreferences);

  return useQuery({
    queryKey: PROFILE_KEYS.preferences,
    queryFn: async () => {
      const response = await apiService.get<PreferencesApiResponse>('/profile/preferences');
      setPreferences(response.data);
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  const setPreferences = useSettingsStore((s) => s.setPreferences);

  return useMutation({
    mutationFn: (data: UpdatePreferencesInput) =>
      apiService.patch<PreferencesApiResponse>('/profile/preferences', data),
    onSuccess: (response) => {
      setPreferences(response.data);
      queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.preferences });
    },
  });
}
