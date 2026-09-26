import request from 'supertest';
import app from '../src/app';
import prisma from '../src/db/prisma';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { UserAttributeService } from '../src/services/user_attribute.service';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret-weplay-jwt-key-change-in-production-min32chars';

describe('User Attributes, Tier Calculation & 5:1 Gift Tests', () => {
  let superadminToken: string;
  let user1Token: string;
  let user2Token: string;

  let superadminId: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    // Fetch users created from seed
    const admin = await prisma.user.findFirst({ where: { role: Role.superadmin } });
    const u1 = await prisma.user.findFirst({ where: { username: 'player_one' } });
    const u2 = await prisma.user.findFirst({ where: { username: 'player_two' } });

    if (!admin || !u1 || !u2) {
      throw new Error('Seed data required for tests');
    }

    superadminId = admin.id;
    user1Id = u1.id;
    user2Id = u2.id;

    superadminToken = jwt.sign(
      { userId: admin.id, username: admin.username, email: admin.email, role: admin.role },
      JWT_SECRET
    );
    user1Token = jwt.sign(
      { userId: u1.id, username: u1.username, email: u1.email, role: u1.role },
      JWT_SECRET
    );
    user2Token = jwt.sign(
      { userId: u2.id, username: u2.username, email: u2.email, role: u2.role },
      JWT_SECRET
    );
  });

  describe('Mathematical Tier & Level Calculation', () => {
    it('should correctly calculate active levels based on EXP', () => {
      expect(UserAttributeService.calculateLevel(0)).toBe(1);
      expect(UserAttributeService.calculateLevel(50)).toBe(2);
      expect(UserAttributeService.calculateLevel(200)).toBe(3);
      expect(UserAttributeService.calculateLevel(5000)).toBe(11);
    });

    it('should correctly calculate Charm Tiers (Star 1-3, Diamond 4-6, Crown 7-21)', () => {
      expect(UserAttributeService.calculateCharmTier(100)).toEqual({
        tier: 'STAR',
        subTier: 1,
        label: 'Star 1',
        icon: 'star',
      });

      expect(UserAttributeService.calculateCharmTier(5000)).toEqual({
        tier: 'STAR',
        subTier: 2,
        label: 'Star 2',
        icon: 'star',
      });

      expect(UserAttributeService.calculateCharmTier(20000)).toEqual({
        tier: 'STAR',
        subTier: 3,
        label: 'Star 3',
        icon: 'star',
      });

      expect(UserAttributeService.calculateCharmTier(50000)).toEqual({
        tier: 'DIAMOND',
        subTier: 4,
        label: 'Diamond 4',
        icon: 'diamond',
      });

      expect(UserAttributeService.calculateCharmTier(100000)).toEqual({
        tier: 'DIAMOND',
        subTier: 5,
        label: 'Diamond 5',
        icon: 'diamond',
      });

      expect(UserAttributeService.calculateCharmTier(200000)).toEqual({
        tier: 'DIAMOND',
        subTier: 6,
        label: 'Diamond 6',
        icon: 'diamond',
      });

      expect(UserAttributeService.calculateCharmTier(400000)).toEqual({
        tier: 'CROWN',
        subTier: 7,
        label: 'Crown 7',
        icon: 'crown',
      });

      expect(UserAttributeService.calculateCharmTier(360000000)).toEqual({
        tier: 'CROWN',
        subTier: 21,
        label: 'Supreme Crown 21',
        icon: 'crown',
      });
    });
  });

  describe('5:1 Coin to Charm Gift Conversion', () => {
    it('should strictly convert 5 coins to 1 charm point and update EXP', async () => {
      const initialSender = await prisma.user.findUnique({ where: { id: user1Id } });
      const initialReceiver = await prisma.user.findUnique({ where: { id: user2Id } });

      const coinsToSend = 50; // exactly 50 coins = 10 charm points

      const response = await request(app)
        .post('/api/users/gift')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          coinsAmount: coinsToSend,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.coinsDeducted).toBe(coinsToSend);
      expect(response.body.data.charmAwarded).toBe(10);

      const afterSender = await prisma.user.findUnique({ where: { id: user1Id } });
      const afterReceiver = await prisma.user.findUnique({ where: { id: user2Id } });

      expect(afterSender!.coinsBalance).toBe(initialSender!.coinsBalance - BigInt(coinsToSend));
      expect(afterReceiver!.charmPoints).toBe(initialReceiver!.charmPoints + 10n);
    });

    it('should reject gift amounts that are not multiples of 5', async () => {
      const response = await request(app)
        .post('/api/users/gift')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          coinsAmount: 23,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('multiple of 5');
    });

    it('should reject gifting to oneself', async () => {
      const response = await request(app)
        .post('/api/users/gift')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user1Id,
          coinsAmount: 10,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Superadmin Atomic Attribute Updates & Family Assignment', () => {
    it('should atomically update user coins, charm, exp, blessing, signature, and family', async () => {
      const narcos = await prisma.family.findFirst({ where: { name: 'NARCOS' } });

      const response = await request(app)
        .post(`/api/admin/users/${user2Id}/update-all`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          coinsBalance: 77777,
          charmPoints: 12000,
          expPoints: 45000,
          blessingPoints: 3333,
          activeLevel: 31,
          signature: 'Updated by Superadmin with atomic lock!',
          familyId: narcos!.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.coinsBalance).toBe('77777');
      expect(response.body.data.charmPoints).toBe('12000');
      expect(response.body.data.activeLevel).toBe(31);
      expect(response.body.data.family.name).toBe('NARCOS');
      expect(response.body.data.charmTier.label).toBe('Star 3');
    });

    it('should reject non-superadmin users from updating attributes', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${user2Id}/update-all`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ coinsBalance: 999999 });

      expect(response.status).toBe(403);
    });
  });

  describe('Title & Badge Assignment', () => {
    it('should assign and equip title to user', async () => {
      const title = await prisma.title.findFirst({ where: { name: 'PK King' } });

      const response = await request(app)
        .post(`/api/admin/users/${user1Id}/titles/assign`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          titleId: title!.id,
          isEquipped: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.equippedTitle.name).toBe('PK King');
    });

    it('should assign badge to user', async () => {
      const badge = await prisma.badge.findFirst({ where: { name: 'Singer' } });

      const response = await request(app)
        .post(`/api/admin/users/${user1Id}/badges/assign`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ badgeId: badge!.id });

      expect(response.status).toBe(200);
      const hasSingerBadge = response.body.data.badges.some((b: any) => b.name === 'Singer');
      expect(hasSingerBadge).toBe(true);
    });
  });

  describe('GET & PATCH /api/users/profile', () => {
    it('should return complete user profile with relations for authenticated user', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.username).toBe('player_one');
      expect(response.body.data.family).toBeDefined();
      expect(response.body.data.charmTier).toBeDefined();
    });

    it('should allow user to update their own signature, gender, and region', async () => {
      const response = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          signature: 'New personal bio here!',
          gender: 'MALE',
          region: 'Pakistan',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.signature).toBe('New personal bio here!');
    });
  });
});
