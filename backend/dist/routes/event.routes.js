"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_controller_1 = require("../controllers/event.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public events endpoint
router.get('/', event_controller_1.EventController.getEvents);
// Superadmin CRUD
router.post('/admin', auth_middleware_1.authenticateJWT, auth_middleware_1.requireSuperAdmin, event_controller_1.EventController.createEvent);
router.put('/admin/:id', auth_middleware_1.authenticateJWT, auth_middleware_1.requireSuperAdmin, event_controller_1.EventController.updateEvent);
router.delete('/admin/:id', auth_middleware_1.authenticateJWT, auth_middleware_1.requireSuperAdmin, event_controller_1.EventController.deleteEvent);
exports.default = router;
