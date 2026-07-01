import { create } from 'zustand';
import type { SecurityLogResponse, SecurityOverview } from '@/types/auth';

interface SecurityState {
  logs: SecurityLogResponse[];
  overview: SecurityOverview | null;
  isLoading: boolean;
}

interface SecurityActions {
  setLogs: (logs: SecurityLogResponse[]) => void;
  setOverview: (overview: SecurityOverview) => void;
  clearSecurity: () => void;
  setLoading: (loading: boolean) => void;
}

type SecurityStore = SecurityState & SecurityActions;

export const useSecurityStore = create<SecurityStore>((set) => ({
  logs: [],
  overview: null,
  isLoading: false,

  setLogs: (logs) => set({ logs }),

  setOverview: (overview) => set({ overview }),

  clearSecurity: () => set({ logs: [], overview: null }),

  setLoading: (isLoading) => set({ isLoading }),
}));
