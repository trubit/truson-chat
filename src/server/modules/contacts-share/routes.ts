import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { sharedContactController } from './controller/index.js';

const router = Router();
router.use(authenticate);

router.post('/', sharedContactController.create.bind(sharedContactController));
router.get('/:id', sharedContactController.getById.bind(sharedContactController));

export default router;
