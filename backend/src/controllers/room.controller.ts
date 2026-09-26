import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { RoomService } from '../services/room.service';
import { AgoraService } from '../services/agora.service';
import { getSocketIO } from '../socket/socket.handler';

const createRoomSchema = z.object({
  title: z.string().min(2, 'Room title must be at least 2 characters').max(50),
  category: z.string().optional(),
  type: z.enum(['TEMPORARY', 'ADVANCED', 'temporary', 'advanced']).optional(),
  isLocked: z.boolean().optional(),
});

export class RoomController {
  /**
   * POST /api/rooms & POST /api/rooms/create
   * Creates a room, assigns host to seat 0, deducts coins for ADVANCED room, generates Agora publisher token.
   */
  static async createRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const parsed = createRoomSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      const hostId = req.user!.userId;
      const { title, category, type, isLocked } = parsed.data;

      const result = await RoomService.createRoom({
        title,
        hostId,
        category: category || 'ALL',
        type: (type || 'TEMPORARY').toUpperCase(),
        isLocked,
      });

      // Broadcast new room creation to global public lobby and dashboard
      const io = getSocketIO();
      if (io) {
        const publicRoomPayload = {
          id: result.room.id,
          roomIdDisplay: result.room.roomIdDisplay,
          title: result.room.title,
          roomType: result.room.roomType,
          category: result.room.category,
          host: result.room.host,
          occupiedSeatsCount: result.room.occupiedSeatsCount || 1,
          listenersCount: result.room.listenersCount || 0,
          totalSeats: 8,
          createdAt: result.room.createdAt,
        };

        io.emit('public:room_created', publicRoomPayload);
        io.emit('room:created', {
          id: result.room.id,
          title: result.room.title,
          host: result.room.host,
          occupiedSeatsCount: 1,
          totalSeats: 8,
        });
      }

      res.status(201).json({
        message: 'Voice room created successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Error creating voice room:', error);
      res.status(400).json({ error: error.message || 'Failed to create room' });
    }
  }

  /**
   * GET /api/rooms
   * Lists all active rooms with occupancy details and optional category filtering.
   */
  static async getActiveRooms(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 30;

      const rooms = await RoomService.getActiveRooms({ category, page, limit });
      res.status(200).json({ data: rooms });
    } catch (error: any) {
      console.error('Error fetching active rooms:', error);
      res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  }

  /**
   * GET /api/rooms/:id
   * Returns room metadata and all 8 seats.
   */
  static async getRoomById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const room = await RoomService.getRoomById(id);
      res.status(200).json({ data: room });
    } catch (error: any) {
      res.status(404).json({ error: error.message || 'Room not found' });
    }
  }

  /**
   * GET /api/rooms/:id/token
   * Generates a dynamic Agora RTC token for joining the room's voice channel.
   */
  static async getAgoraToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const room = await RoomService.getRoomById(id);

      // Determine if user is seated (publisher) or audience (subscriber)
      const isSeated = room.seats.some((seat) => seat.userId === userId);

      const agoraData = AgoraService.generateRtcToken(
        room.agoraChannel,
        0,
        isSeated
      );

      res.status(200).json({
        data: {
          ...agoraData,
          isPublisher: isSeated,
        },
      });
    } catch (error: any) {
      res.status(404).json({ error: error.message || 'Failed to generate voice token' });
    }
  }
}
