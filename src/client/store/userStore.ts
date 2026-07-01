import { create } from 'zustand';

interface UserState {
  onlineUsers: string[];
  typingUsers: Record<string, string[]>;
}

interface UserActions {
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  clearTyping: (conversationId: string) => void;
}

type UserStore = UserState & UserActions;

export const useUserStore = create<UserStore>((set) => ({
  onlineUsers: [],
  typingUsers: {},

  setOnline: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.includes(userId)
        ? state.onlineUsers
        : [...state.onlineUsers, userId],
    })),

  setOffline: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((id) => id !== userId),
    })),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[conversationId] ?? [];
      const updated = isTyping
        ? current.includes(userId)
          ? current
          : [...current, userId]
        : current.filter((id) => id !== userId);
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: updated,
        },
      };
    }),

  clearTyping: (conversationId) =>
    set((state) => {
      const { [conversationId]: _removed, ...rest } = state.typingUsers;
      return { typingUsers: rest };
    }),
}));
