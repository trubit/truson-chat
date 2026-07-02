import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { FriendshipModel } from '../../../database/models/Friendship.js';
import { ContactModel } from '../../../database/models/Contact.js';
import { getDefaultPrivacySettings } from '../repository/index.js';
import type { PrivacyRepository } from '../repository/index.js';
import type {
  IPrivacySettingsData,
  UpdatePrivacyDto,
  PrivacyCheckResult,
} from '../types/index.js';
import type { IPrivacySetting } from '../../../database/models/PrivacySetting.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSettingsData(s: IPrivacySetting): IPrivacySettingsData {
  return {
    userId: s.userId.toString(),
    profileVisibility: s.profileVisibility,
    phoneVisibility: s.phoneVisibility,
    emailVisibility: s.emailVisibility,
    lastSeenVisibility: s.lastSeenVisibility,
    onlineStatusVisibility: s.onlineStatusVisibility,
    friendRequestsFrom: s.friendRequestsFrom,
    searchVisibility: s.searchVisibility,
    discoverable: s.discoverable,
    allowContactFromEveryone: s.allowContactFromEveryone,
  };
}

function canAccess(visibility: string, isFriend: boolean, isContact: boolean): boolean {
  switch (visibility) {
    case 'everyone':
      return true;
    case 'friends':
      return isFriend;
    case 'contacts':
      return isContact;
    case 'nobody':
      return false;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class PrivacyService {
  constructor(private repo: PrivacyRepository) {}

  async getSettings(userId: string): Promise<IPrivacySettingsData> {
    const setting = await this.repo.findByUserId(userId);
    if (!setting) return getDefaultPrivacySettings(userId);
    return toSettingsData(setting);
  }

  async updateSettings(userId: string, dto: UpdatePrivacyDto): Promise<IPrivacySettingsData> {
    const updated = await this.repo.upsert(userId, dto);
    return toSettingsData(updated);
  }

  async checkPrivacy(requesterId: string, targetId: string): Promise<PrivacyCheckResult> {
    if (!mongoose.isValidObjectId(targetId)) {
      throw new AppError('Invalid user ID', 400, 'INVALID_ID');
    }

    // Self can see everything
    if (requesterId === targetId) {
      return {
        canViewProfile: true,
        canViewPhone: true,
        canViewEmail: true,
        canViewLastSeen: true,
        canViewOnlineStatus: true,
        canSendFriendRequest: true,
        canFindInSearch: true,
        canAddContact: true,
      };
    }

    const settings = await this.getSettings(targetId);

    // Determine relationship — Friendship sorts user1Id < user2Id by string comparison
    const ids = [requesterId, targetId].sort();
    const [friendship, contact] = await Promise.all([
      FriendshipModel.findOne({
        user1Id: new mongoose.Types.ObjectId(ids[0] as string),
        user2Id: new mongoose.Types.ObjectId(ids[1] as string),
      })
        .select('_id')
        .exec(),
      ContactModel.findOne({
        ownerId: new mongoose.Types.ObjectId(requesterId),
        contactUserId: new mongoose.Types.ObjectId(targetId),
      })
        .select('_id')
        .exec(),
    ]);

    const isFriend = friendship !== null;
    const isContact = contact !== null;

    return {
      canViewProfile: canAccess(settings.profileVisibility, isFriend, isContact),
      canViewPhone: canAccess(settings.phoneVisibility, isFriend, isContact),
      canViewEmail: canAccess(settings.emailVisibility, isFriend, isContact),
      canViewLastSeen: canAccess(settings.lastSeenVisibility, isFriend, isContact),
      canViewOnlineStatus: canAccess(settings.onlineStatusVisibility, isFriend, isContact),
      canSendFriendRequest: canAccess(settings.friendRequestsFrom, isFriend, isContact),
      canFindInSearch:
        settings.discoverable && canAccess(settings.searchVisibility, isFriend, isContact),
      canAddContact: settings.allowContactFromEveryone,
    };
  }

  async canSendFriendRequest(requesterId: string, targetId: string): Promise<boolean> {
    const settings = await this.getSettings(targetId);
    if (settings.friendRequestsFrom === 'everyone') return true;

    const ids = [requesterId, targetId].sort();
    const [friendship, contact] = await Promise.all([
      FriendshipModel.findOne({
        user1Id: new mongoose.Types.ObjectId(ids[0] as string),
        user2Id: new mongoose.Types.ObjectId(ids[1] as string),
      })
        .select('_id')
        .exec(),
      ContactModel.findOne({
        ownerId: new mongoose.Types.ObjectId(requesterId),
        contactUserId: new mongoose.Types.ObjectId(targetId),
      })
        .select('_id')
        .exec(),
    ]);

    return canAccess(settings.friendRequestsFrom, friendship !== null, contact !== null);
  }

  async canBeFoundInSearch(requesterId: string, targetId: string): Promise<boolean> {
    const settings = await this.getSettings(targetId);
    if (!settings.discoverable) return false;
    if (settings.searchVisibility === 'everyone') return true;

    const ids = [requesterId, targetId].sort();
    const [friendship, contact] = await Promise.all([
      FriendshipModel.findOne({
        user1Id: new mongoose.Types.ObjectId(ids[0] as string),
        user2Id: new mongoose.Types.ObjectId(ids[1] as string),
      })
        .select('_id')
        .exec(),
      ContactModel.findOne({
        ownerId: new mongoose.Types.ObjectId(requesterId),
        contactUserId: new mongoose.Types.ObjectId(targetId),
      })
        .select('_id')
        .exec(),
    ]);

    return canAccess(settings.searchVisibility, friendship !== null, contact !== null);
  }
}
