import { Router } from 'express';
import { FriendController } from '../controllers/friend.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', FriendController.getFriends);
router.get('/requests', FriendController.getRequests);
router.post('/request', FriendController.sendRequest);
router.post('/accept', FriendController.acceptRequest);
router.post('/reject', FriendController.rejectRequest);
router.get('/search', FriendController.searchUsers);

export default router;
