export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'admin' | 'business';
  status?: 'active' | 'suspended' | 'deleted' | 'pending_verification';
  sort?: 'createdAt' | 'username' | 'lastSeen';
  order?: 'asc' | 'desc';
}

export interface PublicUserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: { url: string; publicId: string };
  lastSeen?: string;
  status?: 'online' | 'offline' | 'away';
  role: string;
}

export interface AdminUserView {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  loginAttempts: number;
  lastSeen?: string;
  createdAt: string;
}

export interface UpdateUserInput {
  username?: string;
  phone?: string;
}

export interface UpdateStatusInput {
  status: 'active' | 'suspended' | 'deleted';
  reason?: string;
}
