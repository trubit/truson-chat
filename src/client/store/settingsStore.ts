import { create } from 'zustand';
import type { PreferencesResponse } from '@/types/auth';

interface SettingsState {
  preferences: PreferencesResponse | null;
  isLoading: boolean;
}

interface SettingsActions {
  setPreferences: (preferences: PreferencesResponse) => void;
  updatePreferences: (partial: Partial<PreferencesResponse>) => void;
  clearPreferences: () => void;
  setLoading: (loading: boolean) => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>((set) => ({
  preferences: null,
  isLoading: false,

  setPreferences: (preferences) => set({ preferences }),

  updatePreferences: (partial) =>
    set((state) => ({
      preferences: state.preferences ? { ...state.preferences, ...partial } : null,
    })),

  clearPreferences: () => set({ preferences: null }),

  setLoading: (isLoading) => set({ isLoading }),
}));
