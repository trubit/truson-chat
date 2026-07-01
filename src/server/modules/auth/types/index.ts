// ---------------------------------------------------------------------------
// Auth module — TypeScript types
// ---------------------------------------------------------------------------

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

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  platform?: string;
}

export interface PhoneOtpInput {
  phone: string;
}

export interface VerifyPhoneInput {
  phone: string;
  otp: string;
}
