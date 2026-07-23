import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/routes/index';
import type { AuthResponse, SafeUser, TokenResponse } from '@/types/auth';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const AUTH_KEYS = {
  me: ['auth', 'me'] as const,
};

// ---------------------------------------------------------------------------
// Response wrappers
// ---------------------------------------------------------------------------

interface AuthApiResponse {
  success: boolean;
  data: AuthResponse;
}

interface MeApiResponse {
  success: boolean;
  data: { user: SafeUser };
}

interface RefreshApiResponse {
  success: boolean;
  data: TokenResponse;
}

interface MessageApiResponse {
  success: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
  phone?: string;
}

export function useRegister() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterInput) => apiService.post<AuthApiResponse>('/auth/register', data),
    onSuccess: (response) => {
      login(response.data);
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
      navigate(ROUTES.CHAT, { replace: true });
    },
  });
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceName?: string;
  deviceType?: string;
}

export function useLogin() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => apiService.post<AuthApiResponse>('/auth/login', data),
    onSuccess: (response) => {
      login(response.data);
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
      navigate(ROUTES.CHAT, { replace: true });
    },
  });
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiService.post<MessageApiResponse>('/auth/logout'),
    onSuccess: () => {
      logout();
      queryClient.clear();
      navigate(ROUTES.LOGIN, { replace: true });
    },
    onError: () => {
      // Force logout even if server call fails.
      logout();
      queryClient.clear();
      navigate(ROUTES.LOGIN, { replace: true });
    },
  });
}

// ---------------------------------------------------------------------------
// Get current user
// ---------------------------------------------------------------------------

export function useGetMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: AUTH_KEYS.me,
    queryFn: async () => {
      const response = await apiService.get<MeApiResponse>('/auth/me');
      // Sync user into the auth store.
      setUser({
        _id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email,
        phone: response.data.user.phone,
        role: response.data.user.role,
        status: response.data.user.status,
        emailVerified: response.data.user.emailVerified,
        phoneVerified: response.data.user.phoneVerified,
        twoFactorEnabled: response.data.user.twoFactorEnabled,
        lastSeen: response.data.user.lastSeen ?? '',
        createdAt: response.data.user.createdAt,
        updatedAt: response.data.user.createdAt,
      });
      return response.data.user;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Refresh token
// ---------------------------------------------------------------------------

export function useRefreshToken() {
  const setToken = useAuthStore((s) => s.setToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  return useMutation({
    mutationFn: () => apiService.post<RefreshApiResponse>('/auth/refresh', { refreshToken }),
    onSuccess: (response) => {
      setToken(response.data.accessToken);
    },
  });
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      apiService.post<MessageApiResponse>('/auth/forgot-password', data),
  });
}

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------

interface ResetPasswordInput {
  token: string;
  password: string;
}

export function useResetPassword() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: ResetPasswordInput) =>
      apiService.post<MessageApiResponse>('/auth/reset-password', data),
    onSuccess: () => {
      navigate(ROUTES.LOGIN, { replace: true });
    },
  });
}

// ---------------------------------------------------------------------------
// Verify email
// ---------------------------------------------------------------------------

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (data: { token: string }) =>
      apiService.post<MessageApiResponse>('/auth/verify-email', data),
  });
}

// ---------------------------------------------------------------------------
// Resend verification email
// ---------------------------------------------------------------------------

export function useResendVerification() {
  return useMutation({
    mutationFn: () => apiService.post<MessageApiResponse>('/auth/resend-verification'),
  });
}

// ---------------------------------------------------------------------------
// Change password
// ---------------------------------------------------------------------------

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      apiService.post<MessageApiResponse>('/auth/change-password', data),
  });
}

// ---------------------------------------------------------------------------
// Phone OTP
// ---------------------------------------------------------------------------

export function useSendPhoneOtp() {
  return useMutation({
    mutationFn: (data: { phone: string }) =>
      apiService.post<MessageApiResponse>('/auth/send-phone-otp', data),
  });
}

export function useVerifyPhone() {
  return useMutation({
    mutationFn: (data: { phone: string; otp: string }) =>
      apiService.post<MessageApiResponse>('/auth/verify-phone', data),
  });
}
