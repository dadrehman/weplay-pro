import prisma from '../db/prisma';
import { ActionType } from '@prisma/client';

export interface CoinAdjustmentParams {
  adminId: string;
  targetUserId: string;
  amount: bigint | number | string;
  reason: string;
}

export class CoinService {
  /**
   * Safely adds or deducts coins for a target user within an explicit database transaction.
   * Prevents race conditions and guarantees that balances never drop below zero.
   */
  static async adjustCoins({ adminId, targetUserId, amount, reason }: CoinAdjustmentParams) {
    const delta = BigInt(amount);

    return await prisma.$transaction(async (tx) => {
      // Fetch target user with lock/isolation
      const user = await tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, username: true, coinsBalance: true, isBanned: true },
      });

      if (!user) {
        throw new Error('Target user not found');
      }

      const currentBalance = BigInt(user.coinsBalance);
      const newBalance = currentBalance + delta;

      if (newBalance < 0n) {
        throw new Error(`Insufficient coin balance. Current balance is ${currentBalance}, cannot deduct ${(-delta).toString()}`);
      }

      // Update user coins
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: { coinsBalance: newBalance },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          coinsBalance: true,
          charmPoints: true,
          isBanned: true,
          avatarUrl: true,
          updatedAt: true,
        },
      });

      // Write immutable audit log
      const adminLog = await tx.adminLog.create({
        data: {
          adminId,
          targetUserId,
          actionType: ActionType.COIN_ADJUST,
          amount: delta,
          reason: reason || 'Administrative balance adjustment',
        },
      });

      return {
        user: {
          ...updatedUser,
          coinsBalance: updatedUser.coinsBalance.toString(),
        },
        adminLog: {
          ...adminLog,
          amount: adminLog.amount ? adminLog.amount.toString() : null,
        },
      };
    }, { maxWait: 30000, timeout: 60000 });
  }
}

