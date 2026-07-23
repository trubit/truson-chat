import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  sidebarOpen: boolean;
}

interface ThemeActions {
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

type ThemeStore = ThemeState & ThemeActions;

const getSystemTheme = (): ThemeMode => {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: getSystemTheme(),
      sidebarOpen: true,

      toggleTheme: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),

      setTheme: (mode) => set({ mode }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    {
      name: 'linkora_theme',
      partialize: (state) => ({
        mode: state.mode,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);
