import mongoose from 'mongoose';
import {
  PrivacySettingModel,
  type IPrivacySetting,
} from '../../../database/models/PrivacySetting.js';
import type { UpdatePrivacyDto, IPrivacySettingsData } from '../types/index.js';

export class PrivacyRepository {
  async findByUserId(userId: string): Promise<IPrivacySetting | null> {
    if (!mongoose.isValidObjectId(userId)) return null;
    return PrivacySettingModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).exec();
  }

  async upsert(userId: string, data: UpdatePrivacyDto): Promise<IPrivacySetting> {
    if (!mongoose.isValidObjectId(userId)) {
      throw new Error('Invalid userId');
    }
    const setFields: Record<string, unknown> = {};
    if (data.profileVisibility !== undefined) {
      setFields['profileVisibility'] = data.profileVisibility;
    }
    if (data.phoneVisibility !== undefined) {
      setFields['phoneVisibility'] = data.phoneVisibility;
    }
    if (data.emailVisibility !== undefined) {
      setFields['emailVisibility'] = data.emailVisibility;
    }
    if (data.lastSeenVisibility !== undefined) {
      setFields['lastSeenVisibility'] = data.lastSeenVisibility;
    }
    if (data.onlineStatusVisibility !== undefined) {
      setFields['onlineStatusVisibility'] = data.onlineStatusVisibility;
    }
    if (data.friendRequestsFrom !== undefined) {
      setFields['friendRequestsFrom'] = data.friendRequestsFrom;
    }
    if (data.searchVisibility !== undefined) {
      setFields['searchVisibility'] = data.searchVisibility;
    }
    if (data.discoverable !== undefined) {
      setFields['discoverable'] = data.discoverable;
    }
    if (data.allowContactFromEveryone !== undefined) {
      setFields['allowContactFromEveryone'] = data.allowContactFromEveryone;
    }

    const result = await PrivacySettingModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: setFields },
      { upsert: true, returnDocument: 'after' },
    ).exec();
    return result as IPrivacySetting;
  }

  async findManyByUserIds(userIds: string[]): Promise<IPrivacySetting[]> {
    const validIds = userIds.filter((id) => mongoose.isValidObjectId(id));
    if (validIds.length === 0) return [];
    return PrivacySettingModel.find({
      userId: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).exec();
  }
}

// ---------------------------------------------------------------------------
// Helper: returns default privacy settings object when no DB record exists yet
// ---------------------------------------------------------------------------

export function getDefaultPrivacySettings(userId: string): IPrivacySettingsData {
  return {
    userId,
    profileVisibility: 'everyone',
    phoneVisibility: 'nobody',
    emailVisibility: 'nobody',
    lastSeenVisibility: 'everyone',
    onlineStatusVisibility: 'everyone',
    friendRequestsFrom: 'everyone',
    searchVisibility: 'everyone',
    discoverable: true,
    allowContactFromEveryone: true,
  };
}
