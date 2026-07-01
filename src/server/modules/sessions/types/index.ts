export interface SessionResponse {
  id: string;
  userId: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  location?: { country?: string; city?: string };
  isActive: boolean;
  isCurrent: boolean;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface SessionListResponse {
  sessions: SessionResponse[];
  currentSessionId: string;
}
