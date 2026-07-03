import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StickerItem {
  _id:       string;
  name:      string;
  url:       string;
  emoji?:    string;
  width:     number;
  height:    number;
  publicId?: string;
}

export interface StickerPack {
  _id:         string;
  name:        string;
  description?: string;
  coverUrl?:   string;
  stickers:    StickerItem[];
  isSystem:    boolean;
}

interface StickerState {
  packs:          StickerPack[];
  recentStickers: string[];  // sticker _ids, max 20
  isLoading:      boolean;
}
interface StickerActions {
  setPacks:       (packs: StickerPack[]) => void;
  useSticker:     (stickerId: string) => void;
  setLoading:     (v: boolean) => void;
  reset:          () => void;
}

export const useStickerStore = create<StickerState & StickerActions>()(
  persist(
    (set) => ({
      packs:          [],
      recentStickers: [],
      isLoading:      false,
      setPacks:    (packs)     => set({ packs }),
      useSticker:  (stickerId) => set((s) => ({
        recentStickers: [stickerId, ...s.recentStickers.filter((id) => id !== stickerId)].slice(0, 20),
      })),
      setLoading:  (v)         => set({ isLoading: v }),
      reset:       ()          => set({ packs: [], recentStickers: [], isLoading: false }),
    }),
    { name: 'truson-stickers', partialize: (s) => ({ recentStickers: s.recentStickers }) },
  ),
);
