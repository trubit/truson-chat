import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { gifController } from './controller/index.js';

const router = Router();
router.use(authenticate);

router.get('/trending', gifController.getTrending.bind(gifController));
router.get('/search', gifController.search.bind(gifController));

export default router;
