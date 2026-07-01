export interface SecurityLogResponse {
  id: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  location?: { country?: string; city?: string };
  severity: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogResponse {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: { before: unknown; after: unknown };
  ipAddress?: string;
  createdAt: string;
}

export interface SecurityLogsQuery {
  page?: number;
  limit?: number;
  eventType?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}
