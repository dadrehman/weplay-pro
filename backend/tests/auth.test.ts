import request from 'supertest';
import app from '../src/app';
import prisma from '../src/db/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

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

describe('Authentication Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully with 50 starting coins', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const fakeUser = {
        id: 'uuid-user-1',
        username: 'alice_gamer',
        email: 'alice@example.com',
        passwordHash: 'hashed_password',
        role: Role.user,
        coinsBalance: 50n,
        charmPoints: 10,
        isBanned: false,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(fakeUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'alice_gamer',
          email: 'alice@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        id: 'uuid-user-1',
        username: 'alice_gamer',
        email: 'alice@example.com',
        role: 'user',
        coinsBalance: '50',
        charmPoints: '10',
        isBanned: false,
      });

      // Verify token payload
      const decoded: any = jwt.verify(
        response.body.token,
        process.env.JWT_SECRET || 'supersecret-weplay-jwt-key-change-in-production-min32chars'
      );
      expect(decoded.userId).toBe('uuid-user-1');
      expect(decoded.username).toBe('alice_gamer');
      expect(decoded.role).toBe('user');
    });

    it('should reject registration if username or email already exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'uuid-existing',
        username: 'alice_gamer',
        email: 'other@example.com',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'alice_gamer',
          email: 'alice@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Username is already taken');
    });

    it('should fail validation on short password or invalid username characters', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'bad username with spaces!',
          email: 'not-an-email',
          password: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate valid user and return JWT token', async () => {
      const plainPassword = 'secretPassword123';
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'uuid-user-2',
        username: 'bob_player',
        email: 'bob@example.com',
        passwordHash,
        role: Role.user,
        coinsBalance: 2500n,
        charmPoints: 20,
        isBanned: false,
        avatarUrl: null,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'bob@example.com',
          password: plainPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe('bob_player');
    });

    it('should reject login if password does not match', async () => {
      const passwordHash = await bcrypt.hash('realPassword', 10);

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'uuid-user-2',
        username: 'bob_player',
        email: 'bob@example.com',
        passwordHash,
        role: Role.user,
        coinsBalance: 2500n,
        isBanned: false,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'bob@example.com',
          password: 'wrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login if account is banned', async () => {
      const plainPassword = 'secretPassword123';
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'uuid-banned-user',
        username: 'banned_troll',
        email: 'troll@example.com',
        passwordHash,
        role: Role.user,
        coinsBalance: 0n,
        isBanned: true,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'banned_troll',
          password: plainPassword,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Account has been banned');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when authorization header is missing', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication token required');
    });

    it('should return 403 when user is marked banned in database on an authenticated call', async () => {
      const token = jwt.sign(
        { userId: 'user-banned-id', username: 'troll', email: 'troll@test.com', role: Role.user },
        process.env.JWT_SECRET || 'supersecret-weplay-jwt-key-change-in-production-min32chars'
      );

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-banned-id',
        username: 'troll',
        email: 'troll@test.com',
        role: Role.user,
        isBanned: true,
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Account has been banned');
    });
  });

  describe('Social & Phone Authentication Tests', () => {
    it('should authenticate social login and return 8-digit WePlay ID', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'usr-google-1',
        displayId: '48941316',
        username: 'google_gamer_101',
        email: 'gamer@gmail.com',
        role: Role.user,
        coinsBalance: 50n,
        charmPoints: 0n,
        expPoints: 0n,
        activeLevel: 1,
        blessingPoints: 0n,
        signature: 'Welcome to WePlay!',
        region: 'Pakistan',
        gender: 'MALE',
        isBanned: false,
        family: null,
        titles: [],
        badges: [],
      });

      const response = await request(app)
        .post('/api/auth/social')
        .send({
          provider: 'google',
          email: 'gamer@gmail.com',
          displayName: 'Google Gamer',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.displayId).toBe('48941316');
      expect(response.body.user.coinsBalance).toBe('50');
    });

    it('should support instant 1-tap dev login as superadmin', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'usr-admin-dev',
        displayId: '48941316',
        username: 'superadmin',
        email: 'admin@weplay.pro',
        role: Role.superadmin,
        coinsBalance: 1000000n,
        charmPoints: 200000n,
        expPoints: 125000n,
        activeLevel: 88,
        blessingPoints: 8888n,
        signature: 'WePlay Master',
        region: 'Pakistan',
        gender: 'MALE',
        isBanned: false,
        family: null,
        titles: [],
        badges: [],
      });

      const response = await request(app)
        .post('/api/auth/social')
        .send({ provider: 'dev' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe('superadmin');
      expect(response.body.user.activeLevel).toBe(88);
    });

    it('should authenticate phone OTP login with valid or test bypass code', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'usr-phone-1',
        displayId: '87654321',
        username: 'Phone_1234',
        email: 'phone_1234@weplay.pro',
        role: Role.user,
        coinsBalance: 50n,
        charmPoints: 0n,
        expPoints: 0n,
        activeLevel: 1,
        blessingPoints: 0n,
        signature: 'Welcome to WePlay!',
        region: 'Pakistan',
        gender: 'MALE',
        isBanned: false,
        family: null,
        titles: [],
        badges: [],
      });

      const response = await request(app)
        .post('/api/auth/phone-otp')
        .send({
          phoneNumber: '+923001234567',
          otpCode: '123456',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.displayId).toBe('87654321');
    });

    it('should generate and dispatch WhatsApp OTP', async () => {
      const response = await request(app)
        .post('/api/auth/phone/send-otp')
        .send({ phoneNumber: '+923009988776' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('WhatsApp');
      expect(response.body).toHaveProperty('expiresInSeconds');
    });

    it('should verify WhatsApp OTP and return JWT with PHONE_WHATSAPP provider', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'usr-wa-1',
        displayId: '11223344',
        username: 'Player_8776_999',
        email: 'phone_923009988776@weplay.pro',
        phone: '+923009988776',
        authProvider: 'PHONE_WHATSAPP',
        role: Role.user,
        coinsBalance: 50n,
        charmPoints: 0n,
        expPoints: 0n,
        activeLevel: 1,
        blessingPoints: 0n,
        signature: 'Welcome to WePlay!',
        region: 'Pakistan',
        gender: 'MALE',
        isBanned: false,
        family: null,
        titles: [],
        badges: [],
      });

      const response = await request(app)
        .post('/api/auth/phone/verify-otp')
        .send({
          phoneNumber: '+923009988776',
          code: '123456',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.authProvider).toBe('PHONE_WHATSAPP');
    });

    it('should synchronize Firebase OAuth user and assign 8-digit WePlay ID', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'usr-firebase-1',
        displayId: '48941316',
        username: 'Google_Pro_123',
        email: 'proplayer@gmail.com',
        firebaseUid: 'firebase-uid-abc-123',
        authProvider: 'GOOGLE',
        role: Role.user,
        coinsBalance: 50n,
        charmPoints: 0n,
        expPoints: 0n,
        activeLevel: 1,
        blessingPoints: 0n,
        signature: 'Welcome to WePlay!',
        region: 'Pakistan',
        gender: 'MALE',
        isBanned: false,
        family: null,
        titles: [],
        badges: [],
      });

      const response = await request(app)
        .post('/api/auth/firebase-sync')
        .send({
          uid: 'firebase-uid-abc-123',
          email: 'proplayer@gmail.com',
          displayName: 'Google Pro',
          providerId: 'google.com',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.authProvider).toBe('GOOGLE');
      expect(response.body.user.displayId).toBe('48941316');
    });
  });
});

