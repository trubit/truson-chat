import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateBody, validateParams } from '../../middlewares/validate.js';
import { PrivacyRepository } from './repository/index.js';
import { PrivacyService } from './service/index.js';
import { PrivacyController } from './controller/index.js';
import { updatePrivacySchema, userIdParamSchema } from './validator/index.js';

const router = Router();

const repo = new PrivacyRepository();
const service = new PrivacyService(repo);
const controller = new PrivacyController(service);

router.get('/', authenticate, controller.getSettings);
router.patch('/', authenticate, validateBody(updatePrivacySchema), controller.updateSettings);
router.get(
  '/check/:userId',
  authenticate,
  validateParams(userIdParamSchema),
  controller.checkPrivacy,
);

export default router;
