import { Router } from 'express';
import { MessageController } from '../controllers/message.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// Protect all message routes with JWT authentication
router.use(authenticateJWT);

router.get('/conversations', MessageController.getConversations);
router.get('/:otherUserId', MessageController.getMessages);
router.post('/send', MessageController.sendMessage);

export default router;
