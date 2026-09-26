import request from 'supertest';
import app from '../src/app';
import prisma from '../src/db/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { whatsappService } from '../src/services/whatsapp.service';

jest.mock('../src/db/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    adminLog: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../src/services/whatsapp.service', () => ({
  whatsappService: {
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    normalizePhone: jest.fn((phone: string) => {
      let clean = phone.replace(/[^\d+]/g, '');
      return clean.startsWith('+') ? clean : `+${clean}`;
    }),
  },
}));

describe('Idempotent Authentication & True Multi-Provider Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserRecord = {
    id: 'user-uuid-12345',
    displayId: '88776655',
    username: 'test_player',
    email: 'test_user@gmail.com',
    phone: null,
    passwordHash: 'hashed_password',
    role: Role.user,
    coinsBalance: 50n,
    charmPoints: 0n,
    expPoints: 0n,
    activeLevel: 1,
    blessingPoints: 0n,
    signature: 'Welcome to WePlay!',
    region: 'Pakistan',
    gender: 'MALE',
    birthday: null,
    profileCompleted: false,
    authProvider: 'GOOGLE',
    avatarUrl: null,
    isBanned: false,
    family: null,
    titles: [],
    badges: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Test 1: First-time Google Login Provisions 8-digit WePlay ID with isNewUser: true', () => {
    it('should create new user record with unique 8-digit ID and return isNewUser: true', async () => {
      // First lookup finds no user
      (prisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // in googleAuth lookup
        .mockResolvedValueOnce(null); // username conflict check

      // findUnique for unique displayId returns null (not taken)
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Create returns newly provisioned user
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUserRecord);

      const response = await request(app)
        .post('/api/auth/google')
        .send({
          email: 'test_user@gmail.com',
          displayName: 'Test Player',
          photoUrl: 'https://example.com/avatar.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.isNewUser).toBe(true);
      expect(response.body.user.displayId).toBe('88776655');
      expect(response.body.user.displayId).toMatch(/^\d{8}$/);
      expect(response.body.user.coinsBalance).toBe('50');
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test 2: Subsequent Login With Same Email Returns Exact Existing Record (Idempotent)', () => {
    it('should NOT create duplicate record and return isNewUser: false with exact same user ID', async () => {
      // Existing user found in DB
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUserRecord);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUserRecord,
        lastLoginAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/google')
        .send({
          email: 'test_user@gmail.com',
          displayName: 'Test Player',
        });

      expect(response.status).toBe(200);
      expect(response.body.isNewUser).toBe(false);
      expect(response.body.user.id).toBe('user-uuid-12345');
      expect(response.body.user.displayId).toBe('88776655');
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test 3: Mutated Coins in Database Preserved and Returned on Re-Login', () => {
    it('should return updated coins balance (e.g. 50,000) and NEVER overwrite with default 1000 coins', async () => {
      const enrichedUser = {
        ...mockUserRecord,
        coinsBalance: 50000n,
        charmPoints: 2500n,
        activeLevel: 15,
        username: 'Pro_Champion',
        avatarUrl: 'https://cdn.weplay.pro/avatars/champion.png',
        profileCompleted: true,
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(enrichedUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(enrichedUser);

      const response = await request(app)
        .post('/api/auth/google')
        .send({
          email: 'test_user@gmail.com',
          displayName: 'New Random Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.isNewUser).toBe(false);
      expect(response.body.user.coinsBalance).toBe('50000');
      expect(response.body.user.charmPoints).toBe('2500');
      expect(response.body.user.activeLevel).toBe(15);
      expect(response.body.user.username).toBe('Pro_Champion');
      expect(response.body.user.avatarUrl).toBe('https://cdn.weplay.pro/avatars/champion.png');
      expect(response.body.user.profileCompleted).toBe(true);

      // Verify update did NOT overwrite coinsBalance or username
      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.coinsBalance).toBeUndefined();
      expect(updateCall.data.username).toBeUndefined();
    });
  });

  describe('Test 4: WhatsApp OTP Verification Flow', () => {
    it('should verify OTP and return authenticated user with isNewUser flag', async () => {
      (whatsappService.verifyOtp as jest.Mock).mockReturnValue({
        valid: true,
        sanitizedPhone: '923001234567',
      });

      const phoneUser = {
        ...mockUserRecord,
        phone: '+923001234567',
        email: 'phone_923001234567@weplay.pro',
        authProvider: 'WHATSAPP',
      };

      // Mock user not found -> creates new user
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(phoneUser);

      const response = await request(app)
        .post('/api/auth/phone/verify-otp')
        .send({
          phone: '+92 300 1234567',
          code: '123456',
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.isNewUser).toBe(true);
      expect(response.body.user.phone).toBe('+923001234567');
      expect(response.body.user.displayId).toMatch(/^\d{8}$/);
    });
  });

  describe('Test 5: GET /api/user/me returns complete profile attributes', () => {
    it('should return complete user profile with 8-digit displayId and balances', async () => {
      const JWT_SECRET = process.env.JWT_SECRET || 'supersecret-weplay-jwt-key-change-in-production-min32chars';
      const validToken = jwt.sign(
        { userId: mockUserRecord.id, username: mockUserRecord.username, role: mockUserRecord.role },
        JWT_SECRET
      );

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserRecord);

      const response = await request(app)
        .get('/api/user/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(mockUserRecord.id);
      expect(response.body.user.displayId).toBe(mockUserRecord.displayId);
      expect(response.body.user.coinsBalance).toBe('50');
      expect(response.body.user.profileCompleted).toBe(false);
    });
  });
});
