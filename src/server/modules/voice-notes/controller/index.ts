import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../middlewares/errorHandler.js';
import { voiceNoteService } from '../service/index.js';

class VoiceNoteController {
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { next(new AppError('Unauthorized', 401, 'UNAUTHORIZED')); return; }
      if (!req.file)  { next(new AppError('No audio file uploaded', 400, 'NO_FILE')); return; }

      const conversationId = req.query['conversationId'] as string | undefined;
      const result = await voiceNoteService.uploadVoiceNote(req.user.id, req.file, { conversationId });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getVoiceNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { next(new AppError('Unauthorized', 401, 'UNAUTHORIZED')); return; }
      const id = req.params['id'] as string;
      const result = await voiceNoteService.getVoiceNote(req.user.id, id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const voiceNoteController = new VoiceNoteController();
