import { create } from 'zustand';
import type { DiscoveredUser, RecentSearch } from '@shared/types/social';

interface DiscoveryMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface DiscoveryState {
  searchResults: DiscoveredUser[];
  searchMeta: DiscoveryMeta;
  searchQuery: string;
  suggestions: DiscoveredUser[];
  recentSearches: RecentSearch[];
  isSearching: boolean;
}

interface DiscoveryActions {
  setSearchResults: (results: DiscoveredUser[], meta: DiscoveryMeta) => void;
  setSearchQuery: (query: string) => void;
  setSuggestions: (suggestions: DiscoveredUser[]) => void;
  setRecentSearches: (searches: RecentSearch[]) => void;
  clearRecentSearches: () => void;
  setSearching: (searching: boolean) => void;
  reset: () => void;
}

type DiscoveryStore = DiscoveryState & DiscoveryActions;

const emptyMeta: DiscoveryMeta = { page: 1, limit: 20, total: 0, hasMore: false };

export const useDiscoveryStore = create<DiscoveryStore>((set) => ({
  searchResults: [],
  searchMeta: emptyMeta,
  searchQuery: '',
  suggestions: [],
  recentSearches: [],
  isSearching: false,

  setSearchResults: (searchResults, meta) => set({ searchResults, searchMeta: meta }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSuggestions: (suggestions) => set({ suggestions }),

  setRecentSearches: (recentSearches) => set({ recentSearches }),

  clearRecentSearches: () => set({ recentSearches: [] }),

  setSearching: (isSearching) => set({ isSearching }),

  reset: () =>
    set({
      searchResults: [],
      searchMeta: emptyMeta,
      searchQuery: '',
      suggestions: [],
      recentSearches: [],
      isSearching: false,
    }),
}));
