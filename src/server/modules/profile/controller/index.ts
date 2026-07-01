import type { RequestHandler } from 'express';
import { AppError } from '../../../middlewares/errorHandler.js';
import type { ProfileService } from '../service/index.js';
import type { UpdateProfileInput, UpdatePrivacyInput, UpdatePreferencesInput } from '../types/index.js';

export class ProfileController {
  constructor(private service: ProfileService) {}

  getProfile: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const viewerId = req.user?.id;
      const { userId } = req.params as { userId: string };

      const result = await this.service.getProfile(viewerId, userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  getOwnProfile: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }

      const result = await this.service.getOwnProfile(req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  updateProfile: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }

      const data = req.body as UpdateProfileInput;
      const ip = req.ip ?? '';
      const ua = req.headers['user-agent'] ?? '';

      const result = await this.service.updateProfile(req.user.id, data, ip, ua);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  uploadAvatar: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }

      if (!req.file) {
        next(new AppError('No file uploaded', 400, 'FILE_REQUIRED'));
        return;
      }

      const ip = req.ip ?? '';
      const ua = req.headers['user-agent'] ?? '';

      const result = await this.service.uploadAvatar(req.user.id, req.file, ip, ua);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  removeAvatar: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }

      const ip = req.ip ?? '';
      const ua = req.headers['user-agent'] ?? '';

      const result = await this.service.removeAvatar(req.user.id, ip, ua);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  uploadCoverImage: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }

      if (!req.file) {
        next(new AppError('No file uploaded', 400, 'FILE_REQUIRED'));
        return;
      }

      const ip = req.ip ?? '';
      const ua = req.headers['user-agent'] ?? '';

      const result = await this.service.uploadCoverImage(req.user.id, req.file, ip, ua);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  removeCoverImage: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }

      const ip = req.ip ?? '';
      const ua = req.headers['user-agent'] ?? '';

      const result = await this.service.removeCoverImage(req.user.id, ip, ua);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  updatePrivacy: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }

      const data = req.body as UpdatePrivacyInput;
      const ip = req.ip ?? '';
      const ua = req.headers['user-agent'] ?? '';

      const result = await this.service.updatePrivacy(req.user.id, data, ip, ua);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  getPreferences: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }

      const result = await this.service.getPreferences(req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  updatePreferences: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }

      const data = req.body as UpdatePreferencesInput;

      const result = await this.service.updatePreferences(req.user.id, data);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}
