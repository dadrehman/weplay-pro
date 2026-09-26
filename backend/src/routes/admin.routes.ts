import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateJWT, requireSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

// Guard all admin routes with authentication and superadmin authorization
router.use(authenticateJWT);
router.use(requireSuperAdmin);

// User management endpoints
router.get('/users', AdminController.getUsers);
router.get('/users/trash', AdminController.getTrashUsers);
router.patch('/users/:id/coins', AdminController.adjustCoins);
router.patch('/users/:id/status', AdminController.toggleUserStatus);
router.delete('/users/:id', AdminController.deleteUser);
router.post('/users/:id/restore', AdminController.restoreUser);
router.delete('/users/:id/purge', AdminController.purgeUser);
router.post('/users/:id/update-all', AdminController.updateUserAll);

router.post('/users/:id/titles/assign', AdminController.assignTitle);
router.post('/users/:id/titles/revoke', AdminController.revokeTitle);
router.post('/users/:id/badges/assign', AdminController.assignBadge);
router.post('/users/:id/badges/revoke', AdminController.revokeBadge);

// Family management endpoints
router.get('/families', AdminController.getFamilies);
router.post('/families', AdminController.createFamily);
router.put('/families/:id', AdminController.updateFamily);
router.delete('/families/:id', AdminController.deleteFamily);

// Title & Badge catalog endpoints
router.get('/titles', AdminController.getTitles);
router.post('/titles', AdminController.createTitle);
router.put('/titles/:id', AdminController.updateTitle);
router.delete('/titles/:id', AdminController.deleteTitle);

router.get('/badges', AdminController.getBadges);
router.post('/badges', AdminController.createBadge);
router.put('/badges/:id', AdminController.updateBadge);
router.delete('/badges/:id', AdminController.deleteBadge);

// Audit logging endpoint
router.get('/logs', AdminController.getLogs);

// Voice Room supervision endpoints
router.get('/rooms', AdminController.getRooms);
router.delete('/rooms/:id', AdminController.terminateRoom);
router.post('/rooms/:id/terminate', AdminController.terminateRoom);
router.post('/rooms/:id/mute-user', AdminController.forceMuteUser);
router.post('/rooms/:id/kick-seat', AdminController.forceKickSeat);

// System Announcement & Broadcast endpoints
router.post('/broadcast', AdminController.broadcastAnnouncement);
router.post('/messages/broadcast', AdminController.broadcastAnnouncement);

export default router;
