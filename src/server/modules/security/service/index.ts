import mongoose from 'mongoose';
import { SecurityLogModel } from '../../../database/models/SecurityLog.js';
import { AuditLogModel } from '../../../database/models/AuditLog.js';
import { SessionModel } from '../../../database/models/Session.js';
import { DeviceModel } from '../../../database/models/Device.js';
import type {
  AuditLogResponse,
  SecurityLogResponse,
  SecurityLogsQuery,
} from '../types/index.js';
import type { PaginationMeta } from '../../../../shared/types/api.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSecurityLog(log: {
  _id: mongoose.Types.ObjectId;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  location?: { country?: string; city?: string };
  severity: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}): SecurityLogResponse {
  return {
    id: log._id.toHexString(),
    eventType: log.eventType,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    location: log.location,
    severity: log.severity,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
  };
}

function formatAuditLog(log: {
  _id: mongoose.Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: { before: unknown; after: unknown };
  ipAddress?: string;
  createdAt: Date;
}): AuditLogResponse {
  return {
    id: log._id.toHexString(),
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId,
    changes: log.changes,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt.toISOString(),
  };
}

function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SecurityService {
  async getSecurityLogs(
    userId: string,
    query: SecurityLogsQuery,
  ): Promise<{ logs: SecurityLogResponse[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (query.eventType) {
      filter['eventType'] = query.eventType;
    }

    if (query.severity) {
      filter['severity'] = query.severity;
    }

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter['$gte'] = new Date(query.startDate);
      if (query.endDate) dateFilter['$lte'] = new Date(query.endDate);
      filter['createdAt'] = dateFilter;
    }

    const [logs, total] = await Promise.all([
      SecurityLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SecurityLogModel.countDocuments(filter),
    ]);

    return {
      logs: logs.map((l) =>
        formatSecurityLog({
          _id: l._id,
          eventType: l.eventType,
          ipAddress: l.ipAddress,
          userAgent: l.userAgent,
          location: l.location,
          severity: l.severity,
          metadata: l.metadata,
          createdAt: l.createdAt,
        }),
      ),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getAuditLogs(
    userId: string,
    query: SecurityLogsQuery,
    requesterRole: string,
  ): Promise<{ logs: AuditLogResponse[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // Admin can see all audit logs; regular users see only their own
    if (requesterRole !== 'admin') {
      filter['userId'] = new mongoose.Types.ObjectId(userId);
    }

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter['$gte'] = new Date(query.startDate);
      if (query.endDate) dateFilter['$lte'] = new Date(query.endDate);
      filter['createdAt'] = dateFilter;
    }

    const [logs, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    return {
      logs: logs.map((l) =>
        formatAuditLog({
          _id: l._id,
          action: l.action,
          resource: l.resource,
          resourceId: l.resourceId,
          changes: l.changes,
          ipAddress: l.ipAddress,
          createdAt: l.createdAt,
        }),
      ),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getSecurityOverview(userId: string): Promise<{
    recentEvents: SecurityLogResponse[];
    failedLogins: number;
    activeSessions: number;
    trustedDevices: number;
  }> {
    const userObjId = new mongoose.Types.ObjectId(userId);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000);

    const [recentEvents, failedLogins, activeSessions, trustedDevices] =
      await Promise.all([
        // Last 5 security events
        SecurityLogModel.find({ userId: userObjId })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),

        // Failed logins in the last 7 days
        SecurityLogModel.countDocuments({
          userId: userObjId,
          eventType: 'login_failed',
          createdAt: { $gte: sevenDaysAgo },
        }),

        // Active sessions count
        SessionModel.countDocuments({
          userId: userObjId,
          isActive: true,
        }),

        // Trusted devices count (non-revoked)
        DeviceModel.countDocuments({
          userId: userObjId,
          trusted: true,
          revokedAt: { $exists: false },
        }),
      ]);

    return {
      recentEvents: recentEvents.map((l) =>
        formatSecurityLog({
          _id: l._id,
          eventType: l.eventType,
          ipAddress: l.ipAddress,
          userAgent: l.userAgent,
          location: l.location,
          severity: l.severity,
          metadata: l.metadata,
          createdAt: l.createdAt,
        }),
      ),
      failedLogins,
      activeSessions,
      trustedDevices,
    };
  }
}

export const securityService = new SecurityService();
