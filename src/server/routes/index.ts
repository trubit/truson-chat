import { Router } from 'express';
import { authRateLimiter } from '../security/rateLimit.js';

import authRoutes from '../modules/auth/routes.js';
import userRoutes from '../modules/users/routes.js';
import profileRoutes from '../modules/profile/routes.js';
import conversationRoutes from '../modules/conversations/routes.js';
import messageRoutes from '../modules/messages/routes.js';
import contactRoutes from '../modules/contacts/routes.js';
import groupRoutes from '../modules/groups/routes.js';
import callRoutes from '../modules/calls/routes.js';
import notificationRoutes from '../modules/notifications/routes.js';
import mediaRoutes from '../modules/media/routes.js';
import sessionRoutes from '../modules/sessions/routes.js';
import deviceRoutes from '../modules/devices/routes.js';
import securityRoutes from '../modules/security/routes.js';
import { authenticate } from '../middlewares/authenticate.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRateLimiter, authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/conversations', conversationRoutes);
apiRouter.use('/messages', messageRoutes);
apiRouter.use('/contacts', contactRoutes);
apiRouter.use('/groups', groupRoutes);
apiRouter.use('/calls', callRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/media', mediaRoutes);
apiRouter.use('/sessions', authenticate, sessionRoutes);
apiRouter.use('/devices', authenticate, deviceRoutes);
apiRouter.use('/security', authenticate, securityRoutes);
