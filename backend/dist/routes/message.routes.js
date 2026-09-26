"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const message_controller_1 = require("../controllers/message.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Protect all message routes with JWT authentication
router.use(auth_middleware_1.authenticateJWT);
router.get('/conversations', message_controller_1.MessageController.getConversations);
router.get('/:otherUserId', message_controller_1.MessageController.getMessages);
router.post('/send', message_controller_1.MessageController.sendMessage);
exports.default = router;
