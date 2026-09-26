import request from 'supertest';
import app from '../src/app';
import prisma from '../src/db/prisma';
import jwt from 'jsonwebtoken';
import { Role, ActionType } from '@prisma/client';
import { CoinService } from '../src/services/coin.service';

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
    adminLog: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Admin User Management & Coin Safety Tests', () => {
  let superadminToken: string;
  let regularUserToken: string;

  beforeAll(() => {
    superadminToken = jwt.sign(
      { userId: 'admin-123', username: 'head_admin', email: 'admin@weplay.pro', role: Role.superadmin },
      JWT_SECRET
    );
    regularUserToken = jwt.sign(
      { userId: 'user-456', username: 'regular_joe', email: 'joe@weplay.pro', role: Role.user },
      JWT_SECRET
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RBAC Role Guard Middleware', () => {
    it('should reject non-admin users from accessing /api/admin/users with 403', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-456',
        username: 'regular_joe',
        email: 'joe@weplay.pro',
        role: Role.user,
        isBanned: false,
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Superadmin role required');
    });

    it('should permit superadmin to access /api/admin/users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-123',
        username: 'head_admin',
        email: 'admin@weplay.pro',
        role: Role.superadmin,
        isBanned: false,
      });

      (prisma.user.count as jest.Mock).mockResolvedValue(1);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'user-999',
          username: 'player1',
          email: 'player1@gmail.com',
          role: Role.user,
          coinsBalance: 500n,
          charmPoints: 10,
          isBanned: false,
          avatarUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const response = await request(app)
        .get('/api/admin/users?page=1&limit=10&search=player')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].coinsBalance).toBe('500');
      expect(response.body.pagination).toMatchObject({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('PATCH /api/admin/users/:id/coins - Atomic Balance Mutations', () => {
    it('should credit coins (+500) and create AdminLog entry safely', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-123',
        username: 'head_admin',
        email: 'admin@weplay.pro',
        role: Role.superadmin,
        isBanned: false,
      });

      // Mock transaction execution
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const fakeTx = {
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'target-user-1',
              username: 'target_player',
              coinsBalance: 1000n,
              isBanned: false,
            }),
            update: jest.fn().mockResolvedValue({
              id: 'target-user-1',
              username: 'target_player',
              email: 'target@test.com',
              role: Role.user,
              coinsBalance: 1500n,
              charmPoints: 10,
              isBanned: false,
              avatarUrl: null,
              updatedAt: new Date(),
            }),
          },
          adminLog: {
            create: jest.fn().mockResolvedValue({
              id: 'log-1',
              adminId: 'admin-123',
              targetUserId: 'target-user-1',
              actionType: ActionType.COIN_ADJUST,
              amount: 500n,
              reason: 'Tournament reward bonus',
              timestamp: new Date(),
            }),
          },
        };
        return await callback(fakeTx);
      });

      const response = await request(app)
        .patch('/api/admin/users/target-user-1/coins')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          amount: 500,
          reason: 'Tournament reward bonus',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.coinsBalance).toBe('1500');
      expect(response.body.data.adminLog.actionType).toBe(ActionType.COIN_ADJUST);
      expect(response.body.data.adminLog.amount).toBe('500');
    });

    it('should safely deduct coins (-400) when balance is sufficient', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-123',
        username: 'head_admin',
        email: 'admin@weplay.pro',
        role: Role.superadmin,
        isBanned: false,
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const fakeTx = {
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'target-user-1',
              username: 'target_player',
              coinsBalance: 1000n,
              isBanned: false,
            }),
            update: jest.fn().mockResolvedValue({
              id: 'target-user-1',
              username: 'target_player',
              email: 'target@test.com',
              role: Role.user,
              coinsBalance: 600n,
              charmPoints: 10,
              isBanned: false,
              avatarUrl: null,
              updatedAt: new Date(),
            }),
          },
          adminLog: {
            create: jest.fn().mockResolvedValue({
              id: 'log-2',
              adminId: 'admin-123',
              targetUserId: 'target-user-1',
              actionType: ActionType.COIN_ADJUST,
              amount: -400n,
              reason: 'Chargeback correction',
              timestamp: new Date(),
            }),
          },
        };
        return await callback(fakeTx);
      });

      const response = await request(app)
        .patch('/api/admin/users/target-user-1/coins')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          amount: -400,
          reason: 'Chargeback correction',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.coinsBalance).toBe('600');
    });

    it('should REJECT deduction if resulting balance would be negative (atomic rollback guarantee)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-123',
        username: 'head_admin',
        email: 'admin@weplay.pro',
        role: Role.superadmin,
        isBanned: false,
      });

      // CoinService directly tests the transaction throw logic
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const fakeTx = {
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'target-user-poor',
              username: 'poor_player',
              coinsBalance: 100n,
              isBanned: false,
            }),
            update: jest.fn(),
          },
          adminLog: {
            create: jest.fn(),
          },
        };
        return await callback(fakeTx);
      });

      const response = await request(app)
        .patch('/api/admin/users/target-user-poor/coins')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          amount: -500, // Deduct 500 when user only has 100
          reason: 'Excess deduction test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Insufficient coin balance');
      expect(response.body.error).toContain('cannot deduct 500');
    });
  });

  describe('PATCH /api/admin/users/:id/status - Ban / Unban Enforcement', () => {
    it('should ban an active user and write audit log', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-123',
        username: 'head_admin',
        email: 'admin@weplay.pro',
        role: Role.superadmin,
        isBanned: false,
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const fakeTx = {
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'abusive-user-1',
              username: 'toxic_player',
              isBanned: false,
            }),
            update: jest.fn().mockResolvedValue({
              id: 'abusive-user-1',
              username: 'toxic_player',
              email: 'toxic@test.com',
              role: Role.user,
              isBanned: true,
              coinsBalance: 100n,
              updatedAt: new Date(),
            }),
          },
          adminLog: {
            create: jest.fn().mockResolvedValue({
              id: 'log-ban-1',
              adminId: 'admin-123',
              targetUserId: 'abusive-user-1',
              actionType: ActionType.BAN,
              reason: 'Toxic behavior in voice room',
              timestamp: new Date(),
            }),
          },
        };
        return await callback(fakeTx);
      });

      const response = await request(app)
        .patch('/api/admin/users/abusive-user-1/status')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          isBanned: true,
          reason: 'Toxic behavior in voice room',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('banned');
      expect(response.body.data.user.isBanned).toBe(true);
      expect(response.body.data.adminLog.actionType).toBe('BAN');
    });
  });
});
