import fs from 'fs';
import { AppError } from '../../../middlewares/errorHandler.js';
import { logger } from '../../../logger/index.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../../cloudinary/index.js';
import { getEnv } from '../../../config/env.js';
import type { IProfile } from '../../../database/models/Profile.js';
import type { IUserPreferences } from '../../../database/models/UserPreferences.js';
import type {
  UpdateProfileInput,
  UpdatePrivacyInput,
  ProfileResponse,
  PreferencesResponse,
  UpdatePreferencesInput,
} from '../types/index.js';
import type { ProfileRepository } from '../repository/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCloudinaryConfigured(): boolean {
  const env = getEnv();
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET,
  );
}

function toProfileResponse(profile: IProfile): ProfileResponse {
  const response: ProfileResponse = {
    id: profile._id.toString(),
    userId: profile.userId.toString(),
    displayName: profile.displayName,
    privacySettings: {
      profileVisibility: profile.privacySettings.profileVisibility,
      lastSeenVisibility: profile.privacySettings.lastSeenVisibility,
      profilePhotoVisibility: profile.privacySettings.profilePhotoVisibility,
      aboutVisibility: profile.privacySettings.aboutVisibility,
    },
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };

  if (profile.bio) response.bio = profile.bio;
  if (profile.avatar) response.avatar = profile.avatar;
  if (profile.coverImage) response.coverImage = profile.coverImage;
  if (profile.location) response.location = profile.location;
  if (profile.website) response.website = profile.website;
  if (profile.statusMessage) response.statusMessage = profile.statusMessage;

  return response;
}

function applyPrivacyFilters(
  profile: IProfile,
  viewerId: string | undefined,
): ProfileResponse {
  const base = toProfileResponse(profile);
  const ownerId = profile.userId.toString();

  // Owner always sees full profile
  if (viewerId && viewerId === ownerId) {
    return base;
  }

  const isAuthenticated = Boolean(viewerId);

  // profilePhotoVisibility — controls avatar visibility
  const photoVis = profile.privacySettings.profilePhotoVisibility;
  if (photoVis === 'nobody' || (photoVis === 'contacts' && !isAuthenticated)) {
    delete base.avatar;
  }

  // aboutVisibility — controls bio, location, website, statusMessage
  const aboutVis = profile.privacySettings.aboutVisibility;
  if (aboutVis === 'nobody' || (aboutVis === 'contacts' && !isAuthenticated)) {
    delete base.bio;
    delete base.location;
    delete base.website;
    delete base.statusMessage;
  }

  return base;
}

function toPreferencesResponse(prefs: IUserPreferences): PreferencesResponse {
  return {
    theme: prefs.theme,
    language: prefs.language,
    notifications: {
      email: prefs.notifications.email,
      push: prefs.notifications.push,
      inApp: prefs.notifications.inApp,
      sms: prefs.notifications.sms,
      marketing: prefs.notifications.marketing,
    },
    privacy: {
      profileVisibility: prefs.privacy.profileVisibility,
      lastSeenVisibility: prefs.privacy.lastSeenVisibility,
      readReceipts: prefs.privacy.readReceipts,
      onlineStatus: prefs.privacy.onlineStatus,
    },
    accessibility: {
      fontSize: prefs.accessibility.fontSize,
      reducedMotion: prefs.accessibility.reducedMotion,
      highContrast: prefs.accessibility.highContrast,
    },
    communication: {
      autoDownloadMedia: prefs.communication.autoDownloadMedia,
      soundEnabled: prefs.communication.soundEnabled,
      vibrationEnabled: prefs.communication.vibrationEnabled,
    },
  };
}

async function readFileBuffer(file: Express.Multer.File): Promise<Buffer> {
  if (file.buffer) return file.buffer;
  // Disk-storage case: read from path
  return fs.promises.readFile(file.path);
}

