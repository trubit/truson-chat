export type UserRole = 'user' | 'admin' | 'business';
export type UserStatus = 'active' | 'suspended' | 'deleted' | 'pending_verification';

export interface User {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  _id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatar?: MediaAsset;
  coverImage?: MediaAsset;
  location?: string;
  website?: string;
  privacySettings: PrivacySettings;
  createdAt: string;
  updatedAt: string;
}

export interface PrivacySettings {
  profileVisibility: 'everyone' | 'contacts' | 'nobody';
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
  aboutVisibility: 'everyone' | 'contacts' | 'nobody';
}

export interface MediaAsset {
  url: string;
  publicId: string;
}

export interface PublicUser {
  _id: string;
  username: string;
  displayName: string;
  avatar?: MediaAsset;
  lastSeen?: string;
  status?: 'online' | 'offline' | 'away';
}

export interface AuthUser extends User {
  profile?: UserProfile;
}
