import { create } from 'zustand';
import type { AnnouncementSummary } from '@shared/types';

interface AnnouncementState {
  announcements: Map<string, AnnouncementSummary[]>; // scopeKey → announcements
  isLoading:     boolean;
}

interface AnnouncementActions {
  setAnnouncements:  (scopeKey: string, announcements: AnnouncementSummary[]) => void;
  upsertAnnouncement:(scopeKey: string, announcement: AnnouncementSummary) => void;
  removeAnnouncement:(scopeKey: string, announcementId: string) => void;
  setLoading:        (v: boolean) => void;
  reset:             () => void;
}

type AnnouncementStore = AnnouncementState & AnnouncementActions;

// scopeKey = 'group:{id}' | 'community:{id}' | 'channel:{id}'

const initial: AnnouncementState = {
  announcements: new Map(),
  isLoading:     false,
};

export const useAnnouncementStore = create<AnnouncementStore>()((set, get) => ({
  ...initial,

  setAnnouncements: (scopeKey, announcements) => {
    const all = new Map(get().announcements);
    all.set(scopeKey, announcements);
    set({ announcements: all });
  },

  upsertAnnouncement: (scopeKey, announcement) => {
    const all = new Map(get().announcements);
    const existing = all.get(scopeKey) ?? [];
    const idx = existing.findIndex((a) => a._id === announcement._id);
    if (idx !== -1) existing[idx] = announcement; else existing.unshift(announcement);
    all.set(scopeKey, [...existing]);
    set({ announcements: all });
  },

  removeAnnouncement: (scopeKey, announcementId) => {
    const all = new Map(get().announcements);
    const existing = all.get(scopeKey) ?? [];
    all.set(scopeKey, existing.filter((a) => a._id !== announcementId));
    set({ announcements: all });
  },

  setLoading: (v) => set({ isLoading: v }),
  reset:      () => set(initial),
}));
