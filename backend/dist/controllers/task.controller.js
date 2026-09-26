"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const prisma_1 = __importDefault(require("../db/prisma"));
const STATIC_TASKS = [
    // Daily Tasks (00:00 GMT+5 reset)
    {
        id: 'daily_login',
        category: 'DAILY',
        title: 'Daily Check-in',
        description: 'Log into WePlay once per day',
        target: 1,
        rewardCoins: 50,
        rewardExp: 20,
        activenessPoints: 20,
        actionDeepLink: '/weplay',
    },
    {
        id: 'daily_join_voice',
        category: 'DAILY',
        title: 'Voice Room Party',
        description: 'Join a voice room and stay for 3 minutes',
        target: 1,
        rewardCoins: 100,
        rewardExp: 35,
        activenessPoints: 25,
        actionDeepLink: '/voice',
    },
    {
        id: 'daily_send_message',
        category: 'DAILY',
        title: 'Social Butterfly',
        description: 'Send 3 messages in public room or DM',
        target: 3,
        rewardCoins: 80,
        rewardExp: 30,
        activenessPoints: 20,
        actionDeepLink: '/messages',
    },
    {
        id: 'daily_play_game',
        category: 'DAILY',
        title: 'Game On',
        description: 'Participate in any mini-game or match',
        target: 1,
        rewardCoins: 120,
        rewardExp: 40,
        activenessPoints: 35,
        actionDeepLink: '/weplay',
    },
    // Growth Tasks (Milestones)
    {
        id: 'growth_profile',
        category: 'GROWTH',
        title: 'Complete Profile',
        description: 'Upload custom avatar, nickname, and signature',
        target: 1,
        rewardCoins: 200,
        rewardExp: 100,
        activenessPoints: 0,
        actionDeepLink: '/me',
    },
    {
        id: 'growth_friends_3',
        category: 'GROWTH',
        title: 'Friendly Gathering',
        description: 'Add 3 mutual friends on WePlay',
        target: 3,
        rewardCoins: 300,
        rewardExp: 150,
        activenessPoints: 0,
        actionDeepLink: '/friends',
    },
    {
        id: 'growth_reach_level_5',
        category: 'GROWTH',
        title: 'Rising Star',
        description: 'Reach Active Level 5',
        target: 5,
        rewardCoins: 500,
        rewardExp: 250,
        activenessPoints: 0,
        actionDeepLink: '/me',
    },
    // Family Tasks
    {
        id: 'family_join_clan',
        category: 'FAMILY',
        title: 'Join or Create a Family',
        description: 'Become part of a WePlay Family Clan',
        target: 1,
        rewardCoins: 250,
        rewardExp: 100,
        activenessPoints: 15,
        actionDeepLink: '/discover',
    },
    {
        id: 'family_clan_voice',
        category: 'FAMILY',
        title: 'Clan Reunion',
        description: 'Spend time with clan members in a Voice Room',
        target: 1,
        rewardCoins: 150,
        rewardExp: 80,
        activenessPoints: 20,
        actionDeepLink: '/voice',
    },
];
class TaskController {
    static getTodayDateKey() {
        // GMT+5 Date Key
        const now = new Date();
        const gmt5 = new Date(now.getTime() + 5 * 60 * 60 * 1000);
        return gmt5.toISOString().split('T')[0];
    }
    /**
     * GET /api/tasks
     * Fetch all user tasks categorized with progress, completion status, and today's activeness
     */
    static async getTasks(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const todayDateKey = TaskController.getTodayDateKey();
            // Ensure daily check-in is logged
            await prisma_1.default.userTaskProgress.upsert({
                where: {
                    userId_taskId_dateKey: {
                        userId,
                        taskId: 'daily_login',
                        dateKey: todayDateKey,
                    },
                },
                create: {
                    userId,
                    taskId: 'daily_login',
                    category: 'DAILY',
                    progress: 1,
                    target: 1,
                    isCompleted: true,
                    isClaimed: false,
                    dateKey: todayDateKey,
                },
                update: {},
            });
            // Fetch progress records
            const progressRecords = await prisma_1.default.userTaskProgress.findMany({
                where: {
                    userId,
                    OR: [
                        { category: 'DAILY', dateKey: todayDateKey },
                        { category: { in: ['GROWTH', 'FAMILY'] } },
                    ],
                },
            });
            const progressMap = new Map(progressRecords.map((r) => [r.taskId, r]));
            let todayActiveness = 0;
            const mappedTasks = STATIC_TASKS.map((task) => {
                const prog = progressMap.get(task.id);
                const currentProgress = prog?.progress ?? (task.id === 'daily_login' ? 1 : 0);
                const isCompleted = prog?.isCompleted ?? (currentProgress >= task.target);
                const isClaimed = prog?.isClaimed ?? false;
                if (task.category === 'DAILY' && isCompleted) {
                    todayActiveness += task.activenessPoints;
                }
                return {
                    id: task.id,
                    category: task.category,
                    title: task.title,
                    description: task.description,
                    progress: currentProgress,
                    target: task.target,
                    rewardCoins: task.rewardCoins,
                    rewardExp: task.rewardExp,
                    activenessPoints: task.activenessPoints,
                    actionDeepLink: task.actionDeepLink,
                    isCompleted,
                    isClaimed,
                };
            });
            // Today's activeness milestone chests
            const milestoneChests = [
                { points: 10, rewardCoins: 50, isUnlocked: todayActiveness >= 10 },
                { points: 40, rewardCoins: 100, isUnlocked: todayActiveness >= 40 },
                { points: 70, rewardCoins: 200, isUnlocked: todayActiveness >= 70 },
                { points: 100, rewardCoins: 500, isUnlocked: todayActiveness >= 100 },
            ];
            return res.status(200).json({
                todayActiveness: Math.min(100, todayActiveness),
                maxActiveness: 100,
                milestoneChests,
                dailyTasks: mappedTasks.filter((t) => t.category === 'DAILY'),
                growthTasks: mappedTasks.filter((t) => t.category === 'GROWTH'),
                familyTasks: mappedTasks.filter((t) => t.category === 'FAMILY'),
            });
        }
        catch (err) {
            console.error('[TaskController.getTasks] Error:', err);
            return res.status(500).json({ error: 'Failed to fetch tasks', message: err.message });
        }
    }
    /**
     * POST /api/tasks/:taskId/claim
     * Claim completed task rewards and credit coins & EXP to user
     */
    static async claimTask(req, res) {
        try {
            const userId = req.user?.userId;
            const { taskId } = req.params;
            const taskDef = STATIC_TASKS.find((t) => t.id === taskId);
            if (!taskDef) {
                return res.status(404).json({ error: 'Task not found' });
            }
            const todayDateKey = TaskController.getTodayDateKey();
            const dateKey = taskDef.category === 'DAILY' ? todayDateKey : null;
            // Find user task progress
            const taskRecord = await prisma_1.default.userTaskProgress.findFirst({
                where: {
                    userId,
                    taskId,
                    ...(dateKey ? { dateKey } : {}),
                },
            });
            if (!taskRecord || !taskRecord.isCompleted) {
                return res.status(400).json({ error: 'Task is not yet completed' });
            }
            if (taskRecord.isClaimed) {
                return res.status(400).json({ error: 'Task reward has already been claimed' });
            }
            // Mark claimed and credit wallet in atomic transaction
            const updatedUser = await prisma_1.default.$transaction(async (tx) => {
                await tx.userTaskProgress.update({
                    where: { id: taskRecord.id },
                    data: { isClaimed: true },
                });
                return tx.user.update({
                    where: { id: userId },
                    data: {
                        coinsBalance: { increment: BigInt(taskDef.rewardCoins) },
                        expPoints: { increment: BigInt(taskDef.rewardExp) },
                    },
                    select: {
                        id: true,
                        coinsBalance: true,
                        expPoints: true,
                        activeLevel: true,
                    },
                });
            });
            return res.status(200).json({
                message: 'Task reward claimed successfully!',
                rewardCoins: taskDef.rewardCoins,
                rewardExp: taskDef.rewardExp,
                newBalance: updatedUser.coinsBalance.toString(),
            });
        }
        catch (err) {
            console.error('[TaskController.claimTask] Error:', err);
            return res.status(500).json({ error: 'Failed to claim task reward', message: err.message });
        }
    }
}
exports.TaskController = TaskController;
