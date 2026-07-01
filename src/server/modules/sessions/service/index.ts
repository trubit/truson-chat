import mongoose from 'mongoose';
import { SessionModel } from '../../../database/models/Session.js';
import { RefreshTokenModel } from '../../../database/models/RefreshToken.js';
import { SecurityLogModel } from '../../../database/models/SecurityLog.js';
import { AppError } from '../../../middlewares/errorHandler.js';
import { logger } from '../../../logger/index.js';
import type { SessionListResponse, SessionResponse } from '../types/index.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatSession(
  session: {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    deviceId?: mongoose.Types.ObjectId;
    ipAddress: string;
    userAgent: string;
    location?: { country?: string; city?: string };
    isActive: boolean;
    lastActivityAt: Date;
    expiresAt: Date;
    createdAt: Date;
  },
  currentSessionId: string,
): SessionResponse {
  return {
    id: session._id.toHexString(),
    userId: session.userId.toHexString(),
    deviceId: session.deviceId?.toHexString(),
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    location: session.location,
    isActive: session.isActive,
    isCurrent: session._id.toHexString() === currentSessionId,
    lastActivityAt: session.lastActivityAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SessionsService {
  async listSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<SessionListResponse> {
    const sessions = await SessionModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    })
      .sort({ lastActivityAt: -1 })
      .lean();

    return {
      sessions: sessions.map((s) =>
        formatSession(
          {
            _id: s._id,
            userId: s.userId,
            deviceId: s.deviceId,
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            location: s.location,
            isActive: s.isActive,
            lastActivityAt: s.lastActivityAt,
            expiresAt: s.expiresAt,
            createdAt: s.createdAt,
          },
          currentSessionId,
        ),
      ),
      currentSessionId,
    };
  }

  async getSession(
    userId: string,
    sessionId: string,
    currentSessionId: string,
  ): Promise<SessionResponse> {
    const session = await SessionModel.findById(sessionId).lean();

    if (!session || !session.isActive) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    if (session.userId.toHexString() !== userId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    return formatSession(
      {
        _id: session._id,
        userId: session.userId,
        deviceId: session.deviceId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        location: session.location,
        isActive: session.isActive,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
      currentSessionId,
    );
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    currentSessionId: string,
    ip: string,
    ua: string,
  ): Promise<void> {
    if (sessionId === currentSessionId) {
      throw new AppError(
        'Cannot revoke current session',
        400,
        'CANNOT_REVOKE_CURRENT_SESSION',
      );
    }

    const session = await SessionModel.findById(sessionId).lean();

    if (!session || !session.isActive) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    if (session.userId.toHexString() !== userId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const sessionObjId = new mongoose.Types.ObjectId(sessionId);

    await Promise.all([
      SessionModel.findByIdAndUpdate(sessionId, {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'user_revoked',
      }),
      RefreshTokenModel.updateMany(
        { sessionId: sessionObjId, isRevoked: false },
        { isRevoked: true, revokedAt: new Date() },
      ),
    ]);

    await SecurityLogModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      eventType: 'session_revoked',
      ipAddress: ip,
      userAgent: ua,
      severity: 'medium',
      metadata: { revokedSessionId: sessionId },
    });

    logger.info('Session revoked', { userId, sessionId });
  }

  async revokeAllSessions(
    userId: string,
    currentSessionId: string,
    ip: string,
    ua: string,
  ): Promise<{ revokedCount: number }> {
    const userObjId = new mongoose.Types.ObjectId(userId);
    const currentObjId = new mongoose.Types.ObjectId(currentSessionId);

    const sessions = await SessionModel.find({
      userId: userObjId,
      isActive: true,
      _id: { $ne: currentObjId },
    })
      .select('_id')
      .lean();

    const sessionIds = sessions.map((s) => s._id);
    const revokedCount = sessionIds.length;

    if (revokedCount > 0) {
      await Promise.all([
        SessionModel.updateMany(
          { _id: { $in: sessionIds } },
          {
            isActive: false,
            revokedAt: new Date(),
            revokedReason: 'user_revoked_all',
          },
        ),
        RefreshTokenModel.updateMany(
          { sessionId: { $in: sessionIds }, isRevoked: false },
          { isRevoked: true, revokedAt: new Date() },
        ),
      ]);
    }

    await SecurityLogModel.create({
      userId: userObjId,
      eventType: 'session_revoked',
      ipAddress: ip,
      userAgent: ua,
      severity: 'medium',
      metadata: { revokedCount, action: 'revoke_all' },
    });

    logger.info('All other sessions revoked', { userId, revokedCount });

    return { revokedCount };
  }
}

export const sessionsService = new SessionsService();
