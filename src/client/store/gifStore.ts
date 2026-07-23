import { create } from 'zustand';

export interface GifItem {
  id: string;
  title: string;
  url: string; // GIF URL
  preview: string; // static preview image
  width: number;
  height: number;
}

interface GifState {
  trending: GifItem[];
  searchResults: GifItem[];
  searchQuery: string;
  isSearching: boolean;
  isLoadingTrend: boolean;
}
interface GifActions {
  setTrending: (gifs: GifItem[]) => void;
  setSearchResults: (gifs: GifItem[], query: string) => void;
  setSearching: (v: boolean) => void;
  setLoadingTrend: (v: boolean) => void;
  clearSearch: () => void;
  reset: () => void;
}

export const useGifStore = create<GifState & GifActions>()((set) => ({
  trending: [],
  searchResults: [],
  searchQuery: '',
  isSearching: false,
  isLoadingTrend: false,

  setTrending: (gifs) => set({ trending: gifs, isLoadingTrend: false }),
  setSearchResults: (gifs, query) =>
    set({ searchResults: gifs, searchQuery: query, isSearching: false }),
  setSearching: (v) => set({ isSearching: v }),
  setLoadingTrend: (v) => set({ isLoadingTrend: v }),
  clearSearch: () => set({ searchResults: [], searchQuery: '' }),
  reset: () =>
    set({
      trending: [],
      searchResults: [],
      searchQuery: '',
      isSearching: false,
      isLoadingTrend: false,
    }),
}));
