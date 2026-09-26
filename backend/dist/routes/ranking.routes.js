"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ranking_controller_1 = require("../controllers/ranking.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Allow both unauthenticated and authenticated queries (for myRank calculation)
router.get('/', auth_middleware_1.optionalAuthenticateJWT, ranking_controller_1.RankingController.getRankings);
exports.default = router;
