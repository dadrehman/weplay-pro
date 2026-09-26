import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { getSocketIO } from '../socket/socket.handler';

export class MessageController {
  /**
   * GET /api/messages/conversations
   * Fetch all active conversation threads for the authenticated user
   */
  static async getConversations(req: Request, res: Response) {
    try {
      const currentUserId = (req as any).user?.userId;
      if (!currentUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Find all messages involving this user
      const messages = await prisma.directMessage.findMany({
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
      const conversationMap = new Map<string, any>();

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
    } catch (err: any) {
      console.error('[MessageController.getConversations] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch conversations', message: err.message });
    }
  }

  /**
   * GET /api/messages/:otherUserId
   * Fetch chat history with a specific user and mark incoming messages as read
   */
  static async getMessages(req: Request, res: Response) {
    try {
      const currentUserId = (req as any).user?.userId;
      const { otherUserId } = req.params;

      if (!currentUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!otherUserId) {
        return res.status(400).json({ error: 'otherUserId is required' });
      }

      // Mark unread messages sent to me as read
      await prisma.directMessage.updateMany({
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
      const io = getSocketIO();
      if (io) {
        io.to(`user:${otherUserId}`).emit('message:read_receipt', {
          readByUserId: currentUserId,
        });
      }

      // Fetch messages between current user and other user
      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });

      return res.status(200).json({ messages });
    } catch (err: any) {
      console.error('[MessageController.getMessages] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch messages', message: err.message });
    }
  }

  /**
   * POST /api/messages/send
   * Send a direct message to a user
   */
  static async sendMessage(req: Request, res: Response) {
    try {
      const currentUserId = (req as any).user?.userId;
      const { receiverId, content } = req.body;

      if (!currentUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!receiverId || !content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'receiverId and content are required' });
      }

      // Verify recipient exists
      const recipient = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, username: true },
      });

      if (!recipient) {
        return res.status(404).json({ error: 'Recipient user not found' });
      }

      // Create message in database
      const newMessage = await prisma.directMessage.create({
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
      const io = getSocketIO();
      if (io) {
        // Emit to recipient's personal room
        io.to(`user:${receiverId}`).emit('message:received', newMessage);
        // Emit confirmation back to sender's room
        io.to(`user:${currentUserId}`).emit('message:sent', newMessage);
      }

      return res.status(201).json({ success: true, message: newMessage });
    } catch (err: any) {
      console.error('[MessageController.sendMessage] Error:', err);
      return res.status(500).json({ error: 'Failed to send message', message: err.message });
    }
  }
}
