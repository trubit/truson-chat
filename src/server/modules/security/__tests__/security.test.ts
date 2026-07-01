/**
 * Unit tests for SecurityService.
 *
 * All Mongoose model methods are mocked so no database connection is needed.
 */

import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../database/models/SecurityLog.js', () => ({
  SecurityLogModel: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../../../database/models/AuditLog.js', () => ({
  AuditLogModel: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../../../database/models/Session.js', () => ({
  SessionModel: {
    countDocuments: jest.fn(),
  },
}));

jest.mock('../../../database/models/Device.js', () => ({
  DeviceModel: {
    countDocuments: jest.fn(),
  },
}));

import { SecurityLogModel } from '../../../database/models/SecurityLog.js';
import { AuditLogModel } from '../../../database/models/AuditLog.js';
import { SessionModel } from '../../../database/models/Session.js';
import { DeviceModel } from '../../../database/models/Device.js';
import { SecurityService } from '../service/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId();
}

function buildSecurityLog(overrides: Record<string, unknown> = {}) {
  return {
    _id: makeId(),
    userId: makeId(),
    eventType: 'login_success',
    ipAddress: '127.0.0.1',
    userAgent: 'TestAgent/1.0',
    severity: 'low',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  };
}

function buildAuditLog(overrides: Record<string, unknown> = {}) {
  return {
    _id: makeId(),
    userId: makeId(),
    action: 'user.update',
    resource: 'user',
    resourceId: makeId().toHexString(),
    ipAddress: '127.0.0.1',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  };
}

function makeChainableFindMock(results: unknown[]) {
  const chain = {
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn().mockResolvedValue(results),
  };
  chain.sort.mockReturnValue(chain);
  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SecurityService', () => {
  let service: SecurityService;

  beforeEach(() => {
    service = new SecurityService();
    jest.clearAllMocks();
  });

  // ── getSecurityLogs ───────────────────────────────────────────────────────

  describe('getSecurityLogs', () => {
    it('returns paginated security logs for the user', async () => {
      const userId = makeId().toHexString();
      const logs = [buildSecurityLog(), buildSecurityLog()];

      (SecurityLogModel.find as jest.Mock).mockReturnValue(makeChainableFindMock(logs));
      (SecurityLogModel.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await service.getSecurityLogs(userId, { page: 1, limit: 20 });

      expect(result.logs).toHaveLength(2);
      expect(result.meta).toMatchObject({
        total: 2,
        page: 1,
        limit: 20,
        hasMore: false,
      });
    });

    it('sets hasMore to true when more pages exist', async () => {
      const userId = makeId().toHexString();
      const logs = Array.from({ length: 10 }, () => buildSecurityLog());

      (SecurityLogModel.find as jest.Mock).mockReturnValue(makeChainableFindMock(logs));
      (SecurityLogModel.countDocuments as jest.Mock).mockResolvedValue(50);

      const result = await service.getSecurityLogs(userId, { page: 1, limit: 10 });

      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.total).toBe(50);
    });

    it('applies eventType filter to query', async () => {
      const userId = makeId().toHexString();

      (SecurityLogModel.find as jest.Mock).mockReturnValue(makeChainableFindMock([]));
      (SecurityLogModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await service.getSecurityLogs(userId, { eventType: 'login_failed' });

      const findCall = (SecurityLogModel.find as jest.Mock).mock.calls[0][0];
      expect(findCall).toMatchObject({ eventType: 'login_failed' });
    });
  });

  // ── getAuditLogs ──────────────────────────────────────────────────────────

  describe('getAuditLogs', () => {
    it('restricts audit logs to own userId for non-admin users', async () => {
      const userId = makeId().toHexString();
      const logs = [buildAuditLog()];

      (AuditLogModel.find as jest.Mock).mockReturnValue(makeChainableFindMock(logs));
      (AuditLogModel.countDocuments as jest.Mock).mockResolvedValue(1);

      await service.getAuditLogs(userId, { page: 1, limit: 20 }, 'user');

      const findCall = (AuditLogModel.find as jest.Mock).mock.calls[0][0];
      expect(findCall).toHaveProperty('userId');
    });

    it('does not restrict audit logs by userId for admin users', async () => {
      const userId = makeId().toHexString();
      const logs = [buildAuditLog(), buildAuditLog(), buildAuditLog()];

      (AuditLogModel.find as jest.Mock).mockReturnValue(makeChainableFindMock(logs));
      (AuditLogModel.countDocuments as jest.Mock).mockResolvedValue(3);

      await service.getAuditLogs(userId, { page: 1, limit: 20 }, 'admin');

      const findCall = (AuditLogModel.find as jest.Mock).mock.calls[0][0];
      expect(findCall).not.toHaveProperty('userId');
    });

    it('returns formatted audit log responses', async () => {
      const userId = makeId().toHexString();
      const log = buildAuditLog({ action: 'profile.update', resource: 'profile' });

      (AuditLogModel.find as jest.Mock).mockReturnValue(makeChainableFindMock([log]));
      (AuditLogModel.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await service.getAuditLogs(userId, {}, 'user');

      expect(result.logs[0]).toMatchObject({
        action: 'profile.update',
        resource: 'profile',
      });
    });
  });

  // ── getSecurityOverview ───────────────────────────────────────────────────

  describe('getSecurityOverview', () => {
    it('returns correct counts for sessions, devices, failed logins and recent events', async () => {
      const userId = makeId().toHexString();
      const recentLogs = [buildSecurityLog(), buildSecurityLog()];

      (SecurityLogModel.find as jest.Mock).mockReturnValue(makeChainableFindMock(recentLogs));
      (SecurityLogModel.countDocuments as jest.Mock).mockResolvedValue(3);
      (SessionModel.countDocuments as jest.Mock).mockResolvedValue(2);
      (DeviceModel.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await service.getSecurityOverview(userId);

      expect(result.recentEvents).toHaveLength(2);
      expect(result.failedLogins).toBe(3);
      expect(result.activeSessions).toBe(2);
      expect(result.trustedDevices).toBe(1);
    });

    it('limits recentEvents to 5 entries', async () => {
      const userId = makeId().toHexString();
      const recentLogs = Array.from({ length: 5 }, () => buildSecurityLog());

      (SecurityLogModel.find as jest.Mock).mockReturnValue(makeChainableFindMock(recentLogs));
      (SecurityLogModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (SessionModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (DeviceModel.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await service.getSecurityOverview(userId);

      expect(result.recentEvents).toHaveLength(5);
    });
  });
});
