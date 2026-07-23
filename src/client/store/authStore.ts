import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@shared/types';
import type { AuthResponse, SafeUser } from '@/types/auth';

// Converts the API SafeUser shape to the AuthUser shape used by the rest of the app.
function safeUserToAuthUser(safeUser: SafeUser): AuthUser {
  return {
    _id: safeUser.id,
    username: safeUser.username,
    email: safeUser.email,
    phone: safeUser.phone,
    role: safeUser.role,
    status: safeUser.status,
    emailVerified: safeUser.emailVerified,
    phoneVerified: safeUser.phoneVerified,
    twoFactorEnabled: safeUser.twoFactorEnabled,
    lastSeen: safeUser.lastSeen ?? '',
    createdAt: safeUser.createdAt,
    updatedAt: safeUser.createdAt,
  };
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  login: (authResponse: AuthResponse) => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      login: (authResponse) =>
        set({
          user: safeUserToAuthUser(authResponse.user),
          accessToken: authResponse.accessToken,
          refreshToken: authResponse.refreshToken,
          sessionId: authResponse.sessionId,
          isAuthenticated: true,
          isLoading: false,
        }),

      setUser: (user) =>
        set({
          user,
          isAuthenticated: user !== null,
        }),

      setToken: (accessToken) => set({ accessToken }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          sessionId: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setInitialized: (isInitialized) => set({ isInitialized }),
    }),
    {
      name: 'linkora_auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        sessionId: state.sessionId,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
