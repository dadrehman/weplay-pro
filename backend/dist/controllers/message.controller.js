"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageController = void 0;
const prisma_1 = __importDefault(require("../db/prisma"));
const socket_handler_1 = require("../socket/socket.handler");
class MessageController {
    /**
     * GET /api/messages/conversations
     * Fetch all active conversation threads for the authenticated user
     */
    static async getConversations(req, res) {
        try {
            const currentUserId = req.user?.userId;
            if (!currentUserId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Find all messages involving this user
            const messages = await prisma_1.default.directMessage.findMany({
                where: {
                    OR: [
                        { senderId: currentUserId },
                        { receiverId: currentUserId },
                    ],
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    sender: {
                        select: {
                            id: true,
                            displayId: true,
                            username: true,
                            avatarUrl: true,
                            gender: true,
                            activeLevel: true,
                        },
                    },
                    receiver: {
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
            // Group by conversation partner
            const conversationMap = new Map();
            for (const msg of messages) {
                const otherUser = msg.senderId === currentUserId ? msg.receiver : msg.sender;
                const otherUserId = otherUser.id;
                if (!conversationMap.has(otherUserId)) {
                    conversationMap.set(otherUserId, {
                        user: {
                            id: otherUser.id,
                            displayId: otherUser.displayId,
                            username: otherUser.username,
                            avatarUrl: otherUser.avatarUrl,
                            gender: otherUser.gender,
                            activeLevel: otherUser.activeLevel,
                            isOnline: true,
                        },
                        lastMessage: {
                            id: msg.id,
                            content: msg.content,
                            createdAt: msg.createdAt,
                            senderId: msg.senderId,
                            receiverId: msg.receiverId,
                            isRead: msg.isRead,
                        },
                        unreadCount: 0,
                    });
                }
                // Count unread messages sent to current user
                if (msg.receiverId === currentUserId && !msg.isRead) {
                    const conv = conversationMap.get(otherUserId);
                    conv.unreadCount += 1;
                }
            }
            const conversations = Array.from(conversationMap.values());
            return res.status(200).json({ conversations });
        }
        catch (err) {
            console.error('[MessageController.getConversations] Error:', err);
            return res.status(500).json({ error: 'Failed to fetch conversations', message: err.message });
        }
    }
    /**
     * GET /api/messages/:otherUserId
     * Fetch chat history with a specific user and mark incoming messages as read
     */
    static async getMessages(req, res) {
        try {
            const currentUserId = req.user?.userId;
            const { otherUserId } = req.params;
            if (!currentUserId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!otherUserId) {
                return res.status(400).json({ error: 'otherUserId is required' });
            }
            // Mark unread messages sent to me as read
            await prisma_1.default.directMessage.updateMany({
                where: {
                    senderId: otherUserId,
                    receiverId: currentUserId,
                    isRead: false,
                },
                data: {
                    isRead: true,
                },
            });
            // Notify the sender that messages were read
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                io.to(`user:${otherUserId}`).emit('message:read_receipt', {
                    readByUserId: currentUserId,
                });
            }
            // Fetch messages between current user and other user
            const messages = await prisma_1.default.directMessage.findMany({
                where: {
                    OR: [
                        { senderId: currentUserId, receiverId: otherUserId },
                        { senderId: otherUserId, receiverId: currentUserId },
                    ],
                },
                orderBy: { createdAt: 'asc' },
            });
            return res.status(200).json({ messages });
        }
        catch (err) {
            console.error('[MessageController.getMessages] Error:', err);
            return res.status(500).json({ error: 'Failed to fetch messages', message: err.message });
        }
    }
    /**
     * POST /api/messages/send
     * Send a direct message to a user
     */
    static async sendMessage(req, res) {
        try {
            const currentUserId = req.user?.userId;
            const { receiverId, content } = req.body;
            if (!currentUserId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!receiverId || !content || typeof content !== 'string' || content.trim().length === 0) {
                return res.status(400).json({ error: 'receiverId and content are required' });
            }
            // Verify recipient exists
            const recipient = await prisma_1.default.user.findUnique({
                where: { id: receiverId },
                select: { id: true, username: true },
            });
            if (!recipient) {
                return res.status(404).json({ error: 'Recipient user not found' });
            }
            // Create message in database
            const newMessage = await prisma_1.default.directMessage.create({
                data: {
                    senderId: currentUserId,
                    receiverId,
                    content: content.trim(),
                    isRead: false,
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            displayId: true,
                            username: true,
                            avatarUrl: true,
                        },
                    },
                },
            });
            // Real-time delivery via Socket.io
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                // Emit to recipient's personal room
                io.to(`user:${receiverId}`).emit('message:received', newMessage);
                // Emit confirmation back to sender's room
                io.to(`user:${currentUserId}`).emit('message:sent', newMessage);
            }
            return res.status(201).json({ success: true, message: newMessage });
        }
        catch (err) {
            console.error('[MessageController.sendMessage] Error:', err);
            return res.status(500).json({ error: 'Failed to send message', message: err.message });
        }
    }
}
exports.MessageController = MessageController;
