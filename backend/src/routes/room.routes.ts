import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.post('/', RoomController.createRoom);
router.post('/create', RoomController.createRoom);
router.get('/', RoomController.getActiveRooms);
router.get('/:id', RoomController.getRoomById);
router.get('/:id/token', RoomController.getAgoraToken);

export default router;
