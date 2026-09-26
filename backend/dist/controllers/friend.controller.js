"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendController = void 0;
const prisma_1 = __importDefault(require("../db/prisma"));
const socket_handler_1 = require("../socket/socket.handler");
class FriendController {
    /**
     * GET /api/friends
     * Fetch all accepted friends of the authenticated user
     */
    static async getFriends(req, res) {
        try {
            const currentUserId = req.user?.userId;
            if (!currentUserId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const friendships = await prisma_1.default.friendship.findMany({
                where: {
                    OR: [
                        { userId: currentUserId, status: 'ACCEPTED' },
                        { friendId: currentUserId, status: 'ACCEPTED' },
                    ],
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            displayId: true,
                            username: true,
                            avatarUrl: true,
                            gender: true,
                            activeLevel: true,
                            signature: true,
                        },
                    },
                    friend: {
                        select: {
                            id: true,
                            displayId: true,
                            username: true,
                            avatarUrl: true,
                            gender: true,
                            activeLevel: true,
                            signature: true,
                        },
                    },
                },
            });
            const friends = friendships.map((f) => {
                const friendUser = f.userId === currentUserId ? f.friend : f.user;
                const presence = (0, socket_handler_1.getUserPresence)(friendUser.id);
                return {
                    ...friendUser,
                    isOnline: presence.isOnline,
                    activity: presence.activity,
                    lastSeen: presence.lastSeen,
                };
            });
            return res.status(200).json({ friends });
        }
        catch (err) {
            console.error('[FriendController.getFriends] Error:', err);
            return res.status(500).json({ error: 'Failed to fetch friends', message: err.message });
        }
    }
    /**
     * GET /api/friends/requests
     * Fetch pending friend requests sent to the authenticated user
     */
    static async getRequests(req, res) {
        try {
            const currentUserId = req.user?.userId;
            if (!currentUserId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const pendingRequests = await prisma_1.default.friendship.findMany({
                where: {
                    friendId: currentUserId,
                    status: 'PENDING',
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            displayId: true,
                            username: true,
                            avatarUrl: true,
                            gender: true,
                            activeLevel: true,
                            signature: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            const requests = pendingRequests.map((r) => ({
                id: r.id,
                createdAt: r.createdAt,
                requester: r.user,
            }));
            return res.status(200).json({ requests });
        }
        catch (err) {
            console.error('[FriendController.getRequests] Error:', err);
            return res.status(500).json({ error: 'Failed to fetch friend requests', message: err.message });
        }
    }
    /**
     * POST /api/friends/request
     * Send a friend request to another user
     */
    static async sendRequest(req, res) {
        try {
            const currentUserId = req.user?.userId;
            const { targetUserId } = req.body;
            if (!currentUserId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!targetUserId || targetUserId === currentUserId) {
                return res.status(400).json({ error: 'Valid targetUserId is required' });
            }
            const targetUser = await prisma_1.default.user.findUnique({
                where: { id: targetUserId },
                select: { id: true, username: true },
            });
            if (!targetUser) {
                return res.status(404).json({ error: 'Target user not found' });
            }
            // Check existing friendship or request
            const existing = await prisma_1.default.friendship.findFirst({
                where: {
                    OR: [
                        { userId: currentUserId, friendId: targetUserId },
                        { userId: targetUserId, friendId: currentUserId },
                    ],
                },
            });
            if (existing) {
                if (existing.status === 'ACCEPTED') {
                    return res.status(400).json({ error: 'You are already friends with this user' });
                }
                return res.status(400).json({ error: 'A friend request is already pending between you' });
            }
            const friendship = await prisma_1.default.friendship.create({
                data: {
                    userId: currentUserId,
                    friendId: targetUserId,
                    status: 'PENDING',
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            displayId: true,
                            username: true,
                            avatarUrl: true,
                            gender: true,
                            activeLevel: true,
                        },
                    },
                },
            });
            // Socket notification
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                io.to(`user:${targetUserId}`).emit('friend:request_received', {
                    friendshipId: friendship.id,
                    requester: friendship.user,
                });
            }
            return res.status(201).json({ success: true, friendship });
        }
        catch (err) {
            console.error('[FriendController.sendRequest] Error:', err);
            return res.status(500).json({ error: 'Failed to send friend request', message: err.message });
        }
    }
    /**
     * POST /api/friends/accept
     * Accept a pending friend request
     */
    static async acceptRequest(req, res) {
        try {
            const currentUserId = req.user?.userId;
            const { requesterId } = req.body;
            if (!currentUserId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const friendship = await prisma_1.default.friendship.findFirst({
                where: {
                    userId: requesterId,
                    friendId: currentUserId,
                    status: 'PENDING',
                },
            });
            if (!friendship) {
                return res.status(404).json({ error: 'Pending friend request not found' });
            }
            const updated = await prisma_1.default.friendship.update({
                where: { id: friendship.id },
                data: { status: 'ACCEPTED' },
            });
            // Notify the requester
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                io.to(`user:${requesterId}`).emit('friend:accepted', {
                    friendId: currentUserId,
                });
            }
            return res.status(200).json({ success: true, friendship: updated });
        }
        catch (err) {
            console.error('[FriendController.acceptRequest] Error:', err);
            return res.status(500).json({ error: 'Failed to accept friend request', message: err.message });
        }
    }
    /**
     * POST /api/friends/reject
     * Reject a friend request or remove friend
     */
    static async rejectRequest(req, res) {
        try {
            const currentUserId = req.user?.userId;
            const { targetUserId } = req.body;
            if (!currentUserId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            await prisma_1.default.friendship.deleteMany({
                where: {
                    OR: [
                        { userId: currentUserId, friendId: targetUserId },
                        { userId: targetUserId, friendId: currentUserId },
                    ],
                },
            });
            return res.status(200).json({ success: true });
        }
        catch (err) {
            console.error('[FriendController.rejectRequest] Error:', err);
            return res.status(500).json({ error: 'Failed to remove or reject friendship', message: err.message });
        }
    }
    /**
     * GET /api/friends/search?q=...
     * Search users by displayId or username
     */
    static async searchUsers(req, res) {
        try {
            const currentUserId = req.user?.userId;
            const query = (req.query.q || '').trim();
            if (!query || query.length < 2) {
                return res.status(200).json({ users: [] });
            }
            const users = await prisma_1.default.user.findMany({
                where: {
                    AND: [
                        currentUserId ? { id: { not: currentUserId } } : {},
                        { isBanned: false },
                        {
                            OR: [
                                { displayId: { contains: query, mode: 'insensitive' } },
                                { username: { contains: query, mode: 'insensitive' } },
                            ],
                        },
                    ],
                },
                select: {
                    id: true,
                    displayId: true,
                    username: true,
                    avatarUrl: true,
                    gender: true,
                    activeLevel: true,
                    signature: true,
                },
                take: 20,
            });
            return res.status(200).json({ users });
        }
        catch (err) {
            console.error('[FriendController.searchUsers] Error:', err);
            return res.status(500).json({ error: 'Failed to search users', message: err.message });
        }
    }
}
exports.FriendController = FriendController;
