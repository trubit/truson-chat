import mongoose from 'mongoose';
import { ProfileModel, type IProfile } from '../../../database/models/Profile.js';
import { UserModel, type IUser } from '../../../database/models/User.js';
import { UserPreferencesModel, type IUserPreferences } from '../../../database/models/UserPreferences.js';
import { AuditLogModel } from '../../../database/models/AuditLog.js';
import { logger } from '../../../logger/index.js';
import type { UpdateProfileInput, UpdatePrivacyInput, UpdatePreferencesInput } from '../types/index.js';

export class ProfileRepository {
  async findByUserId(userId: string): Promise<IProfile | null> {
    if (!mongoose.isValidObjectId(userId)) return null;
    return ProfileModel.findOne({ userId: new mongoose.Types.ObjectId(userId) }).exec();
  }

  async findByUsername(username: string): Promise<{ profile: IProfile; user: IUser } | null> {
    const user = await UserModel.findOne({ username, status: { $ne: 'deleted' } }).exec();
    if (!user) return null;

    const profile = await ProfileModel.findOne({ userId: user._id }).exec();
    if (!profile) return null;

    return { profile, user };
  }

  async updateProfile(
    userId: string,
    data: Partial<UpdateProfileInput>,
  ): Promise<IProfile | null> {
    if (!mongoose.isValidObjectId(userId)) return null;

    const updateFields: Record<string, unknown> = {};
    if (data.displayName !== undefined) updateFields['displayName'] = data.displayName;
    if (data.bio !== undefined) updateFields['bio'] = data.bio;
    if (data.location !== undefined) updateFields['location'] = data.location;
    if (data.website !== undefined) updateFields['website'] = data.website;
    if (data.statusMessage !== undefined) updateFields['statusMessage'] = data.statusMessage;

    return ProfileModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true },
    ).exec();
  }

  async updateAvatar(
    userId: string,
    avatar: { url: string; publicId: string } | null,
  ): Promise<IProfile | null> {
    if (!mongoose.isValidObjectId(userId)) return null;

    const update = avatar
      ? { $set: { avatar } }
      : { $unset: { avatar: '' } };

    return ProfileModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      update,
      { returnDocument: 'after' },
    ).exec();
  }

  async updateCoverImage(
    userId: string,
    coverImage: { url: string; publicId: string } | null,
  ): Promise<IProfile | null> {
    if (!mongoose.isValidObjectId(userId)) return null;

    const update = coverImage
      ? { $set: { coverImage } }
      : { $unset: { coverImage: '' } };

    return ProfileModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      update,
      { returnDocument: 'after' },
    ).exec();
  }

  async updatePrivacySettings(
    userId: string,
    settings: Partial<UpdatePrivacyInput>,
  ): Promise<IProfile | null> {
    if (!mongoose.isValidObjectId(userId)) return null;

    const updateFields: Record<string, unknown> = {};
    if (settings.profileVisibility !== undefined) {
      updateFields['privacySettings.profileVisibility'] = settings.profileVisibility;
    }
    if (settings.lastSeenVisibility !== undefined) {
      updateFields['privacySettings.lastSeenVisibility'] = settings.lastSeenVisibility;
    }
    if (settings.profilePhotoVisibility !== undefined) {
      updateFields['privacySettings.profilePhotoVisibility'] = settings.profilePhotoVisibility;
    }
    if (settings.aboutVisibility !== undefined) {
      updateFields['privacySettings.aboutVisibility'] = settings.aboutVisibility;
    }

    return ProfileModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true },
    ).exec();
  }

  async findPreferencesByUserId(userId: string): Promise<IUserPreferences | null> {
    if (!mongoose.isValidObjectId(userId)) return null;
    return UserPreferencesModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).exec();
  }

  async updatePreferences(
    userId: string,
    data: Partial<UpdatePreferencesInput>,
  ): Promise<IUserPreferences | null> {
    if (!mongoose.isValidObjectId(userId)) return null;

    const updateFields: Record<string, unknown> = {};

    if (data.theme !== undefined) updateFields['theme'] = data.theme;
    if (data.language !== undefined) updateFields['language'] = data.language;

    if (data.notifications) {
      for (const [key, value] of Object.entries(data.notifications)) {
        if (value !== undefined) updateFields[`notifications.${key}`] = value;
      }
    }

    if (data.privacy) {
      for (const [key, value] of Object.entries(data.privacy)) {
        if (value !== undefined) updateFields[`privacy.${key}`] = value;
      }
    }

    if (data.accessibility) {
      for (const [key, value] of Object.entries(data.accessibility)) {
        if (value !== undefined) updateFields[`accessibility.${key}`] = value;
      }
    }

    if (data.communication) {
      for (const [key, value] of Object.entries(data.communication)) {
        if (value !== undefined) updateFields[`communication.${key}`] = value;
      }
    }

    return UserPreferencesModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: updateFields },
      { new: true, runValidators: true, upsert: true },
    ).exec();
  }

  async logAudit(data: {
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    changes?: { before: unknown; after: unknown };
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await AuditLogModel.create({
        userId: new mongoose.Types.ObjectId(data.userId),
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        changes: data.changes,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });
    } catch (err) {
      logger.error('Failed to create audit log', {
        error: err instanceof Error ? err.message : String(err),
        data,
      });
    }
  }
}
