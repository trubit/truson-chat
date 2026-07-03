import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { stickerController } from './controller/index.js';

const router = Router();
router.use(authenticate);

router.get('/packs', stickerController.listPacks.bind(stickerController));
router.get('/packs/:packId', stickerController.getPackStickers.bind(stickerController));
router.post('/use/:stickerId', stickerController.trackUsage.bind(stickerController));

export default router;
