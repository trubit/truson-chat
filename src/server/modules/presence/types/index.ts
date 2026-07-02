export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy' | 'invisible';

export interface IPresenceData {
  userId: string;
  status: PresenceStatus;
  customStatus?: string;
  statusMessage?: string;
  statusExpiresAt?: string;
  lastSeen: string;
}

export interface PublicPresenceData {
  userId: string;
  status: PresenceStatus;
  lastSeen?: string;
  customStatus?: string;
  statusMessage?: string;
}

export interface UpdatePresenceDto {
  status?: PresenceStatus;
  customStatus?: string | null;
  statusMessage?: string | null;
  statusExpiresAt?: string | null;
}

export interface BatchPresenceQuery {
  userIds: string[];
}
