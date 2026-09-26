import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { AuthController } from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/me', AuthController.getMe);
router.get('/profile', UserController.getProfile);
router.patch('/profile', UserController.updateProfile);
router.post('/complete-onboarding', UserController.completeOnboarding);
router.post('/gift', UserController.sendGift);
router.get('/families', UserController.getFamilies);

export default router;
