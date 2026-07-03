import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { sharedLocationController } from './controller/index.js';

const router = Router();
router.use(authenticate);

router.post('/share', sharedLocationController.share.bind(sharedLocationController));
router.get('/:id', sharedLocationController.getById.bind(sharedLocationController));

export default router;
