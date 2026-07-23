import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateBody, validateParams } from '../../middlewares/validate.js';
import { devicesController } from './controller/index.js';
import { deviceIdParamSchema, registerDeviceSchema, trustDeviceSchema } from './validator/index.js';

const router = Router();

// All device routes require authentication
router.use(authenticate);

// GET /devices — list all devices for current user
router.get('/', devicesController.listDevices);

// GET /devices/:id — get a specific device
router.get('/:id', validateParams(deviceIdParamSchema), devicesController.getDevice);

// POST /devices — register a new device
router.post('/', validateBody(registerDeviceSchema), devicesController.registerDevice);

// PATCH /devices/:id/trust — update trust status of a device
router.patch(
  '/:id/trust',
  validateParams(deviceIdParamSchema),
  validateBody(trustDeviceSchema),
  devicesController.trustDevice,
);

// DELETE /devices/:id — remove a device
router.delete('/:id', validateParams(deviceIdParamSchema), devicesController.removeDevice);

export default router;
