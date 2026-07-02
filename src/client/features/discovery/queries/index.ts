import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useDiscoveryStore } from '@/store/discoveryStore';
import type {
  UserSearchQuery,
  SearchResult,
  DiscoveredUser,
  RecentSearch,
} from '@shared/types/social';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const DISCOVERY_KEYS = {
  search: (query: UserSearchQuery) => ['discovery', 'search', query] as const,
  suggestions: (limit?: number) => ['discovery', 'suggestions', limit] as const,
  recent: ['discovery', 'recent'] as const,
};

// ─── Response wrappers ────────────────────────────────────────────────────────

interface SearchResponse {
  success: boolean;
  data: SearchResult;
}

interface SuggestionsResponse {
  success: boolean;
  data: DiscoveredUser[];
}

interface RecentSearchesResponse {
  success: boolean;
  data: RecentSearch[];
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useSearchUsers(query: UserSearchQuery, enabled = true) {
  const setSearchResults = useDiscoveryStore((s) => s.setSearchResults);
  const setSearchQuery = useDiscoveryStore((s) => s.setSearchQuery);

  return useQuery({
    queryKey: DISCOVERY_KEYS.search(query),
    queryFn: async () => {
      const params = new URLSearchParams({ q: query.q });
      if (query.page) params.set('page', String(query.page));
      if (query.limit) params.set('limit', String(query.limit));

      const res = await apiService.get<SearchResponse>(
        `/discovery/search?${params.toString()}`,
      );
      setSearchQuery(query.q);
      setSearchResults(res.data.users, res.data.meta);
      return res.data;
    },
    enabled: enabled && query.q.length > 0,
    staleTime: 30 * 1000,
  });
}

export function useSuggestions(limit?: number) {
  const setSuggestions = useDiscoveryStore((s) => s.setSuggestions);

  return useQuery({
    queryKey: DISCOVERY_KEYS.suggestions(limit),
    queryFn: async () => {
      const qs = limit ? `?limit=${limit}` : '';
      const res = await apiService.get<SuggestionsResponse>(`/discovery/suggestions${qs}`);
      setSuggestions(res.data);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentSearches() {
  const setRecentSearches = useDiscoveryStore((s) => s.setRecentSearches);

  return useQuery({
    queryKey: DISCOVERY_KEYS.recent,
    queryFn: async () => {
      const res = await apiService.get<RecentSearchesResponse>('/discovery/recent');
      setRecentSearches(res.data);
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useClearRecentSearches() {
  const queryClient = useQueryClient();
  const clearRecentSearches = useDiscoveryStore((s) => s.clearRecentSearches);

  return useMutation({
    mutationFn: () => apiService.del<{ success: boolean }>('/discovery/recent'),
    onSuccess: () => {
      clearRecentSearches();
      queryClient.invalidateQueries({ queryKey: DISCOVERY_KEYS.recent });
    },
  });
}
