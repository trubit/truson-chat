import type { RequestHandler } from 'express';
import { sessionsService } from '../service/index.js';
import type { ApiResponse } from '../../../../shared/types/api.js';
import type { SessionListResponse, SessionResponse } from '../types/index.js';

export class SessionsController {
  listSessions: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.id;
      const currentSessionId = req.user!.sessionId;

      const result = await sessionsService.listSessions(userId, currentSessionId);

      const response: ApiResponse<SessionListResponse> = {
        success: true,
        data: result,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  getSession: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.id;
      const currentSessionId = req.user!.sessionId;
      const { id } = req.params as { id: string };

      const session = await sessionsService.getSession(userId, id, currentSessionId);

      const response: ApiResponse<SessionResponse> = {
        success: true,
        data: session,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  revokeSession: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.id;
      const currentSessionId = req.user!.sessionId;
      const { id } = req.params as { id: string };
      const ip = req.ip ?? req.socket.remoteAddress ?? '';
      const ua = req.headers['user-agent'] ?? '';

      await sessionsService.revokeSession(userId, id, currentSessionId, ip, ua);

      const response: ApiResponse = {
        success: true,
        message: 'Session revoked successfully',
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  revokeAllSessions: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.id;
      const currentSessionId = req.user!.sessionId;
      const ip = req.ip ?? req.socket.remoteAddress ?? '';
      const ua = req.headers['user-agent'] ?? '';

      const result = await sessionsService.revokeAllSessions(userId, currentSessionId, ip, ua);

      const response: ApiResponse<{ revokedCount: number }> = {
        success: true,
        data: result,
        message: `${result.revokedCount} session(s) revoked successfully`,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };
}

export const sessionsController = new SessionsController();
