import mongoose from 'mongoose';
import { UserModel, type IUser } from '../../../database/models/User.js';
import { SessionModel, type ISession } from '../../../database/models/Session.js';
import { RefreshTokenModel, type IRefreshToken } from '../../../database/models/RefreshToken.js';
import {
  VerificationTokenModel,
  type IVerificationToken,
} from '../../../database/models/VerificationToken.js';
import {
  PasswordResetTokenModel,
  type IPasswordResetToken,
} from '../../../database/models/PasswordResetToken.js';
import {
  UserPreferencesModel,
  type IUserPreferences,
} from '../../../database/models/UserPreferences.js';
import { SecurityLogModel, type SecurityEventType } from '../../../database/models/SecurityLog.js';
import { ProfileModel } from '../../../database/models/Profile.js';

// ---------------------------------------------------------------------------
// Internal data-shape interfaces
// ---------------------------------------------------------------------------

export interface CreateUserData {
  username: string;
  email: string;
  passwordHash: string;
  displayName: string; // used to create the Profile record, not stored on User
  phone?: string;
}

export interface CreateSessionData {
  userId: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  location?: { country?: string; city?: string };
  expiresAt: Date;
}

export interface CreateRefreshTokenData {
  userId: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
}

export interface LogSecurityEventData {
  userId: string;
  eventType: SecurityEventType;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class AuthRepository {
  // ── User operations ────────────────────────────────────────────────────────

  async findUserByEmail(email: string, includePassword = false): Promise<IUser | null> {
    const query = UserModel.findOne({ email: email.toLowerCase() });
    if (includePassword) query.select('+passwordHash');
    return query.exec();
  }

  async findUserById(id: string, includePassword = false): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const query = UserModel.findById(id);
    if (includePassword) query.select('+passwordHash');
    return query.exec();
  }

  async findUserByUsername(username: string): Promise<IUser | null> {
    return UserModel.findOne({ username }).exec();
  }

  async findUserByPhone(phone: string): Promise<IUser | null> {
    return UserModel.findOne({ phone }).exec();
  }

  /**
   * Creates a User document AND a companion Profile document in the same
   * logical operation. displayName is passed straight to Profile.
   */
  async createUser(data: CreateUserData): Promise<IUser> {
    const { displayName, ...userFields } = data;

    const user = await UserModel.create(userFields);

    await ProfileModel.create({
      userId: user._id,
      displayName,
    });

    return user;
  }

  async updateUser(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after' }).exec();
  }

  async incrementLoginAttempts(id: string): Promise<void> {
    await UserModel.findByIdAndUpdate(id, { $inc: { loginAttempts: 1 } }).exec();
  }

  async resetLoginAttempts(id: string): Promise<void> {
    await UserModel.findByIdAndUpdate(id, {
      $set: { loginAttempts: 0 },
      $unset: { lockoutUntil: '' },
    }).exec();
  }

  async lockUser(id: string, until: Date): Promise<void> {
    await UserModel.findByIdAndUpdate(id, {
      $set: { lockoutUntil: until },
    }).exec();
  }

  // ── Session operations ─────────────────────────────────────────────────────

  async createSession(data: CreateSessionData): Promise<ISession> {
    return SessionModel.create({
      userId: new mongoose.Types.ObjectId(data.userId),
      deviceId: data.deviceId ? new mongoose.Types.ObjectId(data.deviceId) : undefined,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      location: data.location,
      expiresAt: data.expiresAt,
      isActive: true,
      lastActivityAt: new Date(),
    });
  }

