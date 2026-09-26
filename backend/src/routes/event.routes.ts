import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authenticateJWT, requireSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

// Public events endpoint
router.get('/', EventController.getEvents);

// Superadmin CRUD
router.post('/admin', authenticateJWT, requireSuperAdmin, EventController.createEvent);
router.put('/admin/:id', authenticateJWT, requireSuperAdmin, EventController.updateEvent);
router.delete('/admin/:id', authenticateJWT, requireSuperAdmin, EventController.deleteEvent);

export default router;
