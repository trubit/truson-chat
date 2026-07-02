export interface IBlockData {
  id: string;
  blockedUser: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  reason?: string;
  createdAt: string;
}

export interface IMuteData {
  id: string;
  mutedUser: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  mutedNotifications: boolean;
  mutedMessages: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface BlockUserDto {
  reason?: string;
}

export interface MuteUserDto {
  mutedNotifications?: boolean;
  mutedMessages?: boolean;
  expiresAt?: string | null;
}

export interface BlockListQuery {
  page?: number;
  limit?: number;
}
