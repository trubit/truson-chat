import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateBody, validateParams } from '../../middlewares/validate.js';
import { PresenceRepository } from './repository/index.js';
import { PresenceService } from './service/index.js';
import { PresenceController } from './controller/index.js';
import {
  updatePresenceSchema,
  userIdParamSchema,
  batchPresenceSchema,
} from './validator/index.js';

const router = Router();

const repo = new PresenceRepository();
const service = new PresenceService(repo);
const controller = new PresenceController(service);

// NOTE: /me and /batch must come before /:userId to avoid route conflicts
router.get('/me', authenticate, controller.getOwn);
router.patch('/me', authenticate, validateBody(updatePresenceSchema), controller.update);
router.post('/batch', authenticate, validateBody(batchPresenceSchema), controller.batchGet);
router.get('/:userId', authenticate, validateParams(userIdParamSchema), controller.getUser);

export default router;
