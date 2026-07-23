import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../middlewares/errorHandler.js';
import { stickerService } from '../service/index.js';

class StickerController {
  async listPacks(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const packs = await stickerService.listPacks();
      res.json({ success: true, data: packs });
    } catch (err) {
      next(err);
    }
  }

  async getPackStickers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const packId = req.params['packId'] as string;
      const pack = await stickerService.getPackStickers(packId);
      if (!pack) {
        next(new AppError('Sticker pack not found', 404, 'NOT_FOUND'));
        return;
      }
      res.json({ success: true, data: pack });
    } catch (err) {
      next(err);
    }
  }

  trackUsage(_req: Request, res: Response, next: NextFunction): void {
    try {
      // Usage tracking is a no-op for now; returns success
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

export const stickerController = new StickerController();
