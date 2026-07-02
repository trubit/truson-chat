import { create } from 'zustand';
import type { PublicPresenceData, IPresenceData, PresenceStatus } from '@shared/types/social';

interface PresenceState {
  presences: Record<string, PublicPresenceData>;
  ownPresence: IPresenceData | null;
}

interface PresenceActions {
  setPresence: (userId: string, data: PublicPresenceData) => void;
  setPresences: (presences: PublicPresenceData[]) => void;
  setOwnPresence: (data: IPresenceData) => void;
  updateStatus: (userId: string, status: PresenceStatus) => void;
  removePresence: (userId: string) => void;
  reset: () => void;
}

type PresenceStore = PresenceState & PresenceActions;

export const usePresenceStore = create<PresenceStore>((set) => ({
  presences: {},
  ownPresence: null,

  setPresence: (userId, data) =>
    set((state) => ({
      presences: { ...state.presences, [userId]: data },
    })),

  setPresences: (presences) =>
    set((state) => {
      const updated = { ...state.presences };
      for (const p of presences) {
        updated[p.userId] = p;
      }
      return { presences: updated };
    }),

  setOwnPresence: (ownPresence) => set({ ownPresence }),

  updateStatus: (userId, status) =>
    set((state) => {
      const existing = state.presences[userId];
      if (!existing) return {};
      return {
        presences: {
          ...state.presences,
          [userId]: { ...existing, status },
        },
      };
    }),

  removePresence: (userId) =>
    set((state) => {
      const updated = { ...state.presences };
      delete updated[userId];
      return { presences: updated };
    }),

  reset: () => set({ presences: {}, ownPresence: null }),
}));
