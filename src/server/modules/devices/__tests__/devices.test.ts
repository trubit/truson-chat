/**
 * Unit tests for DevicesService.
 *
 * All Mongoose model methods are mocked so no database connection is needed.
 */

import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../database/models/Device.js', () => ({
  DeviceModel: {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../../../database/models/Session.js', () => ({
  SessionModel: {
    findById: jest.fn(),
    find: jest.fn(),
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

import { DeviceModel } from '../../../database/models/Device.js';
import { SessionModel } from '../../../database/models/Session.js';
import { DevicesService } from '../service/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId();
}

function buildDevice(overrides: Record<string, unknown> = {}) {
  const id = makeId();
  return {
    _id: id,
    userId: makeId(),
    name: 'My Phone',
    type: 'mobile',
    platform: 'iOS',
    browser: 'Safari',
    trusted: false,
    ipAddress: '127.0.0.1',
    lastSeenAt: new Date('2024-01-01T10:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    revokedAt: undefined,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DevicesService', () => {
  let service: DevicesService;

  beforeEach(() => {
    service = new DevicesService();
    jest.clearAllMocks();
  });

  // ── listDevices ───────────────────────────────────────────────────────────

  describe('listDevices', () => {
    it('returns devices with isCurrentDevice flag correctly set', async () => {
      const sessionId = makeId();
      const currentDeviceId = makeId();
      const otherDeviceId = makeId();

      (SessionModel.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ deviceId: currentDeviceId }),
        }),
      });

      const mockDevices = [
        buildDevice({ _id: currentDeviceId }),
        buildDevice({ _id: otherDeviceId }),
      ];

      const sortMock = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDevices),
      });
      (DeviceModel.find as jest.Mock).mockReturnValue({ sort: sortMock });

      const result = await service.listDevices(makeId().toHexString(), sessionId.toHexString());

      expect(result).toHaveLength(2);
      const current = result.find((d) => d.id === currentDeviceId.toHexString());
      const other = result.find((d) => d.id === otherDeviceId.toHexString());

      expect(current?.isCurrentDevice).toBe(true);
      expect(other?.isCurrentDevice).toBe(false);
    });
  });

  // ── registerDevice ────────────────────────────────────────────────────────

  describe('registerDevice', () => {
    it('updates existing device when fingerprint matches', async () => {
      const existingDevice = buildDevice({ fingerprint: 'fp123' });

      (DeviceModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(existingDevice),
      });

      const updatedDevice = { ...existingDevice, lastSeenAt: new Date() };
      (DeviceModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(updatedDevice),
      });

      const result = await service.registerDevice(
        existingDevice.userId.toHexString(),
        {
          name: 'My Phone',
          type: 'mobile',
          platform: 'iOS',
          fingerprint: 'fp123',
        },
        '127.0.0.1',
        'TestAgent',
      );

      expect(DeviceModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(DeviceModel.create).not.toHaveBeenCalled();
      expect(result.id).toBe(existingDevice._id.toHexString());
    });

    it('creates a new device when fingerprint does not match any existing device', async () => {
      (DeviceModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const newDevice = buildDevice({ fingerprint: 'fp-new' });
      (DeviceModel.create as jest.Mock).mockResolvedValue(newDevice);

      const { SecurityLogModel } = await import('../../../database/models/SecurityLog.js');
      (SecurityLogModel.create as jest.Mock).mockResolvedValue({});

      const result = await service.registerDevice(
        newDevice.userId.toHexString(),
        {
          name: 'New Device',
          type: 'desktop',
          platform: 'Windows',
          fingerprint: 'fp-new',
        },
        '10.0.0.1',
        'TestAgent',
      );

      expect(DeviceModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Device', type: 'desktop' }),
      );
      expect(result.id).toBe(newDevice._id.toHexString());
    });

    it('creates a new device when no fingerprint is provided', async () => {
      const newDevice = buildDevice();
      (DeviceModel.create as jest.Mock).mockResolvedValue(newDevice);

      const { SecurityLogModel } = await import('../../../database/models/SecurityLog.js');
      (SecurityLogModel.create as jest.Mock).mockResolvedValue({});

      const result = await service.registerDevice(
        newDevice.userId.toHexString(),
        {
          name: 'No Fingerprint',
          type: 'tablet',
          platform: 'Android',
        },
        '10.0.0.1',
        'TestAgent',
      );

      expect(DeviceModel.findOne).not.toHaveBeenCalled();
      expect(DeviceModel.create).toHaveBeenCalled();
      expect(result.id).toBe(newDevice._id.toHexString());
    });
  });

  // ── trustDevice ───────────────────────────────────────────────────────────

  describe('trustDevice', () => {
    it('updates the trusted field to true', async () => {
      const userId = makeId();
      const device = buildDevice({ userId, trusted: false });

      (DeviceModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(device),
      });

      const updatedDevice = { ...device, trusted: true };
      (DeviceModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(updatedDevice),
      });

      const { SecurityLogModel } = await import('../../../database/models/SecurityLog.js');
      (SecurityLogModel.create as jest.Mock).mockResolvedValue({});

      const result = await service.trustDevice(
        userId.toHexString(),
        device._id.toHexString(),
        true,
        '127.0.0.1',
        'TestAgent',
      );

      expect(DeviceModel.findByIdAndUpdate).toHaveBeenCalledWith(
        device._id.toHexString(),
        { trusted: true },
        { returnDocument: 'after' },
      );
      expect(result.trusted).toBe(true);
    });

    it('updates the trusted field to false', async () => {
      const userId = makeId();
      const device = buildDevice({ userId, trusted: true });

      (DeviceModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(device),
      });

      const updatedDevice = { ...device, trusted: false };
      (DeviceModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(updatedDevice),
      });

      const { SecurityLogModel } = await import('../../../database/models/SecurityLog.js');
      (SecurityLogModel.create as jest.Mock).mockResolvedValue({});

      const result = await service.trustDevice(
        userId.toHexString(),
        device._id.toHexString(),
        false,
        '127.0.0.1',
        'TestAgent',
      );

      expect(result.trusted).toBe(false);
    });
  });

  // ── removeDevice ──────────────────────────────────────────────────────────

  describe('removeDevice', () => {
    it('soft-deletes device and revokes linked sessions', async () => {
      const userId = makeId();
      const deviceId = makeId();
      const device = buildDevice({ _id: deviceId, userId });

      (DeviceModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(device),
      });
      (DeviceModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const linkedSessions = [{ _id: makeId() }, { _id: makeId() }];
      const selectMock = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(linkedSessions),
      });
      (SessionModel.find as jest.Mock).mockReturnValue({ select: selectMock });
      (SessionModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });

      const { RefreshTokenModel } = await import('../../../database/models/RefreshToken.js');
      (RefreshTokenModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });

      const { SecurityLogModel } = await import('../../../database/models/SecurityLog.js');
      (SecurityLogModel.create as jest.Mock).mockResolvedValue({});

      await expect(
        service.removeDevice(
          userId.toHexString(),
          deviceId.toHexString(),
          '127.0.0.1',
          'TestAgent',
        ),
      ).resolves.toBeUndefined();

      expect(DeviceModel.findByIdAndUpdate).toHaveBeenCalledWith(deviceId.toHexString(), {
        revokedAt: expect.any(Date),
      });
      expect(SessionModel.updateMany).toHaveBeenCalled();
    });

    it('throws 404 when device does not exist', async () => {
      (DeviceModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.removeDevice(
          makeId().toHexString(),
          makeId().toHexString(),
          '127.0.0.1',
          'TestAgent',
        ),
      ).rejects.toMatchObject({ code: 'DEVICE_NOT_FOUND', statusCode: 404 });
    });
  });
});
