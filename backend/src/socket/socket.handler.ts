import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import { RoomService } from '../services/room.service';
import prisma from '../db/prisma';

let io: SocketIOServer | null = null;

// User presence tracking: userId -> { isOnline: boolean, activity: string, lastSeen: Date }
export const userPresenceMap = new Map<string, { isOnline: boolean; activity: string; lastSeen: Date }>();

export function getUserPresence(userId: string): { isOnline: boolean; activity: string; lastSeen: Date } {
  return userPresenceMap.get(userId) || { isOnline: false, activity: 'Offline', lastSeen: new Date() };
}

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret-weplay-jwt-key-change-in-production-min32chars';


export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      (socket as any).user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      (socket as any).user = null;
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = ((socket as any).user as JwtPayload) || {
      userId: 'guest-' + socket.id,
      username: 'DashboardObserver',
      email: 'admin-dash@weplay.pro',
      role: 'admin',
    };

    if (user && user.userId) {
      const userRoom = `user:${user.userId}`;
      socket.join(userRoom);

      if (!user.userId.startsWith('guest-')) {
        userPresenceMap.set(user.userId, { isOnline: true, activity: 'In Lobby', lastSeen: new Date() });
        io?.emit('presence:update', { userId: user.userId, isOnline: true, activity: 'In Lobby' });
      }
    }

    // ==========================================
    // VOICE ROOM STATE SYNCHRONIZATION EVENTS
    // ==========================================

    // 1. Join room
    socket.on('room:join', async (roomId: string, callback?: Function) => {
      try {
        socket.join(`room:${roomId}`);
        if (user.userId && !user.userId.startsWith('guest-')) {
          userPresenceMap.set(user.userId, { isOnline: true, activity: 'Voice Room', lastSeen: new Date() });
          io?.emit('presence:update', { userId: user.userId, isOnline: true, activity: 'Voice Room' });
        }
        socket.to(`room:${roomId}`).emit('user:joined_room', {

          userId: user.userId,
          username: user.username,
        });

        if (callback) {
          const room = await RoomService.getRoomById(roomId);
          callback({ success: true, room });
        }
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 2. Leave room
    socket.on('room:leave', async (roomId: string, callback?: Function) => {
      try {
        socket.leave(`room:${roomId}`);
        // If user was on a seat, release seat
        try {
          const leaveResult = await RoomService.leaveSeat(roomId, user.userId);
          io?.to(`room:${roomId}`).emit('seat:updated', {
            seatIndex: leaveResult.seat.seatIndex,
            seat: leaveResult.seat,
            action: 'LEAVE',
          });
        } catch (_) {
          // User was audience, not seated
        }

        socket.to(`room:${roomId}`).emit('user:left_room', {
          userId: user.userId,
          username: user.username,
        });

        if (callback) callback({ success: true });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 3. Take Seat (0..7)
    socket.on('seat:take', async (data: { roomId: string; seatIndex: number }, callback?: Function) => {
      try {
        const { roomId, seatIndex } = data;
        const result = await RoomService.takeSeat(roomId, seatIndex, user.userId);

        // Broadcast seat update to all room members
        io?.to(`room:${roomId}`).emit('seat:updated', {
          seatIndex,
          seat: result.seat,
          action: 'TAKE',
        });

        if (callback) callback({ success: true, ...result });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 4. Leave Seat
    socket.on('seat:leave', async (data: { roomId: string }, callback?: Function) => {
      try {
        const { roomId } = data;
        const result = await RoomService.leaveSeat(roomId, user.userId);

        io?.to(`room:${roomId}`).emit('seat:updated', {
          seatIndex: result.seat.seatIndex,
          seat: result.seat,
          action: 'LEAVE',
        });

        if (callback) callback({ success: true, ...result });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 5. Toggle Microphone Mute
    socket.on('seat:toggle_mute', async (data: { roomId: string; seatIndex: number }, callback?: Function) => {
      try {
        const { roomId, seatIndex } = data;
        const isAdmin = user.role === 'superadmin' || user.role === 'admin';
        const updatedSeat = await RoomService.toggleMute(roomId, seatIndex, user.userId, isAdmin);

        io?.to(`room:${roomId}`).emit('seat:updated', {
          seatIndex,
          seat: updatedSeat,
          action: 'TOGGLE_MUTE',
        });

        if (callback) callback({ success: true, seat: updatedSeat });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 6. Host / Admin Seat Management (Lock, Unlock, Kick)
    socket.on(
      'seat:admin_action',
      async (
        data: { roomId: string; seatIndex: number; action: 'LOCK' | 'UNLOCK' | 'KICK' },
        callback?: Function
      ) => {
        try {
          const { roomId, seatIndex, action } = data;
          const isAdmin = user.role === 'superadmin' || user.role === 'admin';
          const result = await RoomService.seatAdminAction(
            roomId,
            seatIndex,
            action,
            user.userId,
            isAdmin
          );

          io?.to(`room:${roomId}`).emit('seat:updated', {
            seatIndex,
            seat: result.seat,
            action,
            kickedUser: result.kickedUser,
          });

          if (callback) callback({ success: true, ...result });
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      }
    );

    // 7. Real-Time Room Speaking State
    socket.on('room:speaking', (data: { roomId: string; isSpeaking: boolean; seatIndex?: number }) => {
      if (!data?.roomId) return;
      io?.to(`room:${data.roomId}`).emit('user:speaking_state', {
        userId: user.userId,
        isSpeaking: data.isSpeaking,
        seatIndex: data.seatIndex,
      });
    });

    // 8. In-Room Live Chat Message
    socket.on('room:message', (data: { roomId: string; content: string }) => {
      if (!data?.roomId || !data?.content) return;
      io?.to(`room:${data.roomId}`).emit('room:new_message', {
        roomId: data.roomId,
        senderId: user.userId,
        username: user.username,
        content: data.content.trim(),
        createdAt: new Date().toISOString(),
      });
    });

    // 9. 1-on-1 Direct Messaging via Socket
    socket.on('message:send', async (data: { receiverId: string; content: string }, callback?: Function) => {
      try {
        if (!user.userId || user.userId.startsWith('guest-')) {
          if (callback) callback({ success: false, error: 'Unauthorized' });
          return;
        }

        const { receiverId, content } = data;
        if (!receiverId || !content?.trim()) {
          if (callback) callback({ success: false, error: 'receiverId and content required' });
          return;
        }

        const created = await prisma.directMessage.create({
          data: {
            senderId: user.userId,
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

        // Push directly to recipient's personal room
        io?.to(`user:${receiverId}`).emit('message:received', created);
        // Echo back to sender
        socket.emit('message:sent', created);

        if (callback) callback({ success: true, message: created });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 10. Direct Message Read Receipt
    socket.on('message:read', async (data: { otherUserId: string }) => {
      try {
        if (!user.userId || !data?.otherUserId) return;
        await prisma.directMessage.updateMany({
          where: {
            senderId: data.otherUserId,
            receiverId: user.userId,
            isRead: false,
          },
          data: { isRead: true },
        });

        io?.to(`user:${data.otherUserId}`).emit('message:read_receipt', {
          readByUserId: user.userId,
        });
      } catch (err) {
        // silent fail on receipt
      }
    });

    socket.on('disconnect', () => {
      if (user.userId && !user.userId.startsWith('guest-')) {
        userPresenceMap.set(user.userId, { isOnline: false, activity: 'Offline', lastSeen: new Date() });
        io?.emit('presence:update', { userId: user.userId, isOnline: false, activity: 'Offline' });
      }
    });

  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

export const getIO = getSocketIO;
