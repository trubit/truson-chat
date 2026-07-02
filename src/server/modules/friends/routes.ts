import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.js';
import { FriendRequestRepository, FriendshipRepository } from './repository/index.js';
import { FriendsService } from './service/index.js';
import { FriendsController } from './controller/index.js';
import {
  sendFriendRequestSchema,
  requestIdParamSchema,
  friendIdParamSchema,
  userIdParamSchema,
  friendListQuerySchema,
  paginationQuerySchema,
} from './validator/index.js';

const router = Router();
const requestRepo = new FriendRequestRepository();
const friendshipRepo = new FriendshipRepository();
const service = new FriendsService(requestRepo, friendshipRepo);
const controller = new FriendsController(service);

router.get('/', authenticate, validateQuery(friendListQuerySchema), controller.listFriends);
router.get('/requests', authenticate, validateQuery(paginationQuerySchema), controller.getReceivedRequests);
router.get('/requests/sent', authenticate, validateQuery(paginationQuerySchema), controller.getSentRequests);
router.post('/requests', authenticate, validateBody(sendFriendRequestSchema), controller.sendRequest);
router.post('/requests/:requestId/accept', authenticate, validateParams(requestIdParamSchema), controller.acceptRequest);
router.post('/requests/:requestId/reject', authenticate, validateParams(requestIdParamSchema), controller.rejectRequest);
router.delete('/requests/:requestId', authenticate, validateParams(requestIdParamSchema), controller.cancelRequest);
router.delete('/:friendId', authenticate, validateParams(friendIdParamSchema), controller.removeFriend);
router.get('/:userId/status', authenticate, validateParams(userIdParamSchema), controller.checkStatus);

export default router;
