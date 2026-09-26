import prisma from '../db/prisma';
import { ActionType } from '@prisma/client';
import { getSocketIO, getIO } from '../socket/socket.handler';

export interface CharmTierInfo {
  tier: 'STAR' | 'DIAMOND' | 'CROWN';
  subTier: number;
  label: string;
  icon: string;
}

export interface UpdateUserAttributesDTO {
  coinsBalance?: number | string | bigint;
  charmPoints?: number | string | bigint;
  expPoints?: number | string | bigint;
  activeLevel?: number;
  blessingPoints?: number | string | bigint;
  signature?: string;
  region?: string;
  gender?: string;
  familyId?: string | null;
  phone?: string | null;
  isBanned?: boolean;
}

export class UserAttributeService {
  /**
   * Progressive EXP calculation for active levels (Level 1 to 100+)
   * Formula: level = floor(sqrt(exp / 50)) + 1
   */
  static calculateLevel(expPoints: bigint | number): number {
    const expNum = Number(expPoints);
    if (expNum <= 0) return 1;
    const calculated = Math.floor(Math.sqrt(expNum / 50)) + 1;
    return Math.max(1, calculated);
  }

  /**
   * Charm Tier: Star (1-3), Diamond (4-6), Crown (7-21)
   */
  static calculateCharmTier(charmPoints: bigint | number): CharmTierInfo {
    const cp = Number(charmPoints);

    if (cp < 4000) {
      return { tier: 'STAR', subTier: 1, label: 'Star 1', icon: 'star' };
    } else if (cp < 12000) {
      return { tier: 'STAR', subTier: 2, label: 'Star 2', icon: 'star' };
    } else if (cp < 30000) {
      return { tier: 'STAR', subTier: 3, label: 'Star 3', icon: 'star' };
    } else if (cp < 80000) {
      return { tier: 'DIAMOND', subTier: 4, label: 'Diamond 4', icon: 'diamond' };
    } else if (cp < 160000) {
      return { tier: 'DIAMOND', subTier: 5, label: 'Diamond 5', icon: 'diamond' };
    } else if (cp < 300000) {
      return { tier: 'DIAMOND', subTier: 6, label: 'Diamond 6', icon: 'diamond' };
    } else if (cp < 500000) {
      return { tier: 'CROWN', subTier: 7, label: 'Crown 7', icon: 'crown' };
    } else if (cp < 1000000) {
      return { tier: 'CROWN', subTier: 8, label: 'Crown 8', icon: 'crown' };
    } else if (cp < 2000000) {
      return { tier: 'CROWN', subTier: 9, label: 'Crown 9', icon: 'crown' };
    } else if (cp < 3500000) {
      return { tier: 'CROWN', subTier: 10, label: 'Red Crown 10', icon: 'crown' };
    } else if (cp < 6000000) {
      return { tier: 'CROWN', subTier: 11, label: 'Red Crown 11', icon: 'crown' };
    } else if (cp < 8500000) {
      return { tier: 'CROWN', subTier: 12, label: 'Red Crown 12', icon: 'crown' };
    } else if (cp < 12000000) {
      return { tier: 'CROWN', subTier: 13, label: 'Royal Crown 13', icon: 'crown' };
    } else if (cp < 16000000) {
      return { tier: 'CROWN', subTier: 14, label: 'Royal Crown 14', icon: 'crown' };
    } else if (cp < 26000000) {
      return { tier: 'CROWN', subTier: 15, label: 'Royal Crown 15', icon: 'crown' };
    } else if (cp < 48000000) {
      return { tier: 'CROWN', subTier: 16, label: 'Winged Crown 16', icon: 'crown' };
    } else if (cp < 86000000) {
      return { tier: 'CROWN', subTier: 17, label: 'Winged Crown 17', icon: 'crown' };
    } else if (cp < 120000000) {
      return { tier: 'CROWN', subTier: 18, label: 'Winged Crown 18', icon: 'crown' };
    } else if (cp < 240000000) {
      return { tier: 'CROWN', subTier: 19, label: 'Supreme Crown 19', icon: 'crown' };
    } else if (cp < 360000000) {
      return { tier: 'CROWN', subTier: 20, label: 'Supreme Crown 20', icon: 'crown' };
    } else {
      return { tier: 'CROWN', subTier: 21, label: 'Supreme Crown 21', icon: 'crown' };
    }
  }

