import { create } from 'zustand';
import type { IPrivacySettingsData } from '@shared/types/social';

interface PrivacyState {
  settings: IPrivacySettingsData | null;
  isLoading: boolean;
}

interface PrivacyActions {
  setSettings: (settings: IPrivacySettingsData) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

type PrivacyStore = PrivacyState & PrivacyActions;

export const usePrivacyStore = create<PrivacyStore>((set) => ({
  settings: null,
  isLoading: false,

  setSettings: (settings) => set({ settings }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ settings: null, isLoading: false }),
}));
