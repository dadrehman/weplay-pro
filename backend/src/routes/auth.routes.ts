import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// Standard Auth
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', authenticateJWT, AuthController.getMe);

// Social & Google / Facebook OAuth Handshake
router.post('/social', AuthController.socialAuth);
router.post('/google', AuthController.googleAuth);
router.post('/facebook', AuthController.facebookAuth);
router.post('/firebase-sync', AuthController.firebaseSync);

// WhatsApp Phone OTP (both /whatsapp/* and /phone/* supported)
router.post('/whatsapp/send-otp', AuthController.sendWhatsAppOtp);
router.post('/whatsapp/verify-otp', AuthController.verifyWhatsAppOtp);
router.post('/whatsapp/verify', AuthController.verifyWhatsAppOtp);
router.post('/phone/send-otp', AuthController.sendWhatsAppOtp);
router.post('/phone/verify-otp', AuthController.verifyWhatsAppOtp);
router.post('/phone/verify', AuthController.verifyWhatsAppOtp);
router.post('/phone-otp', AuthController.phoneOtp);

// Mandatory Player Setup / Onboarding
router.post('/complete-onboarding', AuthController.completeOnboarding);

export default router;
