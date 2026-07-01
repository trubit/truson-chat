import { useNotificationStore } from '@/store/notificationStore';
import type { NotificationType } from '@/store/notificationStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface NotificationInput {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
}

const makeNotification = (overrides: Partial<NotificationInput> = {}): NotificationInput => ({
  id: 'notif-1',
  title: 'Test',
  body: 'Test notification',
  type: 'message' as const,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Reset state before every test
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  useNotificationStore.setState({
    notifications: [],
    unreadCount: 0,
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('notificationStore', () => {
  describe('initial state', () => {
    it('has empty notifications array', () => {
      expect(useNotificationStore.getState().notifications).toEqual([]);
    });

    it('has unreadCount of 0', () => {
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe('addNotification', () => {
    it('adds a notification to the front of the array', () => {
      useNotificationStore.getState().addNotification(makeNotification());
      expect(useNotificationStore.getState().notifications).toHaveLength(1);
      expect(useNotificationStore.getState().notifications[0].id).toBe('notif-1');
    });

    it('sets read to false on newly added notification', () => {
      useNotificationStore.getState().addNotification(makeNotification());
      expect(useNotificationStore.getState().notifications[0].read).toBe(false);
    });

    it('sets createdAt on newly added notification', () => {
      const before = new Date().toISOString();
      useNotificationStore.getState().addNotification(makeNotification());
      const createdAt = useNotificationStore.getState().notifications[0].createdAt;
      expect(createdAt).toBeDefined();
      expect(createdAt >= before).toBe(true);
    });

    it('increments unreadCount', () => {
      useNotificationStore.getState().addNotification(makeNotification());
      expect(useNotificationStore.getState().unreadCount).toBe(1);

      useNotificationStore.getState().addNotification(makeNotification({ id: 'notif-2' }));
      expect(useNotificationStore.getState().unreadCount).toBe(2);
    });

    it('puts the newest notification at index 0', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'first' }));
      useNotificationStore.getState().addNotification(makeNotification({ id: 'second' }));

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications[0].id).toBe('second');
      expect(notifications[1].id).toBe('first');
    });

    it('caps the notifications list at 100 items', () => {
      for (let i = 0; i < 101; i++) {
        useNotificationStore.getState().addNotification(makeNotification({ id: `notif-${i}` }));
      }

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(100);
      // The oldest (index 0 when inserted) gets dropped; the newest is at [0]
      expect(state.notifications[0].id).toBe('notif-100');
    });
  });

  describe('markAsRead', () => {
    it('sets the target notification read to true', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }));
      useNotificationStore.getState().markAsRead('n1');
      expect(useNotificationStore.getState().notifications[0].read).toBe(true);
    });

    it('decrements unreadCount', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }));
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n2' }));
      expect(useNotificationStore.getState().unreadCount).toBe(2);

      useNotificationStore.getState().markAsRead('n1');
      expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    it('does not change unreadCount when id is not found', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }));
      useNotificationStore.getState().markAsRead('non-existent');
      expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    it('does not affect other notifications', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }));
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n2' }));
      useNotificationStore.getState().markAsRead('n1');

      const n2 = useNotificationStore.getState().notifications.find((n) => n.id === 'n2');
      expect(n2?.read).toBe(false);
    });
  });

  describe('markAllRead', () => {
    it('sets all notifications to read', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }));
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n2' }));
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n3' }));

      useNotificationStore.getState().markAllRead();

      const { notifications } = useNotificationStore.getState();
      expect(notifications.every((n) => n.read)).toBe(true);
    });

    it('sets unreadCount to 0', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }));
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n2' }));

      useNotificationStore.getState().markAllRead();
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it('works when there are no notifications', () => {
      expect(() => useNotificationStore.getState().markAllRead()).not.toThrow();
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe('removeNotification', () => {
    it('removes the notification with the given id', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }));
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n2' }));

      useNotificationStore.getState().removeNotification('n1');

      const ids = useNotificationStore.getState().notifications.map((n) => n.id);
      expect(ids).not.toContain('n1');
      expect(ids).toContain('n2');
    });

    it('updates unreadCount after removing an unread notification', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }));
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n2' }));
      expect(useNotificationStore.getState().unreadCount).toBe(2);

      useNotificationStore.getState().removeNotification('n1');
      expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    it('does not affect unreadCount when removing a read notification', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }));
      useNotificationStore.getState().markAsRead('n1');
      expect(useNotificationStore.getState().unreadCount).toBe(0);

      useNotificationStore.getState().removeNotification('n1');
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it('is a no-op when the id does not exist', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }));
      useNotificationStore.getState().removeNotification('does-not-exist');
      expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    it('removes all notifications', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }));
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n2' }));

      useNotificationStore.getState().clearAll();
      expect(useNotificationStore.getState().notifications).toEqual([]);
    });

    it('resets unreadCount to 0', () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }));
      useNotificationStore.getState().clearAll();
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe('unreadCount accuracy across multiple operations', () => {
    it('stays correct after add, markAsRead, and remove', () => {
      // Add 3
      useNotificationStore.getState().addNotification(makeNotification({ id: 'a' }));
      useNotificationStore.getState().addNotification(makeNotification({ id: 'b' }));
      useNotificationStore.getState().addNotification(makeNotification({ id: 'c' }));
      expect(useNotificationStore.getState().unreadCount).toBe(3);

      // Read one
      useNotificationStore.getState().markAsRead('a');
      expect(useNotificationStore.getState().unreadCount).toBe(2);

      // Remove the already-read one
      useNotificationStore.getState().removeNotification('a');
      expect(useNotificationStore.getState().unreadCount).toBe(2);

      // Remove an unread one
      useNotificationStore.getState().removeNotification('b');
      expect(useNotificationStore.getState().unreadCount).toBe(1);

      // Mark all remaining read
      useNotificationStore.getState().markAllRead();
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });
});
