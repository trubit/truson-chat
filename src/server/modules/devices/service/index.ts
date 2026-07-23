import mongoose from 'mongoose';
import { DeviceModel } from '../../../database/models/Device.js';
import { SessionModel } from '../../../database/models/Session.js';
import { RefreshTokenModel } from '../../../database/models/RefreshToken.js';
import { SecurityLogModel } from '../../../database/models/SecurityLog.js';
import { AppError } from '../../../middlewares/errorHandler.js';
import { logger } from '../../../logger/index.js';
import type { DeviceResponse, RegisterDeviceInput } from '../types/index.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatDevice(
  device: {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    name: string;
    type: string;
    platform: string;
    browser?: string;
    trusted: boolean;
    ipAddress?: string;
    lastSeenAt: Date;
    createdAt: Date;
  },
  currentDeviceId?: string,
): DeviceResponse {
  return {
    id: device._id.toHexString(),
    userId: device.userId.toHexString(),
    name: device.name,
    type: device.type,
    platform: device.platform,
    browser: device.browser,
    trusted: device.trusted,
    ipAddress: device.ipAddress,
    lastSeenAt: device.lastSeenAt.toISOString(),
    createdAt: device.createdAt.toISOString(),
    isCurrentDevice: currentDeviceId === device._id.toHexString(),
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DevicesService {
  async listDevices(userId: string, currentSessionId: string): Promise<DeviceResponse[]> {
    // Look up the current session to find its deviceId
    const currentSession = await SessionModel.findById(currentSessionId).select('deviceId').lean();

    const currentDeviceId = currentSession?.deviceId?.toHexString();

    const devices = await DeviceModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      revokedAt: { $exists: false },
    })
      .sort({ lastSeenAt: -1 })
      .lean();

    return devices.map((d) =>
      formatDevice(
        {
          _id: d._id,
          userId: d.userId,
          name: d.name,
          type: d.type,
          platform: d.platform,
          browser: d.browser,
          trusted: d.trusted,
          ipAddress: d.ipAddress,
          lastSeenAt: d.lastSeenAt,
          createdAt: d.createdAt,
        },
        currentDeviceId,
      ),
    );
  }

  async getDevice(userId: string, deviceId: string): Promise<DeviceResponse> {
    const device = await DeviceModel.findById(deviceId).lean();

    if (!device || device.revokedAt) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (device.userId.toHexString() !== userId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    return formatDevice({
      _id: device._id,
      userId: device.userId,
      name: device.name,
      type: device.type,
      platform: device.platform,
      browser: device.browser,
      trusted: device.trusted,
      ipAddress: device.ipAddress,
      lastSeenAt: device.lastSeenAt,
      createdAt: device.createdAt,
    });
  }

  async registerDevice(
    userId: string,
    input: RegisterDeviceInput,
    ip: string,
    ua: string,
  ): Promise<DeviceResponse> {
    const userObjId = new mongoose.Types.ObjectId(userId);

    // If a fingerprint is provided, check for an existing device
    if (input.fingerprint) {
      const existing = await DeviceModel.findOne({
        userId: userObjId,
        fingerprint: input.fingerprint,
        revokedAt: { $exists: false },
      }).lean();

      if (existing) {
        // Update lastSeenAt and optional fields for the existing device
        const updated = await DeviceModel.findByIdAndUpdate(
          existing._id,
          {
            lastSeenAt: new Date(),
            ipAddress: ip,
            ...(input.pushToken ? { pushToken: input.pushToken } : {}),
            ...(input.browser ? { browser: input.browser } : {}),
          },
          { returnDocument: 'after' },
        ).lean();

        if (!updated) {
          throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
        }

        return formatDevice({
          _id: updated._id,
          userId: updated.userId,
          name: updated.name,
          type: updated.type,
          platform: updated.platform,
          browser: updated.browser,
          trusted: updated.trusted,
          ipAddress: updated.ipAddress,
          lastSeenAt: updated.lastSeenAt,
          createdAt: updated.createdAt,
        });
      }
    }

    // Create a new device
    const device = await DeviceModel.create({
      userId: userObjId,
      name: input.name,
      type: input.type,
      platform: input.platform,
      browser: input.browser,
      fingerprint: input.fingerprint,
      pushToken: input.pushToken,
      ipAddress: ip,
      lastSeenAt: new Date(),
      trusted: false,
    });

    await SecurityLogModel.create({
      userId: userObjId,
      eventType: 'device_added',
      ipAddress: ip,
      userAgent: ua,
      deviceId: device._id,
      severity: 'low',
      metadata: { deviceName: input.name, deviceType: input.type },
    });

    logger.info('Device registered', { userId, deviceId: device._id.toHexString() });

    return formatDevice({
      _id: device._id,
      userId: device.userId,
      name: device.name,
      type: device.type,
      platform: device.platform,
      browser: device.browser,
      trusted: device.trusted,
      ipAddress: device.ipAddress,
      lastSeenAt: device.lastSeenAt,
      createdAt: device.createdAt,
    });
  }

  async trustDevice(
    userId: string,
    deviceId: string,
    trusted: boolean,
    ip: string,
    ua: string,
  ): Promise<DeviceResponse> {
    const device = await DeviceModel.findById(deviceId).lean();

    if (!device || device.revokedAt) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (device.userId.toHexString() !== userId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const updated = await DeviceModel.findByIdAndUpdate(
      deviceId,
      { trusted },
      { returnDocument: 'after' },
    ).lean();

    if (!updated) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    const eventType = trusted ? 'device_added' : 'device_removed';
    await SecurityLogModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      eventType,
      ipAddress: ip,
      userAgent: ua,
      deviceId: new mongoose.Types.ObjectId(deviceId),
      severity: 'low',
      metadata: { trusted, action: trusted ? 'device_trusted' : 'device_untrusted' },
    });

    logger.info('Device trust updated', { userId, deviceId, trusted });

    return formatDevice({
      _id: updated._id,
      userId: updated.userId,
      name: updated.name,
      type: updated.type,
      platform: updated.platform,
      browser: updated.browser,
      trusted: updated.trusted,
      ipAddress: updated.ipAddress,
      lastSeenAt: updated.lastSeenAt,
      createdAt: updated.createdAt,
    });
  }

  async removeDevice(userId: string, deviceId: string, ip: string, ua: string): Promise<void> {
    const device = await DeviceModel.findById(deviceId).lean();

    if (!device || device.revokedAt) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (device.userId.toHexString() !== userId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const deviceObjId = new mongoose.Types.ObjectId(deviceId);

    // Soft-delete the device
    await DeviceModel.findByIdAndUpdate(deviceId, { revokedAt: new Date() });

    // Revoke all sessions linked to this device
    const linkedSessions = await SessionModel.find({
      deviceId: deviceObjId,
      isActive: true,
    })
      .select('_id')
      .lean();

    const sessionIds = linkedSessions.map((s) => s._id);

    if (sessionIds.length > 0) {
      await Promise.all([
        SessionModel.updateMany(
          { _id: { $in: sessionIds } },
          {
            isActive: false,
            revokedAt: new Date(),
            revokedReason: 'device_removed',
          },
        ),
        RefreshTokenModel.updateMany(
          { sessionId: { $in: sessionIds }, isRevoked: false },
          { isRevoked: true, revokedAt: new Date() },
        ),
      ]);
    }

    await SecurityLogModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      eventType: 'device_removed',
      ipAddress: ip,
      userAgent: ua,
      deviceId: deviceObjId,
      severity: 'medium',
      metadata: {
        deviceName: device.name,
        revokedSessionCount: sessionIds.length,
      },
    });

    logger.info('Device removed', { userId, deviceId, revokedSessions: sessionIds.length });
  }
}

export const devicesService = new DevicesService();
