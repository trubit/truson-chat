/**
 * Unit tests for SessionsService.
 *
 * All Mongoose model methods are mocked so no database connection is needed.
 */

import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

jest.mock('../../../database/models/Session.js', () => ({
  SessionModel: {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../../../database/models/RefreshToken.js', () => ({
  RefreshTokenModel: {
    updateMany: jest.fn(),
  },
}));

jest.mock('../../../database/models/SecurityLog.js', () => ({
  SecurityLogModel: {
    create: jest.fn(),
  },
}));

jest.mock('../../../logger/index.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { SessionModel } from '../../../database/models/Session.js';
import { SessionsService } from '../service/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeObjectId(): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId();
}

function buildSession(overrides: Record<string, unknown> = {}) {
  const id = makeObjectId();
  return {
    _id: id,
    userId: makeObjectId(),
    ipAddress: '127.0.0.1',
    userAgent: 'TestAgent/1.0',
    isActive: true,
    lastActivityAt: new Date('2024-01-01T10:00:00Z'),
    expiresAt: new Date('2024-02-01T10:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(() => {
    service = new SessionsService();
    jest.clearAllMocks();
  });

  // ── listSessions ──────────────────────────────────────────────────────────

  describe('listSessions', () => {
    it('returns active sessions with isCurrent flag set correctly', async () => {
      const currentId = makeObjectId();
      const otherId = makeObjectId();

      const mockSessions = [buildSession({ _id: currentId }), buildSession({ _id: otherId })];

      const sortMock = jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue(mockSessions) });
      (SessionModel.find as jest.Mock).mockReturnValue({ sort: sortMock });

      const result = await service.listSessions(
        makeObjectId().toHexString(),
        currentId.toHexString(),
      );

      expect(result.sessions).toHaveLength(2);
      const current = result.sessions.find((s) => s.id === currentId.toHexString());
      const other = result.sessions.find((s) => s.id === otherId.toHexString());

      expect(current?.isCurrent).toBe(true);
      expect(other?.isCurrent).toBe(false);
      expect(result.currentSessionId).toBe(currentId.toHexString());
    });
  });

  // ── revokeSession — current session ───────────────────────────────────────

  describe('revokeSession', () => {
    it('throws 400 CANNOT_REVOKE_CURRENT_SESSION when sessionId equals currentSessionId', async () => {
      const sessionId = makeObjectId().toHexString();

      await expect(
        service.revokeSession(
          makeObjectId().toHexString(),
          sessionId,
          sessionId,
          '127.0.0.1',
          'TestAgent',
        ),
      ).rejects.toMatchObject({
        code: 'CANNOT_REVOKE_CURRENT_SESSION',
        statusCode: 400,
      });
    });

    it('throws 404 SESSION_NOT_FOUND when session does not exist', async () => {
      (SessionModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.revokeSession(
          makeObjectId().toHexString(),
          makeObjectId().toHexString(),
          makeObjectId().toHexString(),
          '127.0.0.1',
          'TestAgent',
        ),
      ).rejects.toMatchObject({
        code: 'SESSION_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('throws 403 FORBIDDEN when session belongs to another user', async () => {
      const userId = makeObjectId();
      const sessionId = makeObjectId();
      const currentSessionId = makeObjectId();

      const session = buildSession({
        _id: sessionId,
        userId: makeObjectId(), // different user
      });

      (SessionModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(session),
      });

      await expect(
        service.revokeSession(
          userId.toHexString(),
          sessionId.toHexString(),
          currentSessionId.toHexString(),
          '127.0.0.1',
          'TestAgent',
        ),
      ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
    });

    it('successfully revokes a valid non-current session', async () => {
      const userId = makeObjectId();
      const sessionId = makeObjectId();
      const currentSessionId = makeObjectId();

      const session = buildSession({ _id: sessionId, userId });

      (SessionModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(session),
      });
      (SessionModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const { RefreshTokenModel } = await import('../../../database/models/RefreshToken.js');
      const { SecurityLogModel } = await import('../../../database/models/SecurityLog.js');

      (RefreshTokenModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });
      (SecurityLogModel.create as jest.Mock).mockResolvedValue({});

      await expect(
        service.revokeSession(
          userId.toHexString(),
          sessionId.toHexString(),
          currentSessionId.toHexString(),
          '127.0.0.1',
          'TestAgent',
        ),
      ).resolves.toBeUndefined();

      expect(SessionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        sessionId.toHexString(),
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  // ── revokeAllSessions ─────────────────────────────────────────────────────

  describe('revokeAllSessions', () => {
    it('revokes all sessions except the current one and returns revokedCount', async () => {
      const userId = makeObjectId();
      const currentSessionId = makeObjectId();
      const otherSessions = [{ _id: makeObjectId() }, { _id: makeObjectId() }];

      const selectMock = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(otherSessions),
      });
      (SessionModel.find as jest.Mock).mockReturnValue({ select: selectMock });
      (SessionModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });

      const { RefreshTokenModel } = await import('../../../database/models/RefreshToken.js');
      const { SecurityLogModel } = await import('../../../database/models/SecurityLog.js');

      (RefreshTokenModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });
      (SecurityLogModel.create as jest.Mock).mockResolvedValue({});

      const result = await service.revokeAllSessions(
        userId.toHexString(),
        currentSessionId.toHexString(),
        '127.0.0.1',
        'TestAgent',
      );

      expect(result.revokedCount).toBe(2);
      expect(SessionModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.objectContaining({ $in: otherSessions.map((s) => s._id) }),
        }),
        expect.objectContaining({ isActive: false }),
      );
    });

    it('returns revokedCount 0 when no other sessions exist', async () => {
      const selectMock = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (SessionModel.find as jest.Mock).mockReturnValue({ select: selectMock });

      const { SecurityLogModel } = await import('../../../database/models/SecurityLog.js');
      (SecurityLogModel.create as jest.Mock).mockResolvedValue({});

      const result = await service.revokeAllSessions(
        makeObjectId().toHexString(),
        makeObjectId().toHexString(),
        '127.0.0.1',
        'TestAgent',
      );

      expect(result.revokedCount).toBe(0);
      expect(SessionModel.updateMany).not.toHaveBeenCalled();
    });
  });
});
