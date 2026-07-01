export interface SafeUser {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin' | 'business';
  status: 'active' | 'suspended' | 'deleted' | 'pending_verification';
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastSeen?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ProfileResponse {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatar?: { url: string; publicId: string };
  coverImage?: { url: string; publicId: string };
  location?: string;
  website?: string;
  statusMessage?: string;
  privacySettings: {
    profileVisibility: string;
    lastSeenVisibility: string;
    profilePhotoVisibility: string;
    aboutVisibility: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SessionResponse {
  id: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  isCurrent: boolean;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
  location?: { country?: string; city?: string };
}

export interface DeviceResponse {
  id: string;
  name: string;
  type: string;
  platform: string;
  browser?: string;
  trusted: boolean;
  lastSeenAt: string;
  createdAt: string;
  isCurrentDevice: boolean;
}

export interface SecurityLogResponse {
  id: string;
  eventType: string;
  ipAddress?: string;
  severity: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface PreferencesResponse {
  theme: string;
  language: string;
  notifications: Record<string, boolean>;
  privacy: Record<string, unknown>;
  accessibility: Record<string, unknown>;
  communication: Record<string, boolean>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SecurityOverview {
  recentEvents: SecurityLogResponse[];
  failedLogins: number;
  activeSessions: number;
  trustedDevices: number;
}

export type PrivacyVisibility = 'everyone' | 'contacts' | 'nobody';

export interface UpdatePrivacyInput {
  profileVisibility?: PrivacyVisibility;
  lastSeenVisibility?: PrivacyVisibility;
  profilePhotoVisibility?: PrivacyVisibility;
  aboutVisibility?: PrivacyVisibility;
}

export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  statusMessage?: string;
}

export interface UpdatePreferencesInput {
  theme?: string;
  language?: string;
  notifications?: Record<string, boolean>;
  privacy?: Record<string, unknown>;
  accessibility?: Record<string, unknown>;
  communication?: Record<string, boolean>;
}
