import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useSecurityStore } from '@/store/securityStore';
import type { SecurityLogResponse, SecurityOverview, PaginationMeta } from '@/types/auth';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const SECURITY_KEYS = {
  logs: (page: number, limit: number) => ['security', 'logs', page, limit] as const,
  overview: ['security', 'overview'] as const,
};

// ---------------------------------------------------------------------------
// Response wrappers
// ---------------------------------------------------------------------------

interface SecurityLogsApiResponse {
  success: boolean;
  data: { logs: SecurityLogResponse[]; meta: PaginationMeta };
}

interface SecurityOverviewApiResponse {
  success: boolean;
  data: SecurityOverview;
}

// ---------------------------------------------------------------------------
// Security logs
// ---------------------------------------------------------------------------

export function useSecurityLogs(params?: { page?: number; limit?: number }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const setLogs = useSecurityStore((s) => s.setLogs);

  return useQuery({
    queryKey: SECURITY_KEYS.logs(page, limit),
    queryFn: async () => {
      const response = await apiService.get<SecurityLogsApiResponse>(
        `/security/logs?page=${page}&limit=${limit}`,
      );
      setLogs(response.data.logs);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Security overview
// ---------------------------------------------------------------------------

export function useSecurityOverview() {
  const setOverview = useSecurityStore((s) => s.setOverview);

  return useQuery({
    queryKey: SECURITY_KEYS.overview,
    queryFn: async () => {
      const response = await apiService.get<SecurityOverviewApiResponse>('/security/overview');
      setOverview(response.data);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}
