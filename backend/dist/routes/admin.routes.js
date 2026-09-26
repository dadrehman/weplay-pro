"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Guard all admin routes with authentication and superadmin authorization
router.use(auth_middleware_1.authenticateJWT);
router.use(auth_middleware_1.requireSuperAdmin);
// User management endpoints
router.get('/users', admin_controller_1.AdminController.getUsers);
router.get('/users/trash', admin_controller_1.AdminController.getTrashUsers);
router.patch('/users/:id/coins', admin_controller_1.AdminController.adjustCoins);
router.patch('/users/:id/status', admin_controller_1.AdminController.toggleUserStatus);
router.delete('/users/:id', admin_controller_1.AdminController.deleteUser);
router.post('/users/:id/restore', admin_controller_1.AdminController.restoreUser);
router.delete('/users/:id/purge', admin_controller_1.AdminController.purgeUser);
router.post('/users/:id/update-all', admin_controller_1.AdminController.updateUserAll);
router.post('/users/:id/titles/assign', admin_controller_1.AdminController.assignTitle);
router.post('/users/:id/titles/revoke', admin_controller_1.AdminController.revokeTitle);
router.post('/users/:id/badges/assign', admin_controller_1.AdminController.assignBadge);
router.post('/users/:id/badges/revoke', admin_controller_1.AdminController.revokeBadge);
// Family management endpoints
router.get('/families', admin_controller_1.AdminController.getFamilies);
router.post('/families', admin_controller_1.AdminController.createFamily);
router.put('/families/:id', admin_controller_1.AdminController.updateFamily);
router.delete('/families/:id', admin_controller_1.AdminController.deleteFamily);
// Title & Badge catalog endpoints
router.get('/titles', admin_controller_1.AdminController.getTitles);
router.post('/titles', admin_controller_1.AdminController.createTitle);
router.put('/titles/:id', admin_controller_1.AdminController.updateTitle);
router.delete('/titles/:id', admin_controller_1.AdminController.deleteTitle);
router.get('/badges', admin_controller_1.AdminController.getBadges);
router.post('/badges', admin_controller_1.AdminController.createBadge);
router.put('/badges/:id', admin_controller_1.AdminController.updateBadge);
router.delete('/badges/:id', admin_controller_1.AdminController.deleteBadge);
// Audit logging endpoint
router.get('/logs', admin_controller_1.AdminController.getLogs);
// Voice Room supervision endpoints
router.get('/rooms', admin_controller_1.AdminController.getRooms);
router.delete('/rooms/:id', admin_controller_1.AdminController.terminateRoom);
router.post('/rooms/:id/terminate', admin_controller_1.AdminController.terminateRoom);
router.post('/rooms/:id/mute-user', admin_controller_1.AdminController.forceMuteUser);
router.post('/rooms/:id/kick-seat', admin_controller_1.AdminController.forceKickSeat);
// System Announcement & Broadcast endpoints
router.post('/broadcast', admin_controller_1.AdminController.broadcastAnnouncement);
router.post('/messages/broadcast', admin_controller_1.AdminController.broadcastAnnouncement);
exports.default = router;
