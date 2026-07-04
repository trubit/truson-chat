/**
 * Unit tests for AuthService.
 *
 * Uses mongodb-memory-server for in-process MongoDB — no real network I/O.
 * Email and Redis are mocked at the module level.
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { UserModel } from '../../../database/models/User.js';
import { ProfileModel } from '../../../database/models/Profile.js';
import { SessionModel } from '../../../database/models/Session.js';
import { RefreshTokenModel } from '../../../database/models/RefreshToken.js';
import { VerificationTokenModel } from '../../../database/models/VerificationToken.js';
import { PasswordResetTokenModel } from '../../../database/models/PasswordResetToken.js';
import { UserPreferencesModel } from '../../../database/models/UserPreferences.js';
import { SecurityLogModel } from '../../../database/models/SecurityLog.js';
import { AuthRepository } from '../repository/index.js';
import { AuthService } from '../service/index.js';

// ---------------------------------------------------------------------------
// Module mocks — must appear before any import that transitively uses them
// ---------------------------------------------------------------------------

jest.mock('../../../emails/service.js', () => ({
  emailService: {
    sendVerification: jest.fn().mockResolvedValue(undefined),
    sendWelcome: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    send2FACode: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../redis/connection.js', () => ({
  redisClient: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    setex: jest.fn().mockResolvedValue('OK'),
    status: 'ready',
    call: jest.fn(),
  },
}));

// Provide minimal env for JWT service
process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-minimum-32-chars-long!!';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-minimum-32-chars-long!';
process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';
process.env['CLIENT_URL'] = 'http://localhost:3000';
process.env['BCRYPT_ROUNDS'] = '4'; // fast for tests
process.env['NODE_ENV'] = 'test';
process.env['EMAIL_VERIFY_EXPIRY_HOURS'] = '24';
process.env['PASSWORD_RESET_EXPIRY_MINUTES'] = '30';
process.env['OTP_EXPIRY_MINUTES'] = '10';

// ---------------------------------------------------------------------------
// In-process MongoDB
// ---------------------------------------------------------------------------

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  await mongoose.connect(mongod.getUri());
}, 70000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await Promise.all([
    UserModel.deleteMany({}),
    ProfileModel.deleteMany({}),
    SessionModel.deleteMany({}),
    RefreshTokenModel.deleteMany({}),
    VerificationTokenModel.deleteMany({}),
    PasswordResetTokenModel.deleteMany({}),
    UserPreferencesModel.deleteMany({}),
    SecurityLogModel.deleteMany({}),
  ]);
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService(): AuthService {
  return new AuthService(new AuthRepository());
}

const IP = '127.0.0.1';
const UA = 'Jest/1.0';

const BASE_REGISTER_INPUT = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'TestPass1!',
  displayName: 'Test User',
};

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------

describe('AuthService.register', () => {
  it('creates a user, profile, preferences, session and returns tokens', async () => {
    const service = makeService();
    const result = await service.register(BASE_REGISTER_INPUT, IP, UA);

    // Response shape
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result).toHaveProperty('expiresIn');
    expect(result).toHaveProperty('sessionId');

    // User fields
    expect(result.user.username).toBe('testuser');
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.emailVerified).toBe(false);
    expect(result.user.status).toBe('pending_verification');

    // DB records created
    const dbUser = await UserModel.findOne({ email: 'test@example.com' });
    expect(dbUser).not.toBeNull();

    const profile = await ProfileModel.findOne({ userId: dbUser!._id });
    expect(profile).not.toBeNull();
    expect(profile!.displayName).toBe('Test User');

    const prefs = await UserPreferencesModel.findOne({ userId: dbUser!._id });
    expect(prefs).not.toBeNull();

    const session = await SessionModel.findById(result.sessionId);
    expect(session).not.toBeNull();
    expect(session!.isActive).toBe(true);

    const refreshToken = await RefreshTokenModel.findOne({ sessionId: session!._id });
    expect(refreshToken).not.toBeNull();
    expect(refreshToken!.isRevoked).toBe(false);
  });

  it('throws 409 when email is already registered', async () => {
    const service = makeService();
    await service.register(BASE_REGISTER_INPUT, IP, UA);

    await expect(
      service.register(
        { ...BASE_REGISTER_INPUT, username: 'differentuser' },
        IP,
        UA,
      ),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('throws 409 when username is already taken', async () => {
    const service = makeService();
    await service.register(BASE_REGISTER_INPUT, IP, UA);

    await expect(
      service.register(
        { ...BASE_REGISTER_INPUT, email: 'other@example.com' },
        IP,
        UA,
      ),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('sends a verification email after registration', async () => {
    const { emailService } = await import('../../../emails/service.js');
    const service = makeService();
    await service.register(BASE_REGISTER_INPUT, IP, UA);

    // Allow fire-and-forget to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(emailService.sendVerification).toHaveBeenCalledTimes(1);
  });

  it('does not expose passwordHash in the response', async () => {
    const service = makeService();
    const result = await service.register(BASE_REGISTER_INPUT, IP, UA);

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('twoFactorSecret');
  });
});

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

describe('AuthService.login', () => {
  async function seedUser(overrides: Partial<{
    status: 'active' | 'suspended' | 'deleted' | 'pending_verification';
    loginAttempts: number;
    lockoutUntil: Date;
  }> = {}) {
    const passwordHash = await bcrypt.hash('TestPass1!', 4);
    const user = await UserModel.create({
      username: 'loginuser',
      email: 'login@example.com',
      passwordHash,
      role: 'user',
      status: overrides.status ?? 'active',
      emailVerified: true,
      phoneVerified: false,
      loginAttempts: overrides.loginAttempts ?? 0,
      lockoutUntil: overrides.lockoutUntil,
    });
    await ProfileModel.create({ userId: user._id, displayName: 'Login User' });
    return user;
  }

  it('returns tokens and user on valid credentials', async () => {
    await seedUser();
    const service = makeService();

    const result = await service.login(
      { email: 'login@example.com', password: 'TestPass1!' },
      IP,
      UA,
    );

    expect(result.user.email).toBe('login@example.com');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.sessionId).toBeTruthy();
  });

  it('throws 401 on wrong password and increments loginAttempts', async () => {
    const user = await seedUser();
    const service = makeService();

    await expect(
      service.login({ email: 'login@example.com', password: 'WrongPass99!' }, IP, UA),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });

    const updated = await UserModel.findById(user._id).exec();
    expect(updated!.loginAttempts).toBe(1);
  });

  it('locks the account after 5 failed attempts', async () => {
    await seedUser();
    const service = makeService();

    // 5 bad attempts
    for (let i = 0; i < 5; i++) {
      await service
        .login({ email: 'login@example.com', password: 'Bad!!' }, IP, UA)
        .catch(() => undefined);
    }

    const updated = await UserModel.findById(
      (await UserModel.findOne({ email: 'login@example.com' }))!._id,
    ).exec();
    expect(updated!.lockoutUntil).toBeDefined();
    expect(updated!.lockoutUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('throws 423 for a locked account', async () => {
    const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    await seedUser({ loginAttempts: 5, lockoutUntil: lockUntil });
    const service = makeService();

    await expect(
      service.login({ email: 'login@example.com', password: 'TestPass1!' }, IP, UA),
    ).rejects.toMatchObject({ statusCode: 423, code: 'ACCOUNT_LOCKED' });
  });

  it('throws 403 for a suspended account', async () => {
    await seedUser({ status: 'suspended' });
    const service = makeService();

    await expect(
      service.login({ email: 'login@example.com', password: 'TestPass1!' }, IP, UA),
    ).rejects.toMatchObject({ statusCode: 403, code: 'ACCOUNT_SUSPENDED' });
  });

  it('throws 401 for unknown email', async () => {
    const service = makeService();

    await expect(
      service.login({ email: 'nobody@example.com', password: 'TestPass1!' }, IP, UA),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('creates session with 30-day expiry when rememberMe is true', async () => {
    await seedUser();
    const service = makeService();

    const result = await service.login(
      { email: 'login@example.com', password: 'TestPass1!', rememberMe: true },
      IP,
      UA,
    );

    const session = await SessionModel.findById(result.sessionId).exec();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const diffMs = session!.expiresAt.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(thirtyDaysMs - 5000);
  });
});

// ---------------------------------------------------------------------------
// refreshTokens
// ---------------------------------------------------------------------------

describe('AuthService.refreshTokens', () => {
  async function registerAndLogin() {
    const service = makeService();
    const auth = await service.register(BASE_REGISTER_INPUT, IP, UA);
    return { service, auth };
  }

  it('returns a new token pair on valid refresh token', async () => {
    const { service, auth } = await registerAndLogin();

    const result = await service.refreshTokens(auth.refreshToken, IP);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(auth.refreshToken);
  });

  it('revokes the old refresh token after rotation', async () => {
    const { jwtService } = await import('../../../services/jwt.js');
    const { service, auth } = await registerAndLogin();
    const oldHash = jwtService.hashToken(auth.refreshToken);

    await service.refreshTokens(auth.refreshToken, IP);

    const oldStored = await RefreshTokenModel.findOne({ tokenHash: oldHash }).exec();
    expect(oldStored!.isRevoked).toBe(true);
    expect(oldStored!.replacedBy).toBeDefined();
  });

  it('throws 401 for a revoked token', async () => {
    const { service, auth } = await registerAndLogin();
    // First rotation succeeds and revokes the original
    await service.refreshTokens(auth.refreshToken, IP);

    // Second use of the same old token → TOKEN_INVALID
    await expect(
      service.refreshTokens(auth.refreshToken, IP),
    ).rejects.toMatchObject({ statusCode: 401, code: 'TOKEN_INVALID' });
  });

  it('throws 401 for an unknown token', async () => {
    const service = makeService();

    await expect(
      service.refreshTokens('totally.invalid.token', IP),
    ).rejects.toMatchObject({ statusCode: 401, code: 'TOKEN_INVALID' });
  });

  it('revokes all user tokens when a revoked token is reused (reuse detection)', async () => {
    const { service, auth } = await registerAndLogin();
    const rotated = await service.refreshTokens(auth.refreshToken, IP);

    // Use the rotated token once more (valid)
    await service.refreshTokens(rotated.refreshToken, IP);

    // Now replay the already-revoked first token — should trigger reuse detection
    await expect(
      service.refreshTokens(auth.refreshToken, IP),
    ).rejects.toMatchObject({ statusCode: 401, code: 'TOKEN_INVALID' });

    // All tokens should now be revoked
    const activeTokens = await RefreshTokenModel.find({
      isRevoked: false,
    }).exec();
    expect(activeTokens.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// verifyEmail
// ---------------------------------------------------------------------------

describe('AuthService.verifyEmail', () => {
  it('sets emailVerified to true for a valid token', async () => {
    const service = makeService();
    await service.register(BASE_REGISTER_INPUT, IP, UA);

    // Extract the raw token from the VerificationToken record
    const vt = await VerificationTokenModel.findOne({ type: 'email_verification' }).exec();
    expect(vt).not.toBeNull();

    // Re-derive the raw token: we stored the hash, so regenerate using the
    // known hash logic; instead just query the user and feed a matching token.
    // Since we can't reverse the hash, we'll create a fresh record manually.
    const { jwtService } = await import('../../../services/jwt.js');
    const rawToken = 'raw-email-verify-token-0123456789abcdef';
    const hash = jwtService.hashToken(rawToken);

    const user = await UserModel.findOne({ email: 'test@example.com' }).exec();
    await VerificationTokenModel.create({
      userId: user!._id,
      email: 'test@example.com',
      type: 'email_verification',
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      isUsed: false,
    });

    await service.verifyEmail(rawToken);

    const updated = await UserModel.findById(user!._id).exec();
    expect(updated!.emailVerified).toBe(true);
  });

  it('throws 400 for an invalid token', async () => {
    const service = makeService();
    await expect(service.verifyEmail('nonexistent-token')).rejects.toMatchObject({
      statusCode: 400,
      code: 'TOKEN_INVALID',
    });
  });

  it('throws 400 for an already-used token', async () => {
    const service = makeService();
    const { jwtService } = await import('../../../services/jwt.js');

    const user = await UserModel.create({
      username: 'verifyuser',
      email: 'verify@example.com',
      passwordHash: 'hash',
      role: 'user',
      status: 'pending_verification',
    });

    const rawToken = 'already-used-token-abc123';
    await VerificationTokenModel.create({
      userId: user._id,
      email: 'verify@example.com',
      type: 'email_verification',
      tokenHash: jwtService.hashToken(rawToken),
      expiresAt: new Date(Date.now() + 3600 * 1000),
      isUsed: true,
      usedAt: new Date(),
    });

    await expect(service.verifyEmail(rawToken)).rejects.toMatchObject({
      statusCode: 400,
      code: 'TOKEN_INVALID',
    });
  });
});

// ---------------------------------------------------------------------------
// forgotPassword
// ---------------------------------------------------------------------------

describe('AuthService.forgotPassword', () => {
  it('always resolves (even for unknown email) to prevent enumeration', async () => {
    const service = makeService();

    // Non-existent email — must not throw
    await expect(
      service.forgotPassword('nobody@example.com', IP),
    ).resolves.toBeUndefined();
  });

  it('creates a PasswordResetToken and sends email for a known user', async () => {
    const { emailService } = await import('../../../emails/service.js');
    const service = makeService();
    await service.register(BASE_REGISTER_INPUT, IP, UA);
    jest.clearAllMocks();

    await service.forgotPassword('test@example.com', IP);

    const token = await PasswordResetTokenModel.findOne({
      email: 'test@example.com',
    }).exec();
    expect(token).not.toBeNull();
    expect(token!.isUsed).toBe(false);

    expect(emailService.sendPasswordReset).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// resetPassword
// ---------------------------------------------------------------------------

describe('AuthService.resetPassword', () => {
  it('updates passwordHash and marks token used', async () => {
    const { jwtService } = await import('../../../services/jwt.js');
    const service = makeService();
    await service.register(BASE_REGISTER_INPUT, IP, UA);

    const user = await UserModel.findOne({ email: 'test@example.com' }).exec();

    const rawToken = 'reset-token-abc123';
    const tokenHash = jwtService.hashToken(rawToken);
    await PasswordResetTokenModel.create({
      userId: user!._id,
      email: 'test@example.com',
      tokenHash,
      expiresAt: new Date(Date.now() + 1800 * 1000),
      isUsed: false,
    });

    await service.resetPassword(rawToken, 'NewSecure99!@', IP);

    const updated = await UserModel.findById(user!._id).select('+passwordHash').exec();
    const passwordChanged = await bcrypt.compare('NewSecure99!@', updated!.passwordHash);
    expect(passwordChanged).toBe(true);

    const usedToken = await PasswordResetTokenModel.findOne({ tokenHash }).exec();
    expect(usedToken!.isUsed).toBe(true);
  });

  it('throws 400 for an invalid reset token', async () => {
    const service = makeService();

    await expect(
      service.resetPassword('bad-token', 'NewSecure99!@', IP),
    ).rejects.toMatchObject({ statusCode: 400, code: 'TOKEN_INVALID' });
  });

  it('throws 400 for an already-used reset token', async () => {
    const { jwtService } = await import('../../../services/jwt.js');
    const service = makeService();

    const user = await UserModel.create({
      username: 'resetuser',
      email: 'reset@example.com',
      passwordHash: 'hash',
      role: 'user',
      status: 'active',
    });

    const rawToken = 'used-reset-token';
    await PasswordResetTokenModel.create({
      userId: user._id,
      email: 'reset@example.com',
      tokenHash: jwtService.hashToken(rawToken),
      expiresAt: new Date(Date.now() + 1800 * 1000),
      isUsed: true,
      usedAt: new Date(),
    });

    await expect(
      service.resetPassword(rawToken, 'NewSecure99!@', IP),
    ).rejects.toMatchObject({ statusCode: 400, code: 'TOKEN_INVALID' });
  });

  it('revokes all sessions after password reset', async () => {
    const { jwtService } = await import('../../../services/jwt.js');
    const service = makeService();
    const auth = await service.register(BASE_REGISTER_INPUT, IP, UA);

    const user = await UserModel.findById(auth.user.id).exec();
    const rawToken = 'session-revoke-token';
    await PasswordResetTokenModel.create({
      userId: user!._id,
      email: user!.email,
      tokenHash: jwtService.hashToken(rawToken),
      expiresAt: new Date(Date.now() + 1800 * 1000),
      isUsed: false,
    });

    await service.resetPassword(rawToken, 'NewSecure99!@', IP);

    const activeSessions = await SessionModel.find({ userId: user!._id, isActive: true }).exec();
    expect(activeSessions.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// changePassword
// ---------------------------------------------------------------------------

describe('AuthService.changePassword', () => {
  it('updates password when currentPassword is correct', async () => {
    const service = makeService();
    const auth = await service.register(BASE_REGISTER_INPUT, IP, UA);

    await service.changePassword(auth.user.id, 'TestPass1!', 'NewPass2@', IP);

    const updated = await UserModel.findById(auth.user.id).select('+passwordHash').exec();
    const isValid = await bcrypt.compare('NewPass2@', updated!.passwordHash);
    expect(isValid).toBe(true);
  });

  it('throws 401 when currentPassword is incorrect', async () => {
    const service = makeService();
    const auth = await service.register(BASE_REGISTER_INPUT, IP, UA);

    await expect(
      service.changePassword(auth.user.id, 'WrongPass!1', 'NewPass2@', IP),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('revokes all sessions after password change', async () => {
    const service = makeService();
    const auth = await service.register(BASE_REGISTER_INPUT, IP, UA);

    await service.changePassword(auth.user.id, 'TestPass1!', 'NewPass2@', IP);

    const activeSessions = await SessionModel.find({
      userId: auth.user.id,
      isActive: true,
    }).exec();
    expect(activeSessions.length).toBe(0);
  });
});
