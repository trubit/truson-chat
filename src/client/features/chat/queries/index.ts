import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useConversationStore } from '@/store/conversationStore';
import { useMessageStore } from '@/store/messageStore';
import type { ConversationWithMeta } from '@/store/conversationStore';
import type { Message } from '@shared/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ─── Conversations ────────────────────────────────────────────────────────────

export function useConversations(archived = false) {
  const setConversations = useConversationStore((s) => s.setConversations);
  return useQuery({
    queryKey: ['conversations', { archived }],
    queryFn: async () => {
      const res = await apiService.get<
        ApiResponse<{ conversations: ConversationWithMeta[]; total: number }>
      >(`/conversations?archived=${archived}&limit=50`);
      setConversations(res.data.conversations);
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () =>
      apiService.get<ApiResponse<ConversationWithMeta>>(`/conversations/${id!}`),
    enabled: Boolean(id),
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  const upsert = useConversationStore((s) => s.upsertConversation);
  return useMutation({
    mutationFn: (participantId: string) =>
      apiService.post<ApiResponse<ConversationWithMeta>>('/conversations', {
        participantId,
      }),
    onSuccess: (res) => {
      upsert(res.data);
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkRead() {
  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
    }: {
      conversationId: string;
      messageId: string;
    }) =>
      apiService.post<ApiResponse<null>>(
        `/conversations/${conversationId}/read`,
        { messageId },
      ),
  });
}

export function useArchiveConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiService.post<ApiResponse<null>>(`/conversations/${id}/archive`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function usePinConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: boolean }) =>
      apiService.post<ApiResponse<null>>(
        `/conversations/${id}/${pin ? 'pin' : 'unpin'}`,
        {},
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function useMessages(conversationId: string | null) {
  const setMessages = useMessageStore((s) => s.setMessages);
  const prependMessages = useMessageStore((s) => s.prependMessages);
  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const url = `/messages?conversationId=${conversationId!}&limit=30${
        pageParam ? `&before=${pageParam}` : ''
      }`;
      const res = await apiService.get<
        ApiResponse<{ messages: Message[]; hasMore: boolean }>
      >(url);
      const msgs = res.data.messages;
      const hasMore = res.data.hasMore;
      const cursor = msgs[msgs.length - 1]?._id;

      if (!pageParam) {
        // First page — set in store (reversed for display: oldest first)
        setMessages(conversationId!, [...msgs].reverse(), hasMore, cursor);
      } else {
        // Subsequent pages (older messages) — prepend reversed
        prependMessages(conversationId!, [...msgs].reverse(), hasMore, cursor);
      }
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.messages[lastPage.messages.length - 1]?._id;
    },
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(conversationId),
    staleTime: 0,
  });
}

export function useSendMessageMutation() {
  return useMutation({
    mutationFn: (data: {
      conversationId: string;
      content: string;
      type?: string;
      replyTo?: string;
    }) =>
      apiService.post<ApiResponse<Message>>('/messages', { type: 'text', ...data }),
  });
}

export function useSearchMessages(query: string, conversationId?: string) {
  return useQuery({
    queryKey: ['messages', 'search', query, conversationId],
    queryFn: () => {
      const params = new URLSearchParams({ q: query, limit: '20' });
      if (conversationId) params.set('conversationId', conversationId);
      return apiService.get<ApiResponse<{ messages: Message[]; total: number }>>(
        `/messages/search?${params.toString()}`,
      );
    },
    enabled: query.length >= 2,
    staleTime: 10_000,
  });
}
