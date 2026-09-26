import { Router } from 'express';
import { RankingController } from '../controllers/ranking.controller';
import { optionalAuthenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// Allow both unauthenticated and authenticated queries (for myRank calculation)
router.get('/', optionalAuthenticateJWT, RankingController.getRankings);

export default router;
