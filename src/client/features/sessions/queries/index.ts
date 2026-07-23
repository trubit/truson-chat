import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useSessionStore } from '@/store/sessionStore';
import type { SessionResponse } from '@/types/auth';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const SESSION_KEYS = {
  all: ['sessions'] as const,
};

// ---------------------------------------------------------------------------
// Response wrappers
// ---------------------------------------------------------------------------

interface SessionsApiResponse {
  success: boolean;
  data: { sessions: SessionResponse[]; currentSessionId: string };
}

interface RevokeAllApiResponse {
  success: boolean;
  data: { revokedCount: number };
}

interface MessageApiResponse {
  success: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// List sessions
// ---------------------------------------------------------------------------

export function useListSessions() {
  const setSessions = useSessionStore((s) => s.setSessions);
  const setCurrentSessionId = useSessionStore((s) => s.setCurrentSessionId);

  return useQuery({
    queryKey: SESSION_KEYS.all,
    queryFn: async () => {
      const response = await apiService.get<SessionsApiResponse>('/sessions');
      setSessions(response.data.sessions);
      setCurrentSessionId(response.data.currentSessionId);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Revoke single session
// ---------------------------------------------------------------------------

export function useRevokeSession() {
  const queryClient = useQueryClient();
  const removeSession = useSessionStore((s) => s.removeSession);

  return useMutation({
    mutationFn: (sessionId: string) => apiService.del<MessageApiResponse>(`/sessions/${sessionId}`),
    onSuccess: (_response, sessionId) => {
      removeSession(sessionId);
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Revoke all sessions
// ---------------------------------------------------------------------------

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  const clearSessions = useSessionStore((s) => s.clearSessions);

  return useMutation({
    mutationFn: () => apiService.del<RevokeAllApiResponse>('/sessions'),
    onSuccess: () => {
      clearSessions();
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.all });
    },
  });
}
