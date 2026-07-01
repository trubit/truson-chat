import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateParams } from '../../middlewares/validate.js';
import { sessionsController } from './controller/index.js';
import { sessionIdParamSchema } from './validator/index.js';

const router = Router();

// All session routes require authentication
router.use(authenticate);

// GET /sessions — list all active sessions for current user
router.get('/', sessionsController.listSessions);

// GET /sessions/:id — get a specific session
router.get('/:id', validateParams(sessionIdParamSchema), sessionsController.getSession);

// DELETE /sessions — revoke all sessions except current
router.delete('/', sessionsController.revokeAllSessions);

// DELETE /sessions/:id — revoke a specific session
router.delete(
  '/:id',
  validateParams(sessionIdParamSchema),
  sessionsController.revokeSession,
);

export default router;