  async findSessionById(id: string): Promise<ISession | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return SessionModel.findById(id).exec();
  }

  async findActiveSessionsByUser(userId: string): Promise<ISession[]> {
    return SessionModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  async revokeSession(id: string, reason?: string): Promise<void> {
    await SessionModel.findByIdAndUpdate(id, {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        ...(reason ? { revokedReason: reason } : {}),
      },
    }).exec();
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (exceptSessionId) {
      const exceptObjectId = new mongoose.Types.ObjectId(exceptSessionId);
      await SessionModel.updateMany(
        { userId: userObjectId, isActive: true, _id: { $ne: exceptObjectId } },
        { $set: { isActive: false, revokedAt: new Date(), revokedReason: 'forced_logout' } },
      ).exec();
    } else {
      await SessionModel.updateMany(
        { userId: userObjectId, isActive: true },
        { $set: { isActive: false, revokedAt: new Date(), revokedReason: 'forced_logout' } },
      ).exec();
    }
  }

  async updateSessionActivity(id: string): Promise<void> {
    await SessionModel.findByIdAndUpdate(id, {
      $set: { lastActivityAt: new Date() },
    }).exec();
  }

  // ── Refresh token operations ───────────────────────────────────────────────

  async createRefreshToken(data: CreateRefreshTokenData): Promise<IRefreshToken> {
    return RefreshTokenModel.create({
      userId: new mongoose.Types.ObjectId(data.userId),
      sessionId: new mongoose.Types.ObjectId(data.sessionId),
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      isRevoked: false,
      ipAddress: data.ipAddress,
    });
  }

  async findRefreshTokenByHash(hash: string): Promise<IRefreshToken | null> {
    return RefreshTokenModel.findOne({ tokenHash: hash }).exec();
  }

  async revokeRefreshToken(id: string, replacedBy?: string): Promise<void> {
    await RefreshTokenModel.findByIdAndUpdate(id, {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        ...(replacedBy ? { replacedBy: new mongoose.Types.ObjectId(replacedBy) } : {}),
      },
    }).exec();
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date() } },
    ).exec();
  }

  // ── Verification token operations ──────────────────────────────────────────

  async createVerificationToken(
    userId: string,
    email: string,
    type: 'email_verification' | 'phone_otp',
    tokenHash: string,
    expiresAt: Date,
  ): Promise<IVerificationToken> {
    return VerificationTokenModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      email: email.toLowerCase(),
      type,
      tokenHash,
      expiresAt,
      isUsed: false,
    });
  }

  async findVerificationToken(
    tokenHash: string,
    type: 'email_verification' | 'phone_otp',
  ): Promise<IVerificationToken | null> {
    return VerificationTokenModel.findOne({ tokenHash, type }).exec();
  }

  async useVerificationToken(id: string): Promise<void> {
    await VerificationTokenModel.findByIdAndUpdate(id, {
      $set: { isUsed: true, usedAt: new Date() },
    }).exec();
  }

  async invalidateUserVerificationTokens(
    userId: string,
    type: 'email_verification' | 'phone_otp',
  ): Promise<void> {
    await VerificationTokenModel.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        type,
        isUsed: false,
      },
      { $set: { isUsed: true, usedAt: new Date() } },
    ).exec();
  }

  // ── Password reset token operations ───────────────────────────────────────

  async createPasswordResetToken(
    userId: string,
    email: string,
    tokenHash: string,
    expiresAt: Date,
    ip?: string,
  ): Promise<IPasswordResetToken> {
    return PasswordResetTokenModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      email: email.toLowerCase(),
      tokenHash,
      expiresAt,
      isUsed: false,
      ipAddress: ip,
    });
  }

  async findPasswordResetToken(tokenHash: string): Promise<IPasswordResetToken | null> {
    return PasswordResetTokenModel.findOne({ tokenHash }).exec();
  }

  async usePasswordResetToken(id: string): Promise<void> {
    await PasswordResetTokenModel.findByIdAndUpdate(id, {
      $set: { isUsed: true, usedAt: new Date() },
    }).exec();
  }

  async invalidateUserPasswordResetTokens(userId: string): Promise<void> {
    await PasswordResetTokenModel.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), isUsed: false },
      { $set: { isUsed: true, usedAt: new Date() } },
    ).exec();
  }

  // ── Preferences ────────────────────────────────────────────────────────────

  async createDefaultPreferences(userId: string): Promise<IUserPreferences> {
    return UserPreferencesModel.create({
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  async findPreferencesByUserId(userId: string): Promise<IUserPreferences | null> {
    return UserPreferencesModel.findOne({ userId: new mongoose.Types.ObjectId(userId) }).exec();
  }

  // ── Security log ───────────────────────────────────────────────────────────

  async logSecurityEvent(data: LogSecurityEventData): Promise<void> {
    // Fire-and-forget — never let logging failures bubble up
    SecurityLogModel.create({
      userId: new mongoose.Types.ObjectId(data.userId),
      eventType: data.eventType,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      severity: data.severity ?? 'low',
      metadata: data.metadata,
    }).catch(() => undefined);
  }
}
