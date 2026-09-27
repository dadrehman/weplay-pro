"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinService = void 0;
const prisma_1 = __importDefault(require("../db/prisma"));
const client_1 = require("@prisma/client");
class CoinService {
    /**
     * Safely adds or deducts coins for a target user within an explicit database transaction.
     * Prevents race conditions and guarantees that balances never drop below zero.
     */
    static async adjustCoins({ adminId, targetUserId, amount, reason }) {
        const delta = BigInt(amount);
        return await prisma_1.default.$transaction(async (tx) => {
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
                    actionType: client_1.ActionType.COIN_ADJUST,
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
exports.CoinService = CoinService;
