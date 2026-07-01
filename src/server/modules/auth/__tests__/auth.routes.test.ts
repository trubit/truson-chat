/**
 * Integration tests for auth HTTP routes.
 *
 * Strategy:
 * - Mock all long-lived connections (MongoDB, Redis, queues, sockets) so the
 *   app.ts module loads cleanly without real network I/O.
 * - Use mongodb-memory-server to provide a real (in-process) Mongoose store so
 *   the route handlers exercise the actual repository → service → model stack.
 * - Email is mocked so no SMTP calls are made.
 *
 * NOTE: jest.mock() is hoisted by ts-jest before imports, so these mocks are
 * already in place when app.ts evaluates.
 */

// ---------------------------------------------------------------------------
// Hoist mocks
// ---------------------------------------------------------------------------

jest.mock('../../../queues/index', () => ({
  emailQueue: { close: jest.fn().mockResolvedValue(undefined) },
  notificationQueue: { close: jest.fn().mockResolvedValue(undefined) },
  mediaQueue: { close: jest.fn().mockResolvedValue(undefined) },
  cleanupQueue: { close: jest.fn().mockResolvedValue(undefined) },
  analyticsQueue: { close: jest.fn().mockResolvedValue(undefined) },
  auditQueue: { close: jest.fn().mockResolvedValue(undefined) },
  allQueues: [],
  closeAllQueues: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../sockets/server', () => ({
  setupSocketServer: jest.fn().mockResolvedValue({
    close: jest.fn(),
    of: jest.fn().mockReturnValue({ use: jest.fn(), on: jest.fn() }),
  }),
}));

jest.mock('../../../database/connection', () => ({
  connectDatabase: jest.fn().mockResolvedValue(undefined),
  disconnectDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../redis/connection', () => ({
  redisClient: {
    status: 'ready',
    call: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    duplicate: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    setex: jest.fn().mockResolvedValue('OK'),
  },
  connectRedis: jest.fn().mockResolvedValue(undefined),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
  getRedisVersion: jest.fn().mockResolvedValue('7.0.0'),
}));

jest.mock('../../../emails/service.js', () => ({
  emailService: {
    sendVerification: jest.fn().mockResolvedValue(undefined),
    sendWelcome: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    send2FACode: jest.fn().mockResolvedValue(undefined),
    verify: jest.fn().mockResolvedValue(undefined),
  },
}));

// Pass all rate-limit middleware through — we test the auth logic not throttling.
jest.mock('../../../security/rateLimit', () => {
  const passThrough = (
    _req: unknown,
    _res: unknown,
    next: () => void,
  ) => next();
  return {
    generalRateLimiter: passThrough,
    authRateLimiter: passThrough,
    buildGeneralRateLimiter: () => passThrough,
    buildAuthRateLimiter: () => passThrough,
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../../app.js';
import { UserModel } from '../../../database/models/User.js';
import { ProfileModel } from '../../../database/models/Profile.js';
import { SessionModel } from '../../../database/models/Session.js';
import { RefreshTokenModel } from '../../../database/models/RefreshToken.js';
import { VerificationTokenModel } from '../../../database/models/VerificationToken.js';
import { PasswordResetTokenModel } from '../../../database/models/PasswordResetToken.js';
import { UserPreferencesModel } from '../../../database/models/UserPreferences.js';
import { SecurityLogModel } from '../../../database/models/SecurityLog.js';

// ---------------------------------------------------------------------------
// In-process MongoDB
// ---------------------------------------------------------------------------

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

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

const API = '/api/v1/auth';

const VALID_REGISTER = {
  username: 'routetestuser',
  email: 'routetest@example.com',
  password: 'RouteTest1!',
  displayName: 'Route Test User',
};

async function registerUser(overrides: Partial<typeof VALID_REGISTER> = {}) {
  const res = await request(app)
    .post(`${API}/register`)
    .send({ ...VALID_REGISTER, ...overrides });
  return res;
}

async function loginUser(email = VALID_REGISTER.email, password = VALID_REGISTER.password) {
  const res = await request(app)
    .post(`${API}/login`)
    .send({ email, password });
  return res;
}

// ---------------------------------------------------------------------------
// POST /register
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/register', () => {
  it('responds 201 with user data and tokens on valid input', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data).toHaveProperty('expiresIn');
    expect(res.body.data).toHaveProperty('sessionId');
    expect(res.body.data.user.email).toBe('routetest@example.com');
  });

  it('responds 422 when required fields are missing', async () => {
    const res = await request(app).post(`${API}/register`).send({ email: 'bad@x.com' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('responds 422 for a password that is too weak', async () => {
    const res = await registerUser({ password: 'weak' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('responds 409 when the same email is registered twice', async () => {
    await registerUser();

    const res = await registerUser({ username: 'otheruser' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('does not expose passwordHash in the response', async () => {
    const res = await registerUser();

    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('twoFactorSecret');
  });
});

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await registerUser();
  });

  it('responds 200 with user data and tokens on valid credentials', async () => {
    const res = await loginUser();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe(VALID_REGISTER.email);
  });

  it('responds 401 on wrong password', async () => {
    const res = await loginUser(VALID_REGISTER.email, 'WrongPass99!');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('responds 422 when email is missing', async () => {
    const res = await request(app).post(`${API}/login`).send({ password: 'RouteTest1!' });

    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------

describe('GET /api/v1/auth/me', () => {
  it('responds 401 without a token', async () => {
    const res = await request(app).get(`${API}/me`);

    expect(res.status).toBe(401);
  });

  it('responds 200 with the authenticated user when a valid token is provided', async () => {
    await registerUser();
    const loginRes = await loginUser();
    const { accessToken } = loginRes.body.data as { accessToken: string };

    const res = await request(app)
      .get(`${API}/me`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(VALID_REGISTER.email);
  });

  it('responds 401 when the token is malformed', async () => {
    const res = await request(app)
      .get(`${API}/me`)
      .set('Authorization', 'Bearer not.a.real.token');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /logout
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/logout', () => {
  it('responds 401 without a token', async () => {
    const res = await request(app).post(`${API}/logout`);

    expect(res.status).toBe(401);
  });

  it('responds 200 and revokes the session when a valid token is provided', async () => {
    await registerUser();
    const loginRes = await loginUser();
    const { accessToken, sessionId } = loginRes.body.data as {
      accessToken: string;
      sessionId: string;
    };

    const res = await request(app)
      .post(`${API}/logout`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Session should now be inactive
    const session = await SessionModel.findById(sessionId).exec();
    if (session) {
      expect(session.isActive).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// POST /refresh
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/refresh', () => {
  it('responds 200 with new tokens on a valid refresh token', async () => {
    await registerUser();
    const loginRes = await loginUser();
    const { refreshToken } = loginRes.body.data as { refreshToken: string };

    const res = await request(app)
      .post(`${API}/refresh`)
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('responds 401 on an invalid refresh token', async () => {
    const res = await request(app)
      .post(`${API}/refresh`)
      .send({ refreshToken: 'invalid.refresh.token' });

    expect(res.status).toBe(401);
  });

  it('responds 422 when refreshToken field is missing', async () => {
    const res = await request(app).post(`${API}/refresh`).send({});

    expect(res.status).toBe(422);
  });
});
