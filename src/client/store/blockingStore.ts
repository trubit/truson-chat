import { create } from 'zustand';
import type { IBlockData, IMuteData } from '@shared/types/social';

interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface BlockingState {
  blocked: IBlockData[];
  blockedMeta: PaginatedMeta;
  muted: IMuteData[];
  mutedMeta: PaginatedMeta;
}

interface BlockingActions {
  setBlockedList: (blocked: IBlockData[], meta: PaginatedMeta) => void;
  addBlocked: (block: IBlockData) => void;
  removeBlocked: (userId: string) => void;
  setMutedList: (muted: IMuteData[], meta: PaginatedMeta) => void;
  addMuted: (mute: IMuteData) => void;
  removeMuted: (userId: string) => void;
  reset: () => void;
}

type BlockingStore = BlockingState & BlockingActions;

const emptyMeta: PaginatedMeta = { page: 1, limit: 20, total: 0, hasMore: false };

export const useBlockingStore = create<BlockingStore>((set) => ({
  blocked: [],
  blockedMeta: emptyMeta,
  muted: [],
  mutedMeta: emptyMeta,

  setBlockedList: (blocked, meta) => set({ blocked, blockedMeta: meta }),

  addBlocked: (block) =>
    set((state) => ({
      blocked: [block, ...state.blocked],
      blockedMeta: { ...state.blockedMeta, total: state.blockedMeta.total + 1 },
    })),

  removeBlocked: (userId) =>
    set((state) => ({
      blocked: state.blocked.filter((b) => b.blockedUser.id !== userId),
      blockedMeta: { ...state.blockedMeta, total: Math.max(0, state.blockedMeta.total - 1) },
    })),

  setMutedList: (muted, meta) => set({ muted, mutedMeta: meta }),

  addMuted: (mute) =>
    set((state) => ({
      muted: [mute, ...state.muted],
      mutedMeta: { ...state.mutedMeta, total: state.mutedMeta.total + 1 },
    })),

  removeMuted: (userId) =>
    set((state) => ({
      muted: state.muted.filter((m) => m.mutedUser.id !== userId),
      mutedMeta: { ...state.mutedMeta, total: Math.max(0, state.mutedMeta.total - 1) },
    })),

  reset: () =>
    set({ blocked: [], blockedMeta: emptyMeta, muted: [], mutedMeta: emptyMeta }),
}));
