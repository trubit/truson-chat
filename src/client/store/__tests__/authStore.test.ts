import { useAuthStore } from '@/store/authStore';
import type { AuthUser } from '@shared/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  _id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  status: 'active',
  emailVerified: true,
  phoneVerified: false,
  twoFactorEnabled: false,
  lastSeen: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Reset state before every test
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('authStore', () => {
  describe('initial state', () => {
    it('has user null', () => {
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('has accessToken null', () => {
      expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it('has isAuthenticated false', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('has isLoading false', () => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('setUser', () => {
    it('sets the user and marks isAuthenticated true', () => {
      const user = makeUser();
      useAuthStore.getState().setUser(user);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
    });

    it('sets isAuthenticated false when called with null', () => {
      // First put a user in
      useAuthStore.getState().setUser(makeUser());
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Now clear it
      useAuthStore.getState().setUser(null);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('replaces an existing user with a new user', () => {
      const first = makeUser({ username: 'alice' });
      const second = makeUser({ username: 'bob', _id: 'user-2' });

      useAuthStore.getState().setUser(first);
      useAuthStore.getState().setUser(second);

      expect(useAuthStore.getState().user?.username).toBe('bob');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('setToken', () => {
    it('sets accessToken to the provided value', () => {
      useAuthStore.getState().setToken('abc');
      expect(useAuthStore.getState().accessToken).toBe('abc');
    });

    it('sets accessToken to null when called with null', () => {
      useAuthStore.getState().setToken('abc');
      useAuthStore.getState().setToken(null);
      expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it('does not affect user or isAuthenticated', () => {
      useAuthStore.getState().setToken('xyz');
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('sets isLoading to true', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('sets isLoading back to false', () => {
      useAuthStore.getState().setLoading(true);
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('resets all state to initial values', () => {
      useAuthStore.getState().setUser(makeUser());
      useAuthStore.getState().setToken('token-xyz');
      useAuthStore.getState().setLoading(true);

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('can be called on an already-logged-out store without error', () => {
      expect(() => useAuthStore.getState().logout()).not.toThrow();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
