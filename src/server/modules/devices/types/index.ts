export interface DeviceResponse {
  id: string;
  userId: string;
  name: string;
  type: string;
  platform: string;
  browser?: string;
  trusted: boolean;
  ipAddress?: string;
  lastSeenAt: string;
  createdAt: string;
  isCurrentDevice: boolean;
}

export interface RegisterDeviceInput {
  name: string;
  type: 'mobile' | 'desktop' | 'tablet' | 'other';
  platform: string;
  browser?: string;
  fingerprint?: string;
  pushToken?: string;
}

export interface TrustDeviceInput {
  trusted: boolean;
}
