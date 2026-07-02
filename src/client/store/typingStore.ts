import { create } from 'zustand';

interface TypingState {
  // conversationId -> array of userIds currently typing
  typing: Record<string, string[]>;
}

interface TypingActions {
  setTyping: (conversationId: string, userId: string) => void;
  clearTyping: (conversationId: string, userId: string) => void;
  clearConversationTyping: (conversationId: string) => void;
  reset: () => void;
}

type TypingStore = TypingState & TypingActions;

export const useTypingStore = create<TypingStore>()((set) => ({
  typing: {},

  setTyping: (conversationId, userId) =>
    set((state) => {
      const current = state.typing[conversationId] ?? [];
      if (current.includes(userId)) return {};
      return {
        typing: {
          ...state.typing,
          [conversationId]: [...current, userId],
        },
      };
    }),

  clearTyping: (conversationId, userId) =>
    set((state) => {
      const current = state.typing[conversationId];
      if (!current) return {};
      return {
        typing: {
          ...state.typing,
          [conversationId]: current.filter((uid) => uid !== userId),
        },
      };
    }),

  clearConversationTyping: (conversationId) =>
    set((state) => ({
      typing: { ...state.typing, [conversationId]: [] },
    })),

  reset: () => set({ typing: {} }),
}));