  /**
   * Fetch full user profile with family, equipped title, titles, badges, and calculated charm tier
   */
  static async getFullProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        family: true,
        titles: {
          include: {
            title: true,
          },
        },
        badges: {
          include: {
            badge: true,
          },
        },
      },
    });

    if (!user) return null;

    const charmTier = this.calculateCharmTier(user.charmPoints);
    const equippedTitle = user.titles.find((t) => t.isEquipped)?.title || null;

    return {
      id: user.id,
      displayId: user.displayId,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      coinsBalance: user.coinsBalance.toString(),
      charmPoints: user.charmPoints.toString(),
      expPoints: user.expPoints.toString(),
      activeLevel: user.activeLevel,
      blessingPoints: user.blessingPoints.toString(),
      signature: user.signature,
      region: user.region,
      gender: user.gender,
      birthday: user.birthday,
      profileCompleted: user.profileCompleted,
      authProvider: user.authProvider,
      firebaseUid: user.firebaseUid,
      lastLoginAt: user.lastLoginAt,
      isBanned: user.isBanned,
      avatarUrl: user.avatarUrl,
      family: user.family
        ? {
            id: user.family.id,
            name: user.family.name,
            badgeTag: user.family.badgeTag,
            badgeBgColor: user.family.badgeBgColor,
            badgeTextColor: user.family.badgeTextColor,
            level: user.family.level,
            iconUrl: user.family.iconUrl,
          }
        : null,
      equippedTitle: equippedTitle
        ? {
            id: equippedTitle.id,
            name: equippedTitle.name,
            rarityTier: equippedTitle.rarityTier,
            bgGradientStart: equippedTitle.bgGradientStart,
            bgGradientEnd: equippedTitle.bgGradientEnd,
            iconUrl: equippedTitle.iconUrl,
          }
        : null,
      titles: user.titles.map((ut) => ({
        id: ut.title.id,
        name: ut.title.name,
        rarityTier: ut.title.rarityTier,
        bgGradientStart: ut.title.bgGradientStart,
        bgGradientEnd: ut.title.bgGradientEnd,
        iconUrl: ut.title.iconUrl,
        isEquipped: ut.isEquipped,
        grantedAt: ut.grantedAt,
      })),
      badges: user.badges.map((ub) => ({
        id: ub.badge.id,
        name: ub.badge.name,
        category: ub.badge.category,
        iconUrl: ub.badge.iconUrl,
        unlockedAt: ub.unlockedAt,
      })),
      charmTier,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Superadmin atomic update of all user attributes
   */
  static async updateUserAll(adminId: string, targetUserId: string, dto: UpdateUserAttributesDTO) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: targetUserId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const updateData: any = {};

      if (dto.coinsBalance !== undefined) {
        const coins = BigInt(dto.coinsBalance.toString());
        if (coins < 0n) throw new Error('Coins balance cannot be negative');
        updateData.coinsBalance = coins;
      }

      if (dto.charmPoints !== undefined) {
        const charm = BigInt(dto.charmPoints.toString());
        if (charm < 0n) throw new Error('Charm points cannot be negative');
        updateData.charmPoints = charm;
      }

      if (dto.expPoints !== undefined) {
        const exp = BigInt(dto.expPoints.toString());
        if (exp < 0n) throw new Error('EXP points cannot be negative');
        updateData.expPoints = exp;
        // Auto-recalculate activeLevel if not explicitly supplied
        if (dto.activeLevel === undefined) {
          updateData.activeLevel = this.calculateLevel(exp);
        }
      }

      if (dto.activeLevel !== undefined) {
        if (dto.activeLevel < 1) throw new Error('Active level must be at least 1');
        updateData.activeLevel = dto.activeLevel;
      }

      if (dto.blessingPoints !== undefined) {
        const blessing = BigInt(dto.blessingPoints.toString());
        if (blessing < 0n) throw new Error('Blessing points cannot be negative');
        updateData.blessingPoints = blessing;
      }

      if (dto.signature !== undefined) {
        updateData.signature = dto.signature;
      }

      if (dto.region !== undefined) {
        updateData.region = dto.region;
      }

      if (dto.gender !== undefined) {
        updateData.gender = dto.gender.toUpperCase();
      }

      if (dto.familyId !== undefined) {
        if (dto.familyId === null || dto.familyId === '') {
          updateData.familyId = null;
        } else {
          // Verify family exists
          const family = await tx.family.findUnique({ where: { id: dto.familyId } });
          if (!family) throw new Error('Family not found');
          updateData.familyId = dto.familyId;
        }
      }

      if (dto.phone !== undefined) {
        updateData.phone = dto.phone;
      }

      if (dto.isBanned !== undefined) {
        updateData.isBanned = dto.isBanned;
      }

      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: updateData,
      });

      // Write AdminLog audit record
      await tx.adminLog.create({
        data: {
          adminId,
          targetUserId,
          actionType: ActionType.COIN_ADJUST,
          amount: updateData.coinsBalance ?? null,
          reason: `Admin updated player profile attributes: ${Object.keys(updateData).join(', ')}`,
        },
      });

      return updatedUser;
    }).then(async (user) => {
      const fullProfile = await this.getFullProfile(user.id);

      // Emit real-time WebSocket update to user room
      try {
        const io = getSocketIO();
        if (io) {
          io.to(`user:${user.id}`).emit('user:profile_updated', fullProfile);
        }
      } catch (err) {
        // Socket may be offline in test environments
      }

      return fullProfile;
    });
  }

  /**
   * Title assignment & equipped state toggle
   */
  static async assignTitle(userId: string, titleId: string, isEquipped: boolean = false) {
    return prisma.$transaction(async (tx) => {
      // Check title exists
      const title = await tx.title.findUnique({ where: { id: titleId } });
      if (!title) throw new Error('Title does not exist');

      if (isEquipped) {
        // Unequip all other titles for this user
        await tx.userTitle.updateMany({
          where: { userId },
          data: { isEquipped: false },
        });
      }

      return tx.userTitle.upsert({
        where: {
          userId_titleId: { userId, titleId },
        },
        update: { isEquipped },
        create: {
          userId,
          titleId,
          isEquipped,
        },
      });
    }).then(async () => {
      const profile = await this.getFullProfile(userId);
      try {
        const io = getIO();
        io?.to(`user:${userId}`).emit('user:profile_updated', profile);
      } catch (_) {}
      return profile;
    });
  }

  static async revokeTitle(userId: string, titleId: string) {
    await prisma.userTitle.deleteMany({
      where: { userId, titleId },
    });
    const profile = await this.getFullProfile(userId);
    try {
      const io = getIO();
      io?.to(`user:${userId}`).emit('user:profile_updated', profile);
    } catch (_) {}
    return profile;
  }

  /**
   * Badge assignment and revocation
   */
  static async assignBadge(userId: string, badgeId: string) {
    const badge = await prisma.badge.findUnique({ where: { id: badgeId } });
    if (!badge) throw new Error('Badge does not exist');

    await prisma.userBadge.upsert({
      where: {
        userId_badgeId: { userId, badgeId },
      },
      update: {},
      create: { userId, badgeId },
    });

    const profile = await this.getFullProfile(userId);
    try {
      const io = getIO();
      io?.to(`user:${userId}`).emit('user:profile_updated', profile);
    } catch (_) {}
    return profile;
  }

  static async revokeBadge(userId: string, badgeId: string) {
    await prisma.userBadge.deleteMany({
      where: { userId, badgeId },
    });
    const profile = await this.getFullProfile(userId);
    try {
      const io = getIO();
      io?.to(`user:${userId}`).emit('user:profile_updated', profile);
    } catch (_) {}
    return profile;
  }

  /**
   * 5:1 Coin to Charm Conversion Gifting Engine
   * Exactly 5 Coins deducted from sender converts into 1 Charm point for receiver + EXP awards
   */
  static async sendGift(senderId: string, receiverId: string, coinsAmount: number) {
    if (coinsAmount <= 0) {
      throw new Error('Gift coins amount must be greater than zero');
    }
    if (coinsAmount % 5 !== 0) {
      throw new Error('Gift amount must be a multiple of 5 (5 coins = 1 charm point)');
    }
    if (senderId === receiverId) {
      throw new Error('Cannot send a gift to yourself');
    }

    const charmToAdd = BigInt(Math.floor(coinsAmount / 5));
    const coinsToDeduct = BigInt(coinsAmount);

    return prisma.$transaction(async (tx) => {
      // 1. Fetch sender with row lock
      const sender = await tx.user.findUnique({ where: { id: senderId } });
      if (!sender) throw new Error('Sender not found');
      if (sender.isBanned) throw new Error('Banned accounts cannot send gifts');
      if (sender.coinsBalance < coinsToDeduct) {
        throw new Error(`Insufficient coins balance. Required: ${coinsAmount}, Available: ${sender.coinsBalance}`);
      }

      // 2. Fetch receiver
      const receiver = await tx.user.findUnique({ where: { id: receiverId } });
      if (!receiver) throw new Error('Receiver not found');

      // 3. Update Sender: Deduct coins, award sender EXP (equal to coins)
      const newSenderExp = sender.expPoints + coinsToDeduct;
      const newSenderLevel = this.calculateLevel(newSenderExp);

      const updatedSender = await tx.user.update({
        where: { id: senderId },
        data: {
          coinsBalance: sender.coinsBalance - coinsToDeduct,
          expPoints: newSenderExp,
          activeLevel: newSenderLevel,
        },
      });

      // 4. Update Receiver: Add charm, award receiver EXP (equal to charm points)
      const newReceiverCharm = receiver.charmPoints + charmToAdd;
      const newReceiverExp = receiver.expPoints + charmToAdd;
      const newReceiverLevel = this.calculateLevel(newReceiverExp);

      const updatedReceiver = await tx.user.update({
        where: { id: receiverId },
        data: {
          charmPoints: newReceiverCharm,
          expPoints: newReceiverExp,
          activeLevel: newReceiverLevel,
        },
      });

      return {
        sender: updatedSender,
        receiver: updatedReceiver,
        coinsDeducted: coinsAmount,
        charmAwarded: Number(charmToAdd),
      };
    }).then(async (result) => {
      const senderProfile = await this.getFullProfile(senderId);
      const receiverProfile = await this.getFullProfile(receiverId);

      try {
        const io = getIO();
        io?.to(`user:${senderId}`).emit('user:profile_updated', senderProfile);
        io?.to(`user:${receiverId}`).emit('user:profile_updated', receiverProfile);
      } catch (_) {}

      return {
        senderProfile,
        receiverProfile,
        coinsDeducted: result.coinsDeducted,
        charmAwarded: result.charmAwarded,
      };
    });
  }
}
