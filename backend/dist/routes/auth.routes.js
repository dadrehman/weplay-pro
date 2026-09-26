"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Standard Auth
router.post('/register', auth_controller_1.AuthController.register);
router.post('/login', auth_controller_1.AuthController.login);
router.get('/me', auth_middleware_1.authenticateJWT, auth_controller_1.AuthController.getMe);
// Social & Google / Facebook OAuth Handshake
router.post('/social', auth_controller_1.AuthController.socialAuth);
router.post('/google', auth_controller_1.AuthController.googleAuth);
router.post('/facebook', auth_controller_1.AuthController.facebookAuth);
router.post('/firebase-sync', auth_controller_1.AuthController.firebaseSync);
// WhatsApp Phone OTP (both /whatsapp/* and /phone/* supported)
router.post('/whatsapp/send-otp', auth_controller_1.AuthController.sendWhatsAppOtp);
router.post('/whatsapp/verify-otp', auth_controller_1.AuthController.verifyWhatsAppOtp);
router.post('/whatsapp/verify', auth_controller_1.AuthController.verifyWhatsAppOtp);
router.post('/phone/send-otp', auth_controller_1.AuthController.sendWhatsAppOtp);
router.post('/phone/verify-otp', auth_controller_1.AuthController.verifyWhatsAppOtp);
router.post('/phone/verify', auth_controller_1.AuthController.verifyWhatsAppOtp);
router.post('/phone-otp', auth_controller_1.AuthController.phoneOtp);
// Mandatory Player Setup / Onboarding
router.post('/complete-onboarding', auth_controller_1.AuthController.completeOnboarding);
exports.default = router;
