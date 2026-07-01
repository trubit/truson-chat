import type { RequestHandler } from 'express';
import { securityService } from '../service/index.js';
import type { ApiResponse, PaginationMeta } from '../../../../shared/types/api.js';
import type {
  AuditLogResponse,
  SecurityLogResponse,
  SecurityLogsQuery,
} from '../types/index.js';

export class SecurityController {
  getSecurityLogs: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.id;
      const query = req.query as unknown as SecurityLogsQuery;

      const result = await securityService.getSecurityLogs(userId, query);

      const response: ApiResponse<SecurityLogResponse[]> = {
        success: true,
        data: result.logs,
        meta: result.meta,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  getAuditLogs: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      const query = req.query as unknown as SecurityLogsQuery;

      const result = await securityService.getAuditLogs(userId, query, role);

      const response: ApiResponse<AuditLogResponse[]> = {
        success: true,
        data: result.logs,
        meta: result.meta,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  getSecurityOverview: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.id;

      const overview = await securityService.getSecurityOverview(userId);

      const response: ApiResponse<{
        recentEvents: SecurityLogResponse[];
        failedLogins: number;
        activeSessions: number;
        trustedDevices: number;
      }> = {
        success: true,
        data: overview,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };
}

export const securityController = new SecurityController();
