export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  statusMessage?: string;
}

export interface UpdatePrivacyInput {
  profileVisibility?: 'everyone' | 'contacts' | 'nobody';
  lastSeenVisibility?: 'everyone' | 'contacts' | 'nobody';
  profilePhotoVisibility?: 'everyone' | 'contacts' | 'nobody';
  aboutVisibility?: 'everyone' | 'contacts' | 'nobody';
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

export interface PreferencesResponse {
  theme: string;
  language: string;
  notifications: Record<string, boolean>;
  privacy: Record<string, unknown>;
  accessibility: Record<string, unknown>;
  communication: Record<string, boolean>;
}

export interface UpdatePreferencesInput {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications?: Partial<{
    email: boolean;
    push: boolean;
    inApp: boolean;
    sms: boolean;
    marketing: boolean;
  }>;
  privacy?: Partial<{
    profileVisibility: string;
    lastSeenVisibility: string;
    readReceipts: boolean;
    onlineStatus: boolean;
  }>;
  accessibility?: Partial<{
    fontSize: string;
    reducedMotion: boolean;
    highContrast: boolean;
  }>;
  communication?: Partial<{
    autoDownloadMedia: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  }>;
}
