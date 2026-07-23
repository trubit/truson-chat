import { create } from 'zustand';
import type { Conversation } from '@shared/types';

export interface MemberProfile {
  userId: string;
  displayName: string;
  username: string;
  avatar?: string;
}

// Extended conversation with membership data from API
export interface ConversationWithMeta extends Conversation {
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  myRole: string;
  memberProfiles?: MemberProfile[];
}

interface ConversationState {
  conversations: Map<string, ConversationWithMeta>;
  orderedIds: string[]; // sorted by lastActivity desc
  activeConversationId: string | null;
  totalUnread: number;
  isLoading: boolean;
}

interface ConversationActions {
  setConversations: (convs: ConversationWithMeta[]) => void;
  upsertConversation: (conv: ConversationWithMeta) => void;
  setActiveConversation: (id: string | null) => void;
  updateLastMessage: (conversationId: string, lastMessage: Conversation['lastMessage']) => void;
  incrementUnread: (conversationId: string) => void;
  resetUnread: (conversationId: string) => void;
  removeConversation: (id: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

type ConversationStore = ConversationState & ConversationActions;

function computeTotalUnread(conversations: Map<string, ConversationWithMeta>): number {
  let total = 0;
  for (const conv of conversations.values()) {
    total += conv.unreadCount;
  }
  return total;
}

function sortedIds(conversations: Map<string, ConversationWithMeta>): string[] {
  return Array.from(conversations.values())
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
    .map((c) => c._id);
}

const initialState: ConversationState = {
  conversations: new Map(),
  orderedIds: [],
  activeConversationId: null,
  totalUnread: 0,
  isLoading: false,
};

export const useConversationStore = create<ConversationStore>()((set) => ({
  ...initialState,

  setConversations: (convs) => {
    const map = new Map<string, ConversationWithMeta>();
    for (const c of convs) {
      map.set(c._id, c);
    }
    set({
      conversations: map,
      orderedIds: sortedIds(map),
      totalUnread: computeTotalUnread(map),
    });
  },

  upsertConversation: (conv) => {
    set((state) => {
      const updated = new Map(state.conversations);
      updated.set(conv._id, conv);
      return {
        conversations: updated,
        orderedIds: sortedIds(updated),
        totalUnread: computeTotalUnread(updated),
      };
    });
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  updateLastMessage: (conversationId, lastMessage) => {
    set((state) => {
      const existing = state.conversations.get(conversationId);
      if (!existing) return {};
      const updated = new Map(state.conversations);
      updated.set(conversationId, {
        ...existing,
        lastMessage,
        lastActivity: lastMessage?.timestamp ?? existing.lastActivity,
      });
      return {
        conversations: updated,
        orderedIds: sortedIds(updated),
      };
    });
  },

  incrementUnread: (conversationId) => {
    set((state) => {
      const existing = state.conversations.get(conversationId);
      if (!existing) return {};
      const updated = new Map(state.conversations);
      updated.set(conversationId, {
        ...existing,
        unreadCount: existing.unreadCount + 1,
      });
      return {
        conversations: updated,
        totalUnread: state.totalUnread + 1,
      };
    });
  },

  resetUnread: (conversationId) => {
    set((state) => {
      const existing = state.conversations.get(conversationId);
      if (!existing || existing.unreadCount === 0) return {};
      const updated = new Map(state.conversations);
      const prev = existing.unreadCount;
      updated.set(conversationId, { ...existing, unreadCount: 0 });
      return {
        conversations: updated,
        totalUnread: Math.max(0, state.totalUnread - prev),
      };
    });
  },

  removeConversation: (id) => {
    set((state) => {
      const updated = new Map(state.conversations);
      updated.delete(id);
      return {
        conversations: updated,
        orderedIds: state.orderedIds.filter((oid) => oid !== id),
        totalUnread: computeTotalUnread(updated),
        activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
      };
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  reset: () => {
    // Reset needs fresh Map
    set({
      conversations: new Map(),
      orderedIds: [],
      activeConversationId: null,
      totalUnread: 0,
      isLoading: false,
    });
  },
}));
