import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 'message' | 'call' | 'system' | 'mention' | 'reaction';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

interface NotificationActions {
  addNotification: (notification: Omit<Notification, 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const computeUnread = (notifications: Notification[]): number =>
  notifications.filter((n) => !n.read).length;

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) =>
        set((state) => {
          const newNotification: Notification = {
            ...notification,
            read: false,
            createdAt: new Date().toISOString(),
          };
          const notifications = [newNotification, ...state.notifications].slice(0, 100);
          return {
            notifications,
            unreadCount: computeUnread(notifications),
          };
        }),

      markAsRead: (id) =>
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          );
          return { notifications, unreadCount: computeUnread(notifications) };
        }),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      removeNotification: (id) =>
        set((state) => {
          const notifications = state.notifications.filter((n) => n.id !== id);
          return { notifications, unreadCount: computeUnread(notifications) };
        }),

      clearAll: () =>
        set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: 'truson_notifications',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50),
        unreadCount: state.unreadCount,
      }),
    },
  ),
);
