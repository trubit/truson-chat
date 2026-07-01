import { create } from 'zustand';
import type { ProfileResponse } from '@/types/auth';

interface ProfileState {
  profile: ProfileResponse | null;
  isLoading: boolean;
}

interface ProfileActions {
  setProfile: (profile: ProfileResponse) => void;
  clearProfile: () => void;
  setLoading: (loading: boolean) => void;
}

type ProfileStore = ProfileState & ProfileActions;

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  isLoading: false,

  setProfile: (profile) => set({ profile }),

  clearProfile: () => set({ profile: null }),

  setLoading: (isLoading) => set({ isLoading }),
}));
