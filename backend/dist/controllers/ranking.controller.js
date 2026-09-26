"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankingController = void 0;
const prisma_1 = __importDefault(require("../db/prisma"));
class RankingController {
    /**
     * GET /api/rankings
     * Query params:
     *   - category: 'POPULARITY' | 'VIP' | 'COUPLE' | 'ROOM' | 'BFF' | 'FAMILY' (default: 'POPULARITY')
     *   - filter: 'TODAY' | 'YESTERDAY' | 'CELEBRITY' | 'ANNUAL' | 'GLOBAL' (default: 'TODAY')
     *   - page: number (default: 1)
     *   - limit: number (default: 20)
     */
    static async getRankings(req, res) {
        try {
            const currentUserId = req.user?.userId;
            const category = (req.query.category || 'POPULARITY').toUpperCase();
            const filter = (req.query.filter || 'TODAY').toUpperCase();
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
            const skip = (page - 1) * limit;
            // Base query: only active, non-banned users
            const whereCondition = { isBanned: false };
            let orderBy = [{ charmPoints: 'desc' }, { expPoints: 'desc' }];
            if (category === 'VIP') {
                orderBy = [{ coinsBalance: 'desc' }, { charmPoints: 'desc' }];
            }
            else if (category === 'FAMILY') {
                // Query families if category is FAMILY
                const families = await prisma_1.default.family.findMany({
                    orderBy: { level: 'desc' },
                    take: limit,
                    skip,
                    include: {
                        owner: {
                            select: {
                                id: true,
                                username: true,
                                avatarUrl: true,
                                displayId: true,
                            },
                        },
                    },
                });
                const formatted = families.map((f, index) => ({
                    rank: skip + index + 1,
                    id: f.id,
                    name: f.name,
                    badgeTag: f.badgeTag,
                    badgeBgColor: f.badgeBgColor,
                    level: f.level,
                    iconUrl: f.iconUrl,
                    score: f.level * 1000,
                    owner: f.owner,
                }));
                return res.status(200).json({
                    category,
                    filter,
                    podium: formatted.slice(0, 3),
                    rankings: formatted.slice(3),
                    myRank: {
                        rank: 999,
                        score: 0,
                        label: 'No Family',
                    },
                });
            }
            // Fetch leaderboard users from database
            const [totalCount, users] = await Promise.all([
                prisma_1.default.user.count({ where: whereCondition }),
                prisma_1.default.user.findMany({
                    where: whereCondition,
                    orderBy,
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        displayId: true,
                        username: true,
                        avatarUrl: true,
                        gender: true,
                        activeLevel: true,
                        charmPoints: true,
                        coinsBalance: true,
                        expPoints: true,
                        signature: true,
                        family: {
                            select: {
                                name: true,
                                badgeTag: true,
                                badgeBgColor: true,
                            },
                        },
                    },
                }),
            ]);
            const formatted = users.map((u, index) => {
                const score = category === 'VIP' ? Number(u.coinsBalance) : Number(u.charmPoints);
                return {
                    rank: skip + index + 1,
                    id: u.id,
                    displayId: u.displayId || '48941316',
                    username: u.username,
                    avatarUrl: u.avatarUrl,
                    gender: u.gender,
                    activeLevel: u.activeLevel,
                    score,
                    scoreFormatted: score.toLocaleString(),
                    signature: u.signature,
                    family: u.family,
                };
            });
            // Calculate current user's rank
            let myRankData = {
                rank: 99,
                score: 0,
                scoreFormatted: '0',
                user: null,
            };
            if (currentUserId) {
                const currentUser = await prisma_1.default.user.findUnique({
                    where: { id: currentUserId },
                    select: {
                        id: true,
                        displayId: true,
                        username: true,
                        avatarUrl: true,
                        charmPoints: true,
                        coinsBalance: true,
                        activeLevel: true,
                    },
                });
                if (currentUser) {
                    const myScore = category === 'VIP'
                        ? Number(currentUser.coinsBalance)
                        : Number(currentUser.charmPoints);
                    // Count users with higher score
                    const higherCount = await prisma_1.default.user.count({
                        where: {
                            isBanned: false,
                            ...(category === 'VIP'
                                ? { coinsBalance: { gt: currentUser.coinsBalance } }
                                : { charmPoints: { gt: currentUser.charmPoints } }),
                        },
                    });
                    myRankData = {
                        rank: higherCount + 1,
                        score: myScore,
                        scoreFormatted: myScore.toLocaleString(),
                        user: {
                            id: currentUser.id,
                            displayId: currentUser.displayId,
                            username: currentUser.username,
                            avatarUrl: currentUser.avatarUrl,
                            activeLevel: currentUser.activeLevel,
                        },
                    };
                }
            }
            return res.status(200).json({
                category,
                filter,
                total: totalCount,
                page,
                podium: formatted.slice(0, 3),
                rankings: formatted.slice(3),
                myRank: myRankData,
            });
        }
        catch (err) {
            console.error('[RankingController.getRankings] Error:', err);
            return res.status(500).json({ error: 'Failed to calculate rankings', message: err.message });
        }
    }
}
exports.RankingController = RankingController;
