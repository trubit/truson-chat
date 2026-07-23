import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useStickerStore } from '@/store/stickerStore';
import { useGifStore } from '@/store/gifStore';
import type { StickerPack } from '@/store/stickerStore';
import type { GifItem } from '@/store/gifStore';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export function useStickerPacks() {
  const setPacks = useStickerStore((s) => s.setPacks);
  return useQuery({
    queryKey: ['stickers', 'packs'],
    queryFn: async () => {
      const res = await apiService.get<ApiResponse<{ packs: StickerPack[] }>>('/stickers/packs');
      setPacks(res.data.packs);
      return res.data.packs;
    },
    staleTime: 5 * 60_000,
  });
}

export function useTrendingGifs() {
  const setTrending = useGifStore((s) => s.setTrending);
  return useQuery({
    queryKey: ['gifs', 'trending'],
    queryFn: async () => {
      const res = await apiService.get<ApiResponse<{ gifs: GifItem[] }>>('/gifs/trending');
      setTrending(res.data.gifs);
      return res.data.gifs;
    },
    staleTime: 10 * 60_000,
  });
}

export function useGifSearch(query: string) {
  return useQuery({
    queryKey: ['gifs', 'search', query],
    queryFn: () =>
      apiService.get<ApiResponse<{ gifs: GifItem[] }>>(
        `/gifs/search?q=${encodeURIComponent(query)}`,
      ),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

export function useConversationMedia(conversationId: string | null, type?: string) {
  return useQuery({
    queryKey: ['media', conversationId, type],
    queryFn: () => {
      const params = new URLSearchParams({ conversationId: conversationId! });
      if (type) params.set('type', type);
      return apiService.get<ApiResponse<unknown>>(`/media?${params.toString()}`);
    },
    enabled: Boolean(conversationId),
    staleTime: 60_000,
  });
}
