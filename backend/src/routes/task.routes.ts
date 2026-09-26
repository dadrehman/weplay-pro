import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', TaskController.getTasks);
router.post('/:taskId/claim', TaskController.claimTask);

export default router;
