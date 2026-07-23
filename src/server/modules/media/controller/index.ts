import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../middlewares/errorHandler.js';
import { mediaService } from '../service/index.js';
import { mediaQuerySchema } from '../validator/index.js';

class MediaController {
  async uploadSingle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
        return;
      }
      if (!req.file) {
        next(new AppError('No file uploaded', 400, 'NO_FILE'));
        return;
      }

      // FormData non-file fields land in req.body; query params are a fallback
      const body = req.body as { isVoiceNote?: string; conversationId?: string };
      const isVoiceNote = body.isVoiceNote === 'true' || req.query['isVoiceNote'] === 'true';
      const conversationId =
        body.conversationId ?? (req.query['conversationId'] as string | undefined);

      const result = await mediaService.uploadFile(req.user.id, req.file, {
        conversationId,
        isVoiceNote,
      });

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async uploadMultiple(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
        return;
      }
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        next(new AppError('No files uploaded', 400, 'NO_FILE'));
        return;
      }

      const conversationId = req.query['conversationId'] as string | undefined;

      const results = await mediaService.uploadMultiple(req.user.id, files, { conversationId });
      res.status(201).json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }

  async getMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
        return;
      }
      const id = req.params['id'] as string;
      const result = await mediaService.getMedia(req.user.id, id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getConversationMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
        return;
      }

      const parsed = mediaQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(
          new AppError(
            parsed.error.issues[0]?.message ?? 'Validation error',
            400,
            'VALIDATION_ERROR',
          ),
        );
        return;
      }

      const result = await mediaService.getConversationMedia(req.user.id, parsed.data);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async deleteMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
        return;
      }
      const id = req.params['id'] as string;
      await mediaService.deleteMedia(req.user.id, id);
      res.json({ success: true, message: 'Media deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const mediaController = new MediaController();
