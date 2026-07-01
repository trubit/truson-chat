import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getEnv } from '../../../config/env.js';
import { jwtService } from '../../../services/jwt.js';
import { emailService } from '../../../emails/service.js';
import { redisClient } from '../../../redis/connection.js';
import { logger } from '../../../logger/index.js';
import { AppError } from '../../../middlewares/errorHandler.js';
import type { IUser } from '../../../database/models/User.js';
import { RefreshTokenModel } from '../../../database/models/RefreshToken.js';
import { ProfileModel } from '../../../database/models/Profile.js';
import type { AuthRepository } from '../repository/index.js';
import type {
  AuthResponse,
  SafeUser,
  TokenResponse,
  RegisterInput,
  LoginInput,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSafeUser(user: IUser): SafeUser {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    lastSeen: user.lastSeen?.toISOString(),
    createdAt: user.createdAt.toISOString(),
  };
}

function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------------
// AuthService
// ---------------------------------------------------------------------------

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  // ── register ───────────────────────────────────────────────────────────────

  async register(
    input: RegisterInput,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponse> {
    const env = getEnv();

    // Uniqueness checks
    const [existingEmail, existingUsername] = await Promise.all([
      this.repo.findUserByEmail(input.email),
      this.repo.findUserByUsername(input.username),
    ]);

    if (existingEmail) {
      throw new AppError('Email address is already registered', 409, 'CONFLICT');
    }
    if (existingUsername) {
      throw new AppError('Username is already taken', 409, 'CONFLICT');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

    // Create user + profile (repository handles both)
    const user = await this.repo.createUser({
      username: input.username,
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      phone: input.phone,
    });

    const userId = user._id.toString();

    // Default preferences
    await this.repo.createDefaultPreferences(userId);

    // Session (7-day default for new registrations)
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await this.repo.createSession({
      userId,
      ipAddress,
      userAgent,
      expiresAt: sessionExpiresAt,
    });

    const sessionId = session._id.toString();

    // Token pair
    const tokenPair = jwtService.generateTokenPair(userId, user.email, user.role, sessionId);

    // Refresh token (TTL from env)
    const refreshExpiresIn = jwtService.parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN);
    const refreshExpiresAt = new Date(Date.now() + refreshExpiresIn * 1000);
    const refreshTokenHash = jwtService.hashToken(tokenPair.refreshToken);

    await this.repo.createRefreshToken({
      userId,
      sessionId,
      tokenHash: refreshTokenHash,
      expiresAt: refreshExpiresAt,
      ipAddress,
    });

    // Send verification email (fire-and-forget — don't block registration)
    const rawVerifyToken = generateRawToken();
    const verifyTokenHash = jwtService.hashToken(rawVerifyToken);
    const verifyExpiresAt = new Date(
      Date.now() + env.EMAIL_VERIFY_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    await this.repo.createVerificationToken(
      userId,
      user.email,
      'email_verification',
      verifyTokenHash,
      verifyExpiresAt,
    );

    const verificationUrl = `${env.CLIENT_URL}/verify-email/${rawVerifyToken}`;
    emailService
      .sendVerification(user.email, input.displayName, verificationUrl)
      .catch((err: unknown) => {
        logger.error('Failed to send verification email', {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    // Security log
    await this.repo.logSecurityEvent({
      userId,
      eventType: 'login_success',
      ipAddress,
      userAgent,
      severity: 'low',
      metadata: { action: 'register' },
    });

    return {
      user: toSafeUser(user),
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      sessionId,
    };
  }

  // ── login ──────────────────────────────────────────────────────────────────

  async login(
    input: LoginInput,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponse> {
    const env = getEnv();

    const user = await this.repo.findUserByEmail(input.email, true);

    if (!user) {
      // Return a generic error to prevent user enumeration
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Status checks
    if (user.status === 'suspended') {
      throw new AppError('Account has been suspended', 403, 'ACCOUNT_SUSPENDED');
    }
    if (user.status === 'deleted') {
      throw new AppError('Account not found', 404, 'USER_NOT_FOUND');
    }

    // Lockout check
    if (user.isLocked()) {
      const lockoutUntil = user.lockoutUntil!;
      const minutesLeft = Math.ceil((lockoutUntil.getTime() - Date.now()) / 60_000);
      throw new AppError(
        `Account is temporarily locked. Try again in ${minutesLeft} minute(s).`,
        423,
        'ACCOUNT_LOCKED',
      );
    }

    // Password verification
    const passwordValid = await user.comparePassword(input.password);

    if (!passwordValid) {
      await this.repo.incrementLoginAttempts(user._id.toString());

      const updatedAttempts = user.loginAttempts + 1;
      if (updatedAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await this.repo.lockUser(user._id.toString(), lockUntil);
        await this.repo.logSecurityEvent({
          userId: user._id.toString(),
          eventType: 'account_locked',
          ipAddress,
          userAgent,
          severity: 'high',
          metadata: { attempts: updatedAttempts },
        });
      }

      await this.repo.logSecurityEvent({
        userId: user._id.toString(),
        eventType: 'login_failed',
        ipAddress,
        userAgent,
        severity: 'medium',
        metadata: { attempts: updatedAttempts },
      });

      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Reset login attempts on success
    await this.repo.resetLoginAttempts(user._id.toString());

    // Session expiry: 30 days if rememberMe, else 7 days
    const sessionDays = input.rememberMe ? 30 : 7;
    const sessionExpiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

    const session = await this.repo.createSession({
      userId: user._id.toString(),
      ipAddress,
      userAgent,
      expiresAt: sessionExpiresAt,
    });

    const sessionId = session._id.toString();

    // Token pair
    const tokenPair = jwtService.generateTokenPair(
      user._id.toString(),
      user.email,
      user.role,
      sessionId,
    );

    // Refresh token
    const refreshExpiresIn = jwtService.parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN);
    const refreshExpiresAt = new Date(Date.now() + refreshExpiresIn * 1000);
    const refreshTokenHash = jwtService.hashToken(tokenPair.refreshToken);

    await this.repo.createRefreshToken({
      userId: user._id.toString(),
      sessionId,
      tokenHash: refreshTokenHash,
      expiresAt: refreshExpiresAt,
      ipAddress,
    });

    await this.repo.logSecurityEvent({
      userId: user._id.toString(),
      eventType: 'login_success',
      ipAddress,
      userAgent,
      severity: 'low',
    });

    return {
      user: toSafeUser(user),
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      sessionId,
    };
  }

  // ── logout ─────────────────────────────────────────────────────────────────

  async logout(userId: string, sessionId: string): Promise<void> {
    const session = await this.repo.findSessionById(sessionId);

    if (session && session.isActive) {
      await this.repo.revokeSession(sessionId, 'user_logout');
    }

    // Revoke the refresh token(s) tied to this session
    await RefreshTokenModel.updateMany(
      {
        sessionId: session?._id ?? sessionId,
        isRevoked: false,
      },
      { $set: { isRevoked: true, revokedAt: new Date() } },
    ).exec();

    await this.repo.logSecurityEvent({
      userId,
      eventType: 'logout',
      severity: 'low',
    });
  }

  // ── refreshTokens ──────────────────────────────────────────────────────────

  async refreshTokens(refreshToken: string, ipAddress: string): Promise<TokenResponse> {
    const env = getEnv();

    const tokenHash = jwtService.hashToken(refreshToken);
    const storedToken = await this.repo.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw new AppError('Refresh token not found', 401, 'TOKEN_INVALID');
    }

    if (storedToken.isRevoked) {
      // Potential token reuse — revoke all tokens for this user
      await this.repo.revokeAllUserRefreshTokens(storedToken.userId.toString());
      await this.repo.revokeAllUserSessions(storedToken.userId.toString());
      throw new AppError('Refresh token has been revoked', 401, 'TOKEN_INVALID');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new AppError('Refresh token has expired', 401, 'TOKEN_EXPIRED');
    }

    // Verify JWT signature
    let payload;
    try {
      payload = jwtService.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid refresh token', 401, 'TOKEN_INVALID');
    }

    if (payload.type !== 'refresh') {
      throw new AppError('Invalid token type', 401, 'TOKEN_INVALID');
    }

    // Ensure the session is still active
    const session = await this.repo.findSessionById(storedToken.sessionId.toString());
    if (!session || !session.isActive || session.expiresAt < new Date()) {
      throw new AppError('Session has expired or been revoked', 401, 'TOKEN_INVALID');
    }

    // Rotate: create a new session + token pair, revoke old token
    const newSessionExpiresAt = new Date(session.expiresAt); // preserve original expiry
    const newSession = await this.repo.createSession({
      userId: storedToken.userId.toString(),
      ipAddress,
      userAgent: session.userAgent,
      location: session.location,
      expiresAt: newSessionExpiresAt,
    });

    const newSessionId = newSession._id.toString();

    const tokenPair = jwtService.generateTokenPair(
      storedToken.userId.toString(),
      payload.email,
      payload.role,
      newSessionId,
    );

    const refreshExpiresIn = jwtService.parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN);
    const newRefreshExpiresAt = new Date(Date.now() + refreshExpiresIn * 1000);
    const newRefreshTokenHash = jwtService.hashToken(tokenPair.refreshToken);

    const newRefreshToken = await this.repo.createRefreshToken({
      userId: storedToken.userId.toString(),
      sessionId: newSessionId,
      tokenHash: newRefreshTokenHash,
      expiresAt: newRefreshExpiresAt,
      ipAddress,
    });

    // Revoke old token, point it at the replacement
    await this.repo.revokeRefreshToken(
      storedToken._id.toString(),
      newRefreshToken._id.toString(),
    );

    // Revoke old session
    await this.repo.revokeSession(storedToken.sessionId.toString(), 'token_rotated');

    await this.repo.logSecurityEvent({
      userId: storedToken.userId.toString(),
      eventType: 'token_refreshed',
      ipAddress,
      severity: 'low',
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
    };
  }

  // ── getMe ──────────────────────────────────────────────────────────────────

  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return toSafeUser(user);
  }

  // ── verifyEmail ────────────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = jwtService.hashToken(token);
    const record = await this.repo.findVerificationToken(tokenHash, 'email_verification');

    if (!record) {
      throw new AppError('Invalid verification token', 400, 'TOKEN_INVALID');
    }

    if (record.isUsed) {
      throw new AppError('Verification token has already been used', 400, 'TOKEN_INVALID');
    }

    if (record.expiresAt < new Date()) {
      throw new AppError('Verification token has expired', 400, 'TOKEN_EXPIRED');
    }

    await this.repo.useVerificationToken(record._id.toString());
    await this.repo.updateUser(record.userId.toString(), {
      emailVerified: true,
    } as Partial<IUser>);

    await this.repo.logSecurityEvent({
      userId: record.userId.toString(),
      eventType: 'email_verified',
      severity: 'low',
    });
  }

  // ── resendVerification ─────────────────────────────────────────────────────

  async resendVerification(userId: string, email: string): Promise<void> {
    const env = getEnv();

    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.emailVerified) {
      throw new AppError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
    }

    // Invalidate all outstanding email_verification tokens for this user
    await this.repo.invalidateUserVerificationTokens(userId, 'email_verification');

    // Create a new token
    const rawToken = generateRawToken();
    const tokenHash = jwtService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.EMAIL_VERIFY_EXPIRY_HOURS * 60 * 60 * 1000);

    await this.repo.createVerificationToken(
      userId,
      email,
      'email_verification',
      tokenHash,
      expiresAt,
    );

    const verificationUrl = `${env.CLIENT_URL}/verify-email/${rawToken}`;

    // Get display name from profile for the email
    const profile = await ProfileModel.findOne({ userId: user._id }).select('displayName').lean();
    const displayName = profile?.displayName ?? user.username;

    await emailService.sendVerification(email, displayName, verificationUrl);
  }

  // ── forgotPassword ─────────────────────────────────────────────────────────

  async forgotPassword(email: string, ipAddress: string): Promise<void> {
    const env = getEnv();

    const user = await this.repo.findUserByEmail(email);

    // Always succeed silently even when no account exists (security best practice)
    if (!user) {
      logger.info('Password reset requested for unknown email', { email });
      return;
    }

    // Invalidate previous reset tokens
    await this.repo.invalidateUserPasswordResetTokens(user._id.toString());

    // Create new reset token
    const rawToken = generateRawToken();
    const tokenHash = jwtService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

    await this.repo.createPasswordResetToken(
      user._id.toString(),
      user.email,
      tokenHash,
      expiresAt,
      ipAddress,
    );

    const profile = await ProfileModel.findOne({ userId: user._id }).select('displayName').lean();
    const displayName = profile?.displayName ?? user.username;

    const resetUrl = `${env.CLIENT_URL}/reset-password/${rawToken}`;

    await emailService.sendPasswordReset(
      user.email,
      displayName,
      resetUrl,
      env.PASSWORD_RESET_EXPIRY_MINUTES,
    );

    await this.repo.logSecurityEvent({
      userId: user._id.toString(),
      eventType: 'password_reset_requested',
      ipAddress,
      severity: 'medium',
    });
  }

  // ── resetPassword ──────────────────────────────────────────────────────────

  async resetPassword(token: string, newPassword: string, ipAddress: string): Promise<void> {
    const env = getEnv();

    const tokenHash = jwtService.hashToken(token);
    const record = await this.repo.findPasswordResetToken(tokenHash);

    if (!record) {
      throw new AppError('Invalid password reset token', 400, 'TOKEN_INVALID');
    }

    if (record.isUsed) {
      throw new AppError('Password reset token has already been used', 400, 'TOKEN_INVALID');
    }

    if (record.expiresAt < new Date()) {
      throw new AppError('Password reset token has expired', 400, 'TOKEN_EXPIRED');
    }

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

    await this.repo.updateUser(record.userId.toString(), {
      passwordHash,
    } as Partial<IUser>);

    await this.repo.usePasswordResetToken(record._id.toString());

    // Force re-login on all devices
    await this.repo.revokeAllUserSessions(record.userId.toString());
    await this.repo.revokeAllUserRefreshTokens(record.userId.toString());

    await this.repo.logSecurityEvent({
      userId: record.userId.toString(),
      eventType: 'password_reset_completed',
      ipAddress,
      severity: 'high',
    });
  }

  // ── changePassword ─────────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string,
  ): Promise<void> {
    const env = getEnv();

    const user = await this.repo.findUserById(userId, true);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');
    }

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

    await this.repo.updateUser(userId, { passwordHash } as Partial<IUser>);

    // Revoke all other sessions (the current one stays)
    await this.repo.revokeAllUserSessions(userId);
    await this.repo.revokeAllUserRefreshTokens(userId);

    await this.repo.logSecurityEvent({
      userId,
      eventType: 'password_changed',
      ipAddress,
      severity: 'medium',
    });
  }

  // ── sendPhoneOtp ───────────────────────────────────────────────────────────

  async sendPhoneOtp(userId: string, phone: string): Promise<void> {
    const env = getEnv();

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    const redisKey = `phone_otp:${userId}:${phone}`;
    const ttlSeconds = env.OTP_EXPIRY_MINUTES * 60;

    await redisClient.set(redisKey, otp, 'EX', ttlSeconds);

    if (env.NODE_ENV !== 'production') {
      logger.info('Phone OTP (dev mode)', { userId, phone, otp });
    } else {
      // In production, integrate with an SMS provider here (e.g. Twilio)
      logger.info('Phone OTP requested', { userId, phone });
    }
  }

  // ── verifyPhone ────────────────────────────────────────────────────────────

  async verifyPhone(userId: string, phone: string, otp: string): Promise<void> {
    const redisKey = `phone_otp:${userId}:${phone}`;

    const storedOtp = await redisClient.get(redisKey);

    if (!storedOtp) {
      throw new AppError('OTP not found or has expired', 400, 'TOKEN_INVALID');
    }

    if (storedOtp !== otp) {
      throw new AppError('Invalid OTP', 400, 'TOKEN_INVALID');
    }

    // Delete OTP from Redis (single-use)
    await redisClient.del(redisKey);

    await this.repo.updateUser(userId, {
      phone,
      phoneVerified: true,
    } as Partial<IUser>);

    await this.repo.logSecurityEvent({
      userId,
      eventType: 'phone_verified',
      severity: 'low',
      metadata: { phone },
    });
  }
}