async function cleanupTempFile(file: Express.Multer.File): Promise<void> {
  if (file.path) {
    try {
      await fs.promises.unlink(file.path);
    } catch {
      // Non-fatal: temp file cleanup failure
    }
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ProfileService {
  constructor(private repo: ProfileRepository) {}

  async getProfile(
    viewerId: string | undefined,
    targetUserId: string,
  ): Promise<ProfileResponse> {
    const profile = await this.repo.findByUserId(targetUserId);
    if (!profile) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    return applyPrivacyFilters(profile, viewerId);
  }

  async getOwnProfile(userId: string): Promise<ProfileResponse> {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }
    return toProfileResponse(profile);
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileInput,
    ip: string,
    ua: string,
  ): Promise<ProfileResponse> {
    const existing = await this.repo.findByUserId(userId);
    if (!existing) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    const before: Partial<UpdateProfileInput> = {};
    const after: Partial<UpdateProfileInput> = {};

    if (data.displayName !== undefined) {
      before.displayName = existing.displayName;
      after.displayName = data.displayName;
    }
    if (data.bio !== undefined) {
      before.bio = existing.bio;
      after.bio = data.bio;
    }
    if (data.location !== undefined) {
      before.location = existing.location;
      after.location = data.location;
    }
    if (data.website !== undefined) {
      before.website = existing.website;
      after.website = data.website;
    }
    if (data.statusMessage !== undefined) {
      before.statusMessage = existing.statusMessage;
      after.statusMessage = data.statusMessage;
    }

    const updated = await this.repo.updateProfile(userId, data);
    if (!updated) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    await this.repo.logAudit({
      userId,
      action: 'profile.update',
      resource: 'profile',
      resourceId: existing._id.toString(),
      changes: { before, after },
      ipAddress: ip,
      userAgent: ua,
    });

    logger.info('Profile updated', { userId, fields: Object.keys(data) });
    return toProfileResponse(updated);
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
    ip: string,
    ua: string,
  ): Promise<ProfileResponse> {
    if (!isCloudinaryConfigured()) {
      await cleanupTempFile(file);
      throw new AppError('Cloudinary is not configured', 503, 'CLOUDINARY_NOT_CONFIGURED');
    }

    const existing = await this.repo.findByUserId(userId);
    if (!existing) {
      await cleanupTempFile(file);
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    const oldPublicId = existing.avatar?.publicId;

    let buffer: Buffer;
    try {
      buffer = await readFileBuffer(file);
    } finally {
      await cleanupTempFile(file);
    }

    const uploadResult = await uploadToCloudinary(buffer, {
      folder: 'truson-chat/avatars',
      maxWidth: 400,
      maxHeight: 400,
    });

    // Delete old avatar from Cloudinary if it existed
    if (oldPublicId) {
      try {
        await deleteFromCloudinary(oldPublicId);
      } catch (err) {
        logger.warn('Failed to delete old avatar from Cloudinary', {
          publicId: oldPublicId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const updated = await this.repo.updateAvatar(userId, {
      url: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
    });
    if (!updated) throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');

    await this.repo.logAudit({
      userId,
      action: 'profile.avatar_upload',
      resource: 'profile',
      resourceId: existing._id.toString(),
      changes: {
        before: { avatar: existing.avatar },
        after: { avatar: { url: uploadResult.secureUrl, publicId: uploadResult.publicId } },
      },
      ipAddress: ip,
      userAgent: ua,
    });

    logger.info('Avatar uploaded', { userId, publicId: uploadResult.publicId });
    return toProfileResponse(updated);
  }

  async removeAvatar(userId: string, ip: string, ua: string): Promise<ProfileResponse> {
    const existing = await this.repo.findByUserId(userId);
    if (!existing) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    const oldPublicId = existing.avatar?.publicId;

    if (oldPublicId && isCloudinaryConfigured()) {
      try {
        await deleteFromCloudinary(oldPublicId);
      } catch (err) {
        logger.warn('Failed to delete avatar from Cloudinary', {
          publicId: oldPublicId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const updated = await this.repo.updateAvatar(userId, null);
    if (!updated) throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');

    await this.repo.logAudit({
      userId,
      action: 'profile.avatar_remove',
      resource: 'profile',
      resourceId: existing._id.toString(),
      changes: { before: { avatar: existing.avatar }, after: { avatar: null } },
      ipAddress: ip,
      userAgent: ua,
    });

    logger.info('Avatar removed', { userId });
    return toProfileResponse(updated);
  }

  async uploadCoverImage(
    userId: string,
    file: Express.Multer.File,
    ip: string,
    ua: string,
  ): Promise<ProfileResponse> {
    if (!isCloudinaryConfigured()) {
      await cleanupTempFile(file);
      throw new AppError('Cloudinary is not configured', 503, 'CLOUDINARY_NOT_CONFIGURED');
    }

    const existing = await this.repo.findByUserId(userId);
    if (!existing) {
      await cleanupTempFile(file);
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    const oldPublicId = existing.coverImage?.publicId;

    let buffer: Buffer;
    try {
      buffer = await readFileBuffer(file);
    } finally {
      await cleanupTempFile(file);
    }

    const uploadResult = await uploadToCloudinary(buffer, {
      folder: 'truson-chat/covers',
      maxWidth: 1200,
      maxHeight: 400,
    });

    // Delete old cover image from Cloudinary if it existed
    if (oldPublicId) {
      try {
        await deleteFromCloudinary(oldPublicId);
      } catch (err) {
        logger.warn('Failed to delete old cover image from Cloudinary', {
          publicId: oldPublicId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const updated = await this.repo.updateCoverImage(userId, {
      url: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
    });
    if (!updated) throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');

    await this.repo.logAudit({
      userId,
      action: 'profile.cover_upload',
      resource: 'profile',
      resourceId: existing._id.toString(),
      changes: {
        before: { coverImage: existing.coverImage },
        after: { coverImage: { url: uploadResult.secureUrl, publicId: uploadResult.publicId } },
      },
      ipAddress: ip,
      userAgent: ua,
    });

    logger.info('Cover image uploaded', { userId, publicId: uploadResult.publicId });
    return toProfileResponse(updated);
  }

  async removeCoverImage(userId: string, ip: string, ua: string): Promise<ProfileResponse> {
    const existing = await this.repo.findByUserId(userId);
    if (!existing) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    const oldPublicId = existing.coverImage?.publicId;

    if (oldPublicId && isCloudinaryConfigured()) {
      try {
        await deleteFromCloudinary(oldPublicId);
      } catch (err) {
        logger.warn('Failed to delete cover image from Cloudinary', {
          publicId: oldPublicId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const updated = await this.repo.updateCoverImage(userId, null);
    if (!updated) throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');

    await this.repo.logAudit({
      userId,
      action: 'profile.cover_remove',
      resource: 'profile',
      resourceId: existing._id.toString(),
      changes: { before: { coverImage: existing.coverImage }, after: { coverImage: null } },
      ipAddress: ip,
      userAgent: ua,
    });

    logger.info('Cover image removed', { userId });
    return toProfileResponse(updated);
  }

  async updatePrivacy(
    userId: string,
    data: UpdatePrivacyInput,
    ip: string,
    ua: string,
  ): Promise<ProfileResponse> {
    const existing = await this.repo.findByUserId(userId);
    if (!existing) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    const updated = await this.repo.updatePrivacySettings(userId, data);
    if (!updated) throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');

    await this.repo.logAudit({
      userId,
      action: 'profile.privacy_update',
      resource: 'profile',
      resourceId: existing._id.toString(),
      changes: {
        before: { privacySettings: existing.privacySettings },
        after: { privacySettings: updated.privacySettings },
      },
      ipAddress: ip,
      userAgent: ua,
    });

    logger.info('Profile privacy updated', { userId });
    return toProfileResponse(updated);
  }

  async getPreferences(userId: string): Promise<PreferencesResponse> {
    let prefs = await this.repo.findPreferencesByUserId(userId);

    if (!prefs) {
      // Create default preferences on first access
      prefs = await this.repo.updatePreferences(userId, {});
    }

    if (!prefs) {
      throw new AppError('Failed to load preferences', 500, 'PREFERENCES_ERROR');
    }

    return toPreferencesResponse(prefs);
  }

  async updatePreferences(
    userId: string,
    data: UpdatePreferencesInput,
  ): Promise<PreferencesResponse> {
    const updated = await this.repo.updatePreferences(userId, data);
    if (!updated) {
      throw new AppError('Failed to update preferences', 500, 'PREFERENCES_ERROR');
    }

    logger.info('Preferences updated', { userId });
    return toPreferencesResponse(updated);
  }
}
