import { create } from 'zustand';
import type { Message } from '@shared/types';

interface MessageState {
  // conversationId -> messages array (ordered oldest first for display)
  messages: Record<string, Message[]>;
  // conversationId -> whether there are more messages to load
  hasMore: Record<string, boolean>;
  // conversationId -> cursor (oldest messageId for next page fetch)
  cursors: Record<string, string | undefined>;
  // message IDs currently being sent (optimistic UI)
  pending: Set<string>;
}

interface MessageActions {
  setMessages: (
    conversationId: string,
    messages: Message[],
    hasMore: boolean,
    cursor?: string,
  ) => void;
  prependMessages: (
    conversationId: string,
    messages: Message[],
    hasMore: boolean,
    cursor?: string,
  ) => void;
  appendMessage: (message: Message) => void;
  updateMessage: (message: Partial<Message> & { _id: string; conversationId: string }) => void;
  deleteMessage: (messageId: string, conversationId: string) => void;
  addReaction: (messageId: string, conversationId: string, emoji: string, userId: string) => void;
  removeReaction: (
    messageId: string,
    conversationId: string,
    emoji: string,
    userId: string,
  ) => void;
  addPending: (tempId: string) => void;
  removePending: (tempId: string) => void;
  markMessagesRead: (conversationId: string, upToMessageId: string, myUserId: string) => void;
  clearConversation: (conversationId: string) => void;
  reset: () => void;
}

type MessageStore = MessageState & MessageActions;

const initialState: MessageState = {
  messages: {},
  hasMore: {},
  cursors: {},
  pending: new Set(),
};

export const useMessageStore = create<MessageStore>()((set) => ({
  ...initialState,
  pending: new Set<string>(),

  setMessages: (conversationId, messages, hasMore, cursor) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
      hasMore: { ...state.hasMore, [conversationId]: hasMore },
      cursors: { ...state.cursors, [conversationId]: cursor },
    })),

  prependMessages: (conversationId, messages, hasMore, cursor) =>
    set((state) => {
      const existing = state.messages[conversationId] ?? [];
      // Deduplicate
      const existingIds = new Set(existing.map((m) => m._id));
      const newOnes = messages.filter((m) => !existingIds.has(m._id));
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...newOnes, ...existing],
        },
        hasMore: { ...state.hasMore, [conversationId]: hasMore },
        cursors: { ...state.cursors, [conversationId]: cursor },
      };
    }),

  appendMessage: (message) =>
    set((state) => {
      const existing = state.messages[message.conversationId] ?? [];
      // Deduplicate by _id
      if (existing.some((m) => m._id === message._id)) {
        return {};
      }
      return {
        messages: {
          ...state.messages,
          [message.conversationId]: [...existing, message],
        },
      };
    }),

  updateMessage: (message) =>
    set((state) => {
      const msgs = state.messages[message.conversationId];
      if (!msgs) return {};
      return {
        messages: {
          ...state.messages,
          [message.conversationId]: msgs.map((m) =>
            m._id === message._id ? { ...m, ...message } : m,
          ),
        },
      };
    }),

  deleteMessage: (messageId, conversationId) =>
    set((state) => {
      const msgs = state.messages[conversationId];
      if (!msgs) return {};
      return {
        messages: {
          ...state.messages,
          [conversationId]: msgs.map((m) =>
            m._id === messageId
              ? {
                  ...m,
                  status: 'deleted' as const,
                  deletedAt: new Date().toISOString(),
                  content: '',
                }
              : m,
          ),
        },
      };
    }),

  addReaction: (messageId, conversationId, emoji, userId) =>
    set((state) => {
      const msgs = state.messages[conversationId];
      if (!msgs) return {};
      return {
        messages: {
          ...state.messages,
          [conversationId]: msgs.map((m) => {
            if (m._id !== messageId) return m;
            const reactions = [...m.reactions];
            const idx = reactions.findIndex((r) => r.emoji === emoji);
            if (idx >= 0) {
              if (reactions[idx].users.includes(userId)) return m;
              reactions[idx] = {
                ...reactions[idx],
                users: [...reactions[idx].users, userId],
                count: reactions[idx].count + 1,
              };
            } else {
              reactions.push({ emoji, users: [userId], count: 1 });
            }
            return { ...m, reactions };
          }),
        },
      };
    }),

  removeReaction: (messageId, conversationId, emoji, userId) =>
    set((state) => {
      const msgs = state.messages[conversationId];
      if (!msgs) return {};
      return {
        messages: {
          ...state.messages,
          [conversationId]: msgs.map((m) => {
            if (m._id !== messageId) return m;
            const reactions = m.reactions
              .map((r) => {
                if (r.emoji !== emoji) return r;
                const users = r.users.filter((u) => u !== userId);
                return { ...r, users, count: users.length };
              })
              .filter((r) => r.count > 0);
            return { ...m, reactions };
          }),
        },
      };
    }),

  addPending: (tempId) =>
    set((state) => {
      const next = new Set(state.pending);
      next.add(tempId);
      return { pending: next };
    }),

  removePending: (tempId) =>
    set((state) => {
      const next = new Set(state.pending);
      next.delete(tempId);
      return { pending: next };
    }),

  markMessagesRead: (conversationId, upToMessageId, myUserId) =>
    set((state) => {
      const msgs = state.messages[conversationId];
      if (!msgs) return {};
      const cutoff = msgs.findIndex((m) => m._id === upToMessageId);
      const limit = cutoff >= 0 ? cutoff : msgs.length - 1;
      let changed = false;
      const updated = msgs.map((m, i) => {
        if (i > limit || m.senderId !== myUserId || m.status === 'read') return m;
        changed = true;
        return { ...m, status: 'read' as const };
      });
      if (!changed) return {};
      return { messages: { ...state.messages, [conversationId]: updated } };
    }),

  clearConversation: (conversationId) =>
    set((state) => {
      const { [conversationId]: _m, ...restMessages } = state.messages;
      const { [conversationId]: _h, ...restHasMore } = state.hasMore;
      const { [conversationId]: _c, ...restCursors } = state.cursors;
      return { messages: restMessages, hasMore: restHasMore, cursors: restCursors };
    }),

  reset: () =>
    set({
      messages: {},
      hasMore: {},
      cursors: {},
      pending: new Set<string>(),
    }),
}));
