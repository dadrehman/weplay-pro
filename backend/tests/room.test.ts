import request from 'supertest';
import app from '../src/app';
import prisma from '../src/db/prisma';
import jwt from 'jsonwebtoken';
import { Role, RoomStatus } from '@prisma/client';
import { RoomService } from '../src/services/room.service';
import { AgoraService } from '../src/services/agora.service';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret-weplay-jwt-key-change-in-production-min32chars';

// Mock prisma client
jest.mock('../src/db/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    room: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    roomSeat: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    adminLog: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Voice Room & 8-Seat Real-Time Engine Tests', () => {
  let hostToken: string;
  let playerToken: string;
  let superadminToken: string;

  beforeAll(() => {
    hostToken = jwt.sign(
      { userId: 'host-user-1', username: 'LoungeHost', email: 'host@weplay.pro', role: Role.user },
      JWT_SECRET
    );
    playerToken = jwt.sign(
      { userId: 'player-user-2', username: 'VoicePlayer', email: 'player@weplay.pro', role: Role.user },
      JWT_SECRET
    );
    superadminToken = jwt.sign(
      { userId: 'admin-super-1', username: 'SuperModerator', email: 'mod@weplay.pro', role: Role.superadmin },
      JWT_SECRET
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Agora RTC Token Generation', () => {
    it('should generate a valid dynamic Agora token for publisher and subscriber', () => {
      const pubToken = AgoraService.generateRtcToken('test_channel', 12345, true);
      expect(pubToken).toHaveProperty('token');
      expect(pubToken.channel).toBe('test_channel');
      expect(pubToken.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

      const subToken = AgoraService.generateRtcToken('test_channel', 12345, false);
      expect(subToken).toHaveProperty('token');
    });
  });

  describe('POST /api/rooms - Room Creation', () => {
    it('should create room, auto-assign host to seat 0, and return Agora publisher token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'host-user-1',
        username: 'LoungeHost',
        email: 'host@weplay.pro',
        role: Role.user,
        isBanned: false,
      });

      // Mock transaction for room and 8 seats creation
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const fakeTx = {
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'host-user-1',
              username: 'LoungeHost',
              avatarUrl: null,
              isBanned: false,
            }),
          },
          room: {
            create: jest.fn().mockResolvedValue({
              id: 'room-uuid-1',
              title: 'Werewolf Voice Lounge',
              hostId: 'host-user-1',
              isLocked: false,
              agoraChannel: 'weplay_room_channel_1',
              status: RoomStatus.ACTIVE,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
          roomSeat: {
            create: jest.fn().mockImplementation(({ data }) =>
              Promise.resolve({
                id: `seat-${data.seatIndex}`,
                roomId: data.roomId,
                seatIndex: data.seatIndex,
                userId: data.userId,
                isLocked: false,
                isMuted: false,
              })
            ),
          },
        };
        return await callback(fakeTx);
      });

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'Werewolf Voice Lounge',
          isLocked: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.room.title).toBe('Werewolf Voice Lounge');
      expect(response.body.data.room.seats).toHaveLength(8);
      // Seat 0 must be occupied by host
      expect(response.body.data.room.seats[0].userId).toBe('host-user-1');
      // Seats 1..7 must be empty
      expect(response.body.data.room.seats[1].userId).toBeNull();
      // Agora publisher credentials provided
      expect(response.body.data.agora).toHaveProperty('token');
      expect(response.body.data.agora).toHaveProperty('channel');
    });
  });

  describe('RoomService 8-Seat Boundary & Occupancy Safety', () => {
    it('should REJECT taking seat with index > 7 or < 0', async () => {
      await expect(
        RoomService.takeSeat('room-1', 8, 'player-user-2')
      ).rejects.toThrow('Invalid seat index: seat must be between 0 and 7');

      await expect(
        RoomService.takeSeat('room-1', -1, 'player-user-2')
      ).rejects.toThrow('Invalid seat index: seat must be between 0 and 7');
    });

    it('should REJECT taking an already occupied seat', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const fakeTx = {
          room: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'room-1',
              status: RoomStatus.ACTIVE,
              agoraChannel: 'chan-1',
            }),
          },
          roomSeat: {
            findFirst: jest.fn().mockResolvedValue(null), // User not currently seated
            findUnique: jest.fn().mockResolvedValue({
              id: 'seat-0',
              roomId: 'room-1',
              seatIndex: 0,
              userId: 'host-user-1', // Already occupied by host!
              isLocked: false,
            }),
          },
        };
        return await callback(fakeTx);
      });

      await expect(
        RoomService.takeSeat('room-1', 0, 'player-user-2')
      ).rejects.toThrow('Seat 0 is already occupied');
    });

    it('should REJECT user sitting in two seats simultaneously in the same room', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const fakeTx = {
          room: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'room-1',
              status: RoomStatus.ACTIVE,
              agoraChannel: 'chan-1',
            }),
          },
          roomSeat: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'seat-2',
              roomId: 'room-1',
              seatIndex: 2,
              userId: 'player-user-2', // Already sitting on seat 2
            }),
          },
        };
        return await callback(fakeTx);
      });

      await expect(
        RoomService.takeSeat('room-1', 5, 'player-user-2')
      ).rejects.toThrow('User is already seated at seat index 2');
    });
  });

  describe('Admin Room Supervision & Termination', () => {
    it('should allow Superadmin to force terminate an active room', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-super-1',
        username: 'SuperModerator',
        email: 'mod@weplay.pro',
        role: Role.superadmin,
        isBanned: false,
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const fakeTx = {
          room: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'room-to-kill',
              hostId: 'host-1',
              status: RoomStatus.ACTIVE,
            }),
            update: jest.fn().mockResolvedValue({
              id: 'room-to-kill',
              status: RoomStatus.TERMINATED,
            }),
          },
          roomSeat: {
            updateMany: jest.fn().mockResolvedValue({ count: 8 }),
          },
          adminLog: {
            create: jest.fn().mockResolvedValue({ id: 'log-term' }),
          },
        };
        return await callback(fakeTx);
      });

      const response = await request(app)
        .delete('/api/admin/rooms/room-to-kill')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          reason: 'Violated terms of service (harassment)',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('terminated successfully');
      expect(response.body.data.status).toBe(RoomStatus.TERMINATED);
    });

    it('should allow Superadmin to force mute an occupant on seat', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-super-1',
        username: 'SuperModerator',
        email: 'mod@weplay.pro',
        role: Role.superadmin,
        isBanned: false,
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const fakeTx = {
          room: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'room-1',
              hostId: 'host-1',
            }),
          },
          roomSeat: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'seat-3',
              roomId: 'room-1',
              seatIndex: 3,
              userId: 'abusive-user',
              isMuted: false, // Currently unmuted
            }),
            update: jest.fn().mockResolvedValue({
              id: 'seat-3',
              roomId: 'room-1',
              seatIndex: 3,
              userId: 'abusive-user',
              isMuted: true, // Now muted
            }),
          },
        };
        return await callback(fakeTx);
      });

      const response = await request(app)
        .post('/api/admin/rooms/room-1/mute-user')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          seatIndex: 3,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isMuted).toBe(true);
    });
  });
});
