import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateQuery } from '../../middlewares/validate.js';
import { securityController } from './controller/index.js';
import { securityLogsQuerySchema } from './validator/index.js';

const router = Router();

// All security routes require authentication
router.use(authenticate);

// GET /security/logs — get paginated security logs for current user
router.get(
  '/logs',
  validateQuery(securityLogsQuerySchema),
  securityController.getSecurityLogs,
);

// GET /security/audit — admin sees all audit logs; user sees own only
router.get(
  '/audit',
  validateQuery(securityLogsQuerySchema),
  securityController.getAuditLogs,
);

// GET /security/overview — security summary for current user
router.get('/overview', securityController.getSecurityOverview);

export default router;
