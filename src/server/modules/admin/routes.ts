import { Router } from 'express';
import { requireAdmin } from '../../middlewares/requireAdmin.js';
import * as ctrl from './controller/index.js';

const router = Router();

router.use(...requireAdmin);

router.get('/stats', ctrl.getStats);
router.get('/stats/growth', ctrl.getGrowthData);
router.get('/users', ctrl.listUsers);
router.patch('/users/:id/status', ctrl.updateUserStatus);
router.patch('/users/:id/role', ctrl.updateUserRole);
router.get('/system', ctrl.getSystemInfo);

export default router;
