import { create } from 'zustand';
import type { SessionResponse } from '@/types/auth';

interface SessionState {
  sessions: SessionResponse[];
  currentSessionId: string | null;
  isLoading: boolean;
}

interface SessionActions {
  setSessions: (sessions: SessionResponse[]) => void;
  setCurrentSessionId: (id: string | null) => void;
  removeSession: (id: string) => void;
  clearSessions: () => void;
  setLoading: (loading: boolean) => void;
}

type SessionStore = SessionState & SessionActions;

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: [],
  currentSessionId: null,
  isLoading: false,

  setSessions: (sessions) => set({ sessions }),

  setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),

  removeSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    })),

  clearSessions: () => set({ sessions: [], currentSessionId: null }),

  setLoading: (isLoading) => set({ isLoading }),
}));
