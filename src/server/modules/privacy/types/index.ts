export type VisibilityLevel = 'everyone' | 'contacts' | 'friends' | 'nobody';
export type LimitedVisibility = 'nobody' | 'contacts' | 'friends';
export type RequestVisibility = 'everyone' | 'contacts' | 'friends';

export interface IPrivacySettingsData {
  userId: string;
  profileVisibility: VisibilityLevel;
  phoneVisibility: LimitedVisibility;
  emailVisibility: LimitedVisibility;
  lastSeenVisibility: VisibilityLevel;
  onlineStatusVisibility: VisibilityLevel;
  friendRequestsFrom: RequestVisibility;
  searchVisibility: RequestVisibility;
  discoverable: boolean;
  allowContactFromEveryone: boolean;
}

export interface UpdatePrivacyDto {
  profileVisibility?: VisibilityLevel;
  phoneVisibility?: LimitedVisibility;
  emailVisibility?: LimitedVisibility;
  lastSeenVisibility?: VisibilityLevel;
  onlineStatusVisibility?: VisibilityLevel;
  friendRequestsFrom?: RequestVisibility;
  searchVisibility?: RequestVisibility;
  discoverable?: boolean;
  allowContactFromEveryone?: boolean;
}

export interface PrivacyCheckResult {
  canViewProfile: boolean;
  canViewPhone: boolean;
  canViewEmail: boolean;
  canViewLastSeen: boolean;
  canViewOnlineStatus: boolean;
  canSendFriendRequest: boolean;
  canFindInSearch: boolean;
  canAddContact: boolean;
}
