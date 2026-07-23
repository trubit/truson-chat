import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.js';
import { BlockRepository, MuteRepository } from './repository/index.js';
import { BlockingService } from './service/index.js';
import { BlockingController } from './controller/index.js';
import {
  blockUserSchema,
  muteUserSchema,
  userIdParamSchema,
  blockListQuerySchema,
} from './validator/index.js';

const router = Router();

const blockRepo = new BlockRepository();
const muteRepo = new MuteRepository();
const service = new BlockingService(blockRepo, muteRepo);
const controller = new BlockingController(service);

// IMPORTANT: /muted routes MUST come before /:userId routes so Express does
// not match "muted" as a userId param value.

// GET /blocking/muted
router.get('/muted', authenticate, validateQuery(blockListQuerySchema), controller.getMutedList);

// POST /blocking/muted/:userId
router.post(
  '/muted/:userId',
  authenticate,
  validateParams(userIdParamSchema),
  validateBody(muteUserSchema),
  controller.muteUser,
);

// DELETE /blocking/muted/:userId
router.delete(
  '/muted/:userId',
  authenticate,
  validateParams(userIdParamSchema),
  controller.unmuteUser,
);

// GET /blocking/
router.get('/', authenticate, validateQuery(blockListQuerySchema), controller.getBlockedList);

// POST /blocking/:userId
router.post(
  '/:userId',
  authenticate,
  validateParams(userIdParamSchema),
  validateBody(blockUserSchema),
  controller.blockUser,
);

// DELETE /blocking/:userId
router.delete('/:userId', authenticate, validateParams(userIdParamSchema), controller.unblockUser);

// GET /blocking/:userId/status
router.get(
  '/:userId/status',
  authenticate,
  validateParams(userIdParamSchema),
  controller.checkBlockStatus,
);

export default router;
