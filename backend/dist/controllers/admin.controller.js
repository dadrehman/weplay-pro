"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../db/prisma"));
const coin_service_1 = require("../services/coin.service");
const room_service_1 = require("../services/room.service");
const user_attribute_service_1 = require("../services/user_attribute.service");
const client_1 = require("@prisma/client");
const socket_handler_1 = require("../socket/socket.handler");
const adjustCoinsSchema = zod_1.z.object({
    amount: zod_1.z.number().int().refine((val) => val !== 0, {
        message: 'Amount must be non-zero (positive to credit, negative to deduct)',
    }),
    reason: zod_1.z.string().min(3, 'Reason must be at least 3 characters long'),
});
const toggleStatusSchema = zod_1.z.object({
    isBanned: zod_1.z.boolean(),
    reason: zod_1.z.string().min(3, 'Reason must be at least 3 characters long'),
});
class AdminController {
    /**
     * GET /api/admin/users
     * Paginated list of users with search and status filtering
     */
    static async getUsers(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
            const search = req.query.search?.trim();
            const status = req.query.status; // 'all' | 'active' | 'banned'
            const skip = (page - 1) * limit;
            const where = {
                isDeleted: false,
            };
            if (search) {
                where.OR = [
                    { username: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { displayId: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ];
            }
            if (status === 'active') {
                where.isBanned = false;
            }
            else if (status === 'banned') {
                where.isBanned = true;
            }
            const [totalCount, users] = await Promise.all([
                prisma_1.default.user.count({ where }),
                prisma_1.default.user.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
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
                }),
            ]);
            res.status(200).json({
                data: users.map((u) => {
                    const titles = u.titles || [];
                    const badges = u.badges || [];
                    const charmTier = user_attribute_service_1.UserAttributeService.calculateCharmTier(u.charmPoints ?? 0);
                    const equippedTitle = titles.find((t) => t.isEquipped)?.title || null;
                    return {
                        id: u.id,
                        displayId: u.displayId || '48941316',
                        username: u.username,
                        email: u.email,
                        phone: u.phone,
                        role: u.role,
                        authProvider: u.authProvider || 'LOCAL',
                        coinsBalance: (u.coinsBalance ?? 0n).toString(),
                        charmPoints: (u.charmPoints ?? 0n).toString(),
                        expPoints: (u.expPoints ?? 0n).toString(),
                        activeLevel: u.activeLevel ?? 1,
                        blessingPoints: (u.blessingPoints ?? 0n).toString(),
                        signature: u.signature ?? 'Welcome to WePlay!',
                        region: u.region ?? 'Pakistan',
                        gender: u.gender ?? 'MALE',
                        isBanned: u.isBanned,
                        avatarUrl: u.avatarUrl,
                        lastLoginAt: u.lastLoginAt,
                        firebaseUid: u.firebaseUid,
                        family: u.family
                            ? {
                                id: u.family.id,
                                name: u.family.name,
                                badgeTag: u.family.badgeTag,
                                badgeBgColor: u.family.badgeBgColor,
                                badgeTextColor: u.family.badgeTextColor,
                                level: u.family.level,
                                iconUrl: u.family.iconUrl,
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
                        titles: titles.map((ut) => ({
                            id: ut.title?.id || ut.id,
                            name: ut.title?.name || ut.name,
                            rarityTier: ut.title?.rarityTier || ut.rarityTier,
                            bgGradientStart: ut.title?.bgGradientStart || ut.bgGradientStart,
                            bgGradientEnd: ut.title?.bgGradientEnd || ut.bgGradientEnd,
                            iconUrl: ut.title?.iconUrl || ut.iconUrl,
                            isEquipped: ut.isEquipped,
                            grantedAt: ut.grantedAt,
                        })),
                        badges: badges.map((ub) => ({
                            id: ub.badge?.id || ub.id,
                            name: ub.badge?.name || ub.name,
                            category: ub.badge?.category || ub.category,
                            iconUrl: ub.badge?.iconUrl || ub.iconUrl,
                            unlockedAt: ub.unlockedAt,
                        })),
                        charmTier,
                        createdAt: u.createdAt,
                        updatedAt: u.updatedAt,
                    };
                }),
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit),
                },
            });
        }
        catch (error) {
            console.error('Error fetching admin users:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    }
    /**
     * PATCH /api/admin/users/:id/coins
     * Safely adds or deducts coins, logs admin audit trail
     */
    static async adjustCoins(req, res) {
        try {
            const { id: targetUserId } = req.params;
            const adminId = req.user.userId;
            const parsed = adjustCoinsSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: parsed.error.errors[0].message });
                return;
            }
            const { amount, reason } = parsed.data;
            const result = await coin_service_1.CoinService.adjustCoins({
                adminId,
                targetUserId,
                amount,
                reason,
            });
            // Notify user via real-time WebSocket if connected
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                io.to(`user:${targetUserId}`).emit('coins_updated', {
                    newBalance: result.user.coinsBalance,
                    amount,
                    reason,
                });
            }
            res.status(200).json({
                message: 'Coin balance adjusted successfully',
                data: result,
            });
        }
        catch (error) {
            if (error.message && error.message.includes('Insufficient coin balance')) {
                res.status(400).json({ error: error.message });
                return;
            }
            if (error.message === 'Target user not found') {
                res.status(404).json({ error: 'Target user not found' });
                return;
            }
            console.error('Coin adjustment error:', error);
            res.status(500).json({ error: 'Internal server error during coin adjustment' });
        }
    }
    /**
     * PATCH /api/admin/users/:id/status
     * Toggle is_banned status with administrative audit log
     */
    static async toggleUserStatus(req, res) {
        try {
            const { id: targetUserId } = req.params;
            const adminId = req.user.userId;
            const parsed = toggleStatusSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: parsed.error.errors[0].message });
                return;
            }
            const { isBanned, reason } = parsed.data;
            const result = await prisma_1.default.$transaction(async (tx) => {
                const targetUser = await tx.user.findUnique({
                    where: { id: targetUserId },
                });
                if (!targetUser) {
                    throw new Error('Target user not found');
                }
                const updatedUser = await tx.user.update({
                    where: { id: targetUserId },
                    data: { isBanned },
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        role: true,
                        isBanned: true,
                        coinsBalance: true,
                        updatedAt: true,
                    },
                });
                const adminLog = await tx.adminLog.create({
                    data: {
                        adminId,
                        targetUserId,
                        actionType: isBanned ? client_1.ActionType.BAN : client_1.ActionType.UNBAN,
                        reason,
                    },
                });
                return {
                    user: {
                        ...updatedUser,
                        coinsBalance: updatedUser.coinsBalance.toString(),
                    },
                    adminLog,
                };
            });
            // Inform user socket if banned
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                if (isBanned) {
                    io.to(`user:${targetUserId}`).emit('account_banned', { reason });
                }
                else {
                    io.to(`user:${targetUserId}`).emit('account_unbanned', { reason });
                }
            }
            res.status(200).json({
                message: `User status successfully updated to ${isBanned ? 'banned' : 'active'}`,
                data: result,
            });
        }
        catch (error) {
            if (error.message === 'Target user not found') {
                res.status(404).json({ error: 'Target user not found' });
                return;
            }
            console.error('Error toggling user status:', error);
            res.status(500).json({ error: 'Failed to update user status' });
        }
    }
    /**
     * DELETE /api/admin/users/:id
     * Soft-delete a user account:
     *   - Anonymizes PII (email, phone, username, avatarUrl, firebaseUid)
     *   - Sets isBanned = true so they cannot log back in
     *   - Preserves displayId (never re-assigned per platform rules)
     *   - Writes audit log entry
     *   - Emits socket event to remove user from live admin dashboard
     */
    static async deleteUser(req, res) {
        try {
            const { id: targetUserId } = req.params;
            const adminId = req.user.userId;
            const { reason } = req.body;
            if (!reason || reason.trim().length < 3) {
                res.status(400).json({ error: 'A deletion reason of at least 3 characters is required.' });
                return;
            }
            const targetUser = await prisma_1.default.user.findUnique({ where: { id: targetUserId } });
            if (!targetUser) {
                res.status(404).json({ error: 'User not found.' });
                return;
            }
            // Do not allow deleting superadmin via this endpoint
            if (targetUser.role === 'superadmin') {
                res.status(403).json({ error: 'Superadmin accounts cannot be deleted via this endpoint.' });
                return;
            }
            const deletedAt = new Date();
            const anonymizedSuffix = `_deleted_${Date.now()}`;
            await prisma_1.default.$transaction(async (tx) => {
                // Anonymize PII and mark isDeleted = true
                await tx.user.update({
                    where: { id: targetUserId },
                    data: {
                        email: `deleted${anonymizedSuffix}@deleted.invalid`,
                        phone: null,
                        username: `deleted_user_${targetUser.displayId ?? targetUserId.substring(0, 8)}`,
                        avatarUrl: null,
                        firebaseUid: null, // prevents social re-login
                        isBanned: true, // prevents password re-login
                        isDeleted: true,
                        deletedAt,
                        signature: 'Account deleted.',
                        // Keep: id, displayId, coinsBalance, createdAt for audit integrity
                    },
                });
                // Write audit log
                await tx.adminLog.create({
                    data: {
                        adminId,
                        targetUserId,
                        actionType: client_1.ActionType.BAN,
                        reason: `[ACCOUNT_DELETED] Soft-deleted by admin. Reason: ${reason.trim()}. PII anonymized at ${deletedAt.toISOString()}.`,
                    },
                });
            });
            // Notify the deleted user (if connected) and remove from admin dashboard
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                io.to(`user:${targetUserId}`).emit('account_deleted', {
                    message: 'Your account has been permanently removed by an administrator.',
                });
                io.to('admin:dashboard').emit('admin:user_deleted', {
                    userId: targetUserId,
                    displayId: targetUser.displayId,
                    deletedAt: deletedAt.toISOString(),
                });
            }
            console.log(`[AdminController] User ${targetUserId} (WePlay ID: ${targetUser.displayId}) soft-deleted by admin ${adminId}. Reason: ${reason}`);
            res.status(200).json({
                message: 'User account moved to trash and PII anonymized.',
                deletedUserId: targetUserId,
                displayId: targetUser.displayId,
            });
        }
        catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Failed to delete user account.' });
        }
    }
    /**
     * GET /api/admin/users/trash
     * Fetch all soft-deleted accounts in the recycle bin
     */
    static async getTrashUsers(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
            const skip = (page - 1) * limit;
            const [totalCount, users] = await Promise.all([
                prisma_1.default.user.count({ where: { isDeleted: true } }),
                prisma_1.default.user.findMany({
                    where: { isDeleted: true },
                    skip,
                    take: limit,
                    orderBy: { deletedAt: 'desc' },
                    select: {
                        id: true,
                        displayId: true,
                        username: true,
                        email: true,
                        role: true,
                        coinsBalance: true,
                        charmPoints: true,
                        deletedAt: true,
                        authProvider: true,
                    },
                }),
            ]);
            res.status(200).json({
                data: users.map((u) => ({
                    ...u,
                    coinsBalance: u.coinsBalance.toString(),
                    charmPoints: u.charmPoints.toString(),
                })),
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit) || 1,
                },
                meta: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit) || 1,
                },
            });
        }
        catch (error) {
            console.error('Error fetching trash users:', error);
            res.status(500).json({ error: 'Failed to fetch recycle bin users' });
        }
    }
    /**
     * POST /api/admin/users/:id/restore
     * Restore a soft-deleted user account from trash
     */
    static async restoreUser(req, res) {
        try {
            const { id: targetUserId } = req.params;
            const adminId = req.user.userId;
            const targetUser = await prisma_1.default.user.findUnique({ where: { id: targetUserId } });
            if (!targetUser) {
                res.status(404).json({ error: 'User not found in trash.' });
                return;
            }
            await prisma_1.default.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: targetUserId },
                    data: {
                        isDeleted: false,
                        deletedAt: null,
                        isBanned: false,
                        signature: 'Account restored.',
                    },
                });
                await tx.adminLog.create({
                    data: {
                        adminId,
                        targetUserId,
                        actionType: client_1.ActionType.UNBAN,
                        reason: `[ACCOUNT_RESTORED] User restored from recycle bin by admin.`,
                    },
                });
            });
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                io.to('admin:dashboard').emit('admin:user_restored', {
                    userId: targetUserId,
                    displayId: targetUser.displayId,
                });
            }
            res.status(200).json({
                message: 'User restored successfully.',
                userId: targetUserId,
            });
        }
        catch (error) {
            console.error('Error restoring user:', error);
            res.status(500).json({ error: 'Failed to restore user.' });
        }
    }
    /**
     * DELETE /api/admin/users/:id/purge
     * Hard-delete a user permanently from the database
     */
    static async purgeUser(req, res) {
        try {
            const { id: targetUserId } = req.params;
            const adminId = req.user.userId;
            const targetUser = await prisma_1.default.user.findUnique({ where: { id: targetUserId } });
            if (!targetUser) {
                res.status(404).json({ error: 'User not found.' });
                return;
            }
            if (targetUser.role === 'superadmin') {
                res.status(403).json({ error: 'Superadmin accounts cannot be purged.' });
                return;
            }
            // Permanent database purge
            await prisma_1.default.user.delete({ where: { id: targetUserId } });
            console.log(`[AdminController] User ${targetUserId} permanently purged from DB by admin ${adminId}.`);
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                io.to('admin:dashboard').emit('admin:user_purged', {
                    userId: targetUserId,
                });
            }
            res.status(200).json({
                message: 'User permanently purged from database.',
                purgedUserId: targetUserId,
            });
        }
        catch (error) {
            console.error('Error purging user:', error);
            res.status(500).json({ error: 'Failed to purge user.' });
        }
    }
    /**
     * GET /api/admin/logs
     * Retrieves recent administrative actions audit log
     */
    static async getLogs(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
            const skip = (page - 1) * limit;
            const [total, logs] = await Promise.all([
                prisma_1.default.adminLog.count(),
                prisma_1.default.adminLog.findMany({
                    skip,
                    take: limit,
                    orderBy: { timestamp: 'desc' },
                    include: {
                        admin: { select: { id: true, username: true, email: true } },
                        targetUser: { select: { id: true, username: true, email: true } },
                    },
                }),
            ]);
            res.status(200).json({
                data: logs.map((log) => ({
                    ...log,
                    amount: log.amount ? log.amount.toString() : null,
                })),
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to retrieve admin logs' });
        }
    }
    /**
     * GET /api/admin/rooms
     * Real-time list of all ongoing rooms with occupied seats
     */
    static async getRooms(req, res) {
        try {
            const rooms = await room_service_1.RoomService.getActiveRooms();
            res.status(200).json({ data: rooms });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch active rooms' });
        }
    }
    /**
     * DELETE /api/admin/rooms/:id
     * Force close room, disconnecting all sockets and Agora channels
     */
    static async terminateRoom(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const reason = req.body?.reason || 'Closed by Platform Superadmin';
            const result = await room_service_1.RoomService.terminateRoom(id, adminId, reason);
            // Broadcast room termination to all room occupants and audience
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                io.to(`room:${id}`).emit('room:terminated', {
                    roomId: id,
                    reason,
                });
                io.to(`room:${id}`).emit('room:force_terminated', {
                    roomId: id,
                    reason,
                });
            }
            res.status(200).json({
                message: 'Voice room terminated successfully',
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to terminate room' });
        }
    }
    /**
     * POST /api/admin/rooms/:id/mute-user
     * Force mute an occupant
     */
    static async forceMuteUser(req, res) {
        try {
            const { id } = req.params;
            const { seatIndex } = req.body;
            if (typeof seatIndex !== 'number' || seatIndex < 0 || seatIndex > 7) {
                res.status(400).json({ error: 'Valid seatIndex (0..7) is required' });
                return;
            }
            const updatedSeat = await room_service_1.RoomService.toggleMute(id, seatIndex, req.user.userId, true);
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                io.to(`room:${id}`).emit('seat:updated', {
                    seatIndex,
                    seat: updatedSeat,
                    action: 'FORCE_MUTE',
                });
            }
            res.status(200).json({
                message: 'Seat microphone toggled successfully',
                data: updatedSeat,
            });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to mute seat occupant' });
        }
    }
    /**
     * POST /api/admin/rooms/:id/kick-seat
     * Force kick an occupant from seat to audience
     */
    static async forceKickSeat(req, res) {
        try {
            const { id } = req.params;
            const { seatIndex } = req.body;
            if (typeof seatIndex !== 'number' || seatIndex < 0 || seatIndex > 7) {
                res.status(400).json({ error: 'Valid seatIndex (0..7) is required' });
                return;
            }
            const result = await room_service_1.RoomService.seatAdminAction(id, seatIndex, 'KICK', req.user.userId, true);
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                io.to(`room:${id}`).emit('seat:updated', {
                    seatIndex,
                    seat: result.seat,
                    kickedUser: result.kickedUser,
                    action: 'KICK_OCCUPANT',
                });
            }
            res.status(200).json({
                message: 'Occupant kicked to audience successfully',
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to kick seat occupant' });
        }
    }
    /**
     * POST /api/admin/broadcast
     * Official system announcement to specific user or all users
     */
    static async broadcastAnnouncement(req, res) {
        try {
            const { targetUserId, title, content } = req.body;
            const adminId = req.user.userId;
            if (!content || typeof content !== 'string') {
                res.status(400).json({ error: 'Announcement content is required' });
                return;
            }
            const formattedContent = title ? `📢 [${title}]\n${content}` : `📢 ${content}`;
            const io = (0, socket_handler_1.getSocketIO)();
            if (targetUserId && targetUserId !== 'ALL') {
                // Direct message to targeted user
                const message = await prisma_1.default.directMessage.create({
                    data: {
                        senderId: adminId,
                        receiverId: targetUserId,
                        content: formattedContent,
                        isRead: false,
                    },
                    include: {
                        sender: {
                            select: { id: true, username: true, avatarUrl: true },
                        },
                    },
                });
                if (io) {
                    io.to(`user:${targetUserId}`).emit('message:received', message);
                }
                res.status(200).json({
                    message: 'Direct announcement sent successfully',
                    data: message,
                });
            }
            else {
                // Broadcast to all active users via socket and create messages for recent users
                if (io) {
                    io.emit('system:announcement', {
                        id: 'announcement-' + Date.now(),
                        title: title || 'System Announcement',
                        content,
                        createdAt: new Date().toISOString(),
                    });
                }
                res.status(200).json({
                    message: 'Broadcast announcement sent to all online users successfully',
                });
            }
        }
        catch (error) {
            console.error('[AdminController.broadcastAnnouncement] Error:', error);
            res.status(500).json({ error: error.message || 'Failed to broadcast announcement' });
        }
    }
    /**
     * POST /api/admin/users/:id/update-all
     * Full atomic update of coins, charm, exp, activeLevel, blessing, signature, family, etc.
     */
    static async updateUserAll(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const updated = await user_attribute_service_1.UserAttributeService.updateUserAll(adminId, id, req.body);
            res.status(200).json({
                message: 'User profile attributes updated atomically',
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to update user attributes' });
        }
    }
    /**
     * POST /api/admin/users/:id/titles/assign
     */
    static async assignTitle(req, res) {
        try {
            const { id } = req.params;
            const { titleId, isEquipped } = req.body;
            if (!titleId) {
                res.status(400).json({ error: 'titleId is required' });
                return;
            }
            const updated = await user_attribute_service_1.UserAttributeService.assignTitle(id, titleId, !!isEquipped);
            res.status(200).json({ message: 'Title assigned successfully', data: updated });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to assign title' });
        }
    }
    /**
     * POST /api/admin/users/:id/titles/revoke
     */
    static async revokeTitle(req, res) {
        try {
            const { id } = req.params;
            const { titleId } = req.body;
            if (!titleId) {
                res.status(400).json({ error: 'titleId is required' });
                return;
            }
            const updated = await user_attribute_service_1.UserAttributeService.revokeTitle(id, titleId);
            res.status(200).json({ message: 'Title revoked successfully', data: updated });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to revoke title' });
        }
    }
    /**
     * POST /api/admin/users/:id/badges/assign
     */
    static async assignBadge(req, res) {
        try {
            const { id } = req.params;
            const { badgeId } = req.body;
            if (!badgeId) {
                res.status(400).json({ error: 'badgeId is required' });
                return;
            }
            const updated = await user_attribute_service_1.UserAttributeService.assignBadge(id, badgeId);
            res.status(200).json({ message: 'Badge assigned successfully', data: updated });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to assign badge' });
        }
    }
    /**
     * POST /api/admin/users/:id/badges/revoke
     */
    static async revokeBadge(req, res) {
        try {
            const { id } = req.params;
            const { badgeId } = req.body;
            if (!badgeId) {
                res.status(400).json({ error: 'badgeId is required' });
                return;
            }
            const updated = await user_attribute_service_1.UserAttributeService.revokeBadge(id, badgeId);
            res.status(200).json({ message: 'Badge revoked successfully', data: updated });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to revoke badge' });
        }
    }
    /**
     * GET /api/admin/families
     */
    static async getFamilies(req, res) {
        try {
            const families = await prisma_1.default.family.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    owner: {
                        select: { id: true, username: true, email: true, avatarUrl: true },
                    },
                    _count: {
                        select: { members: true },
                    },
                },
            });
            res.status(200).json({
                data: families.map((f) => ({
                    id: f.id,
                    name: f.name,
                    badgeTag: f.badgeTag,
                    badgeBgColor: f.badgeBgColor,
                    badgeTextColor: f.badgeTextColor,
                    iconUrl: f.iconUrl,
                    level: f.level,
                    ownerId: f.ownerId,
                    owner: f.owner,
                    memberCount: f._count.members,
                    createdAt: f.createdAt,
                    updatedAt: f.updatedAt,
                })),
            });
        }
        catch (error) {
            console.error('Error fetching families:', error);
            res.status(500).json({ error: 'Failed to fetch families' });
        }
    }
    /**
     * POST /api/admin/families
     */
    static async createFamily(req, res) {
        try {
            const { name, badgeTag, badgeBgColor, badgeTextColor, iconUrl, ownerId, level } = req.body;
            if (!name || !badgeTag) {
                res.status(400).json({ error: 'Family name and badgeTag are required' });
                return;
            }
            const actualOwnerId = ownerId || req.user.userId;
            const family = await prisma_1.default.family.create({
                data: {
                    name,
                    badgeTag,
                    badgeBgColor: badgeBgColor || '#7928CA',
                    badgeTextColor: badgeTextColor || '#FFFFFF',
                    iconUrl: iconUrl || null,
                    level: level ? parseInt(level, 10) : 1,
                    ownerId: actualOwnerId,
                },
                include: {
                    owner: { select: { id: true, username: true, email: true } },
                },
            });
            res.status(201).json({ message: 'Family created successfully', data: family });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to create family' });
        }
    }
    /**
     * PUT /api/admin/families/:id
     */
    static async updateFamily(req, res) {
        try {
            const { id } = req.params;
            const { name, badgeTag, badgeBgColor, badgeTextColor, iconUrl, ownerId, level } = req.body;
            const updateData = {};
            if (name)
                updateData.name = name;
            if (badgeTag)
                updateData.badgeTag = badgeTag;
            if (badgeBgColor)
                updateData.badgeBgColor = badgeBgColor;
            if (badgeTextColor)
                updateData.badgeTextColor = badgeTextColor;
            if (iconUrl !== undefined)
                updateData.iconUrl = iconUrl;
            if (ownerId)
                updateData.ownerId = ownerId;
            if (level !== undefined)
                updateData.level = parseInt(level, 10);
            const updated = await prisma_1.default.family.update({
                where: { id },
                data: updateData,
                include: {
                    owner: { select: { id: true, username: true, email: true } },
                },
            });
            res.status(200).json({ message: 'Family updated successfully', data: updated });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to update family' });
        }
    }
    /**
     * DELETE /api/admin/families/:id
     */
    static async deleteFamily(req, res) {
        try {
            const { id } = req.params;
            await prisma_1.default.family.delete({ where: { id } });
            res.status(200).json({ message: 'Family deleted successfully' });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to delete family' });
        }
    }
    /**
     * GET /api/admin/titles
     */
    static async getTitles(req, res) {
        try {
            const titles = await prisma_1.default.title.findMany({ orderBy: { createdAt: 'desc' } });
            res.status(200).json({ data: titles });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch titles' });
        }
    }
    /**
     * POST /api/admin/titles
     */
    static async createTitle(req, res) {
        try {
            const { name, rarityTier, bgGradientStart, bgGradientEnd, textColor, borderColor, iconUrl, minLevel } = req.body;
            if (!name) {
                res.status(400).json({ error: 'Title name is required' });
                return;
            }
            const title = await prisma_1.default.title.create({
                data: {
                    name,
                    rarityTier: rarityTier || 'RARE',
                    bgGradientStart: bgGradientStart || '#FFD700',
                    bgGradientEnd: bgGradientEnd || '#FF8C00',
                    textColor: textColor || '#FFFFFF',
                    borderColor: borderColor || null,
                    iconUrl: iconUrl || '👑',
                    minLevel: minLevel ? parseInt(minLevel, 10) : 1,
                },
            });
            res.status(201).json({ message: 'Title created successfully', data: title });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to create title' });
        }
    }
    /**
     * PUT /api/admin/titles/:id
     */
    static async updateTitle(req, res) {
        try {
            const { id } = req.params;
            const { name, rarityTier, bgGradientStart, bgGradientEnd, textColor, borderColor, iconUrl, minLevel } = req.body;
            const updateData = {};
            if (name)
                updateData.name = name;
            if (rarityTier)
                updateData.rarityTier = rarityTier;
            if (bgGradientStart)
                updateData.bgGradientStart = bgGradientStart;
            if (bgGradientEnd)
                updateData.bgGradientEnd = bgGradientEnd;
            if (textColor)
                updateData.textColor = textColor;
            if (borderColor !== undefined)
                updateData.borderColor = borderColor;
            if (iconUrl !== undefined)
                updateData.iconUrl = iconUrl;
            if (minLevel !== undefined)
                updateData.minLevel = parseInt(minLevel, 10);
            const title = await prisma_1.default.title.update({
                where: { id },
                data: updateData,
            });
            res.status(200).json({ message: 'Title updated successfully', data: title });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to update title' });
        }
    }
    /**
     * DELETE /api/admin/titles/:id
     */
    static async deleteTitle(req, res) {
        try {
            const { id } = req.params;
            await prisma_1.default.title.delete({ where: { id } });
            res.status(200).json({ message: 'Title deleted successfully' });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to delete title' });
        }
    }
    /**
     * GET /api/admin/badges
     */
    static async getBadges(req, res) {
        try {
            const badges = await prisma_1.default.badge.findMany({ orderBy: { createdAt: 'desc' } });
            res.status(200).json({ data: badges });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch badges' });
        }
    }
    /**
     * POST /api/admin/badges
     */
    static async createBadge(req, res) {
        try {
            const { name, category, shape, badgeBgColor, iconUrl, minLevel } = req.body;
            if (!name) {
                res.status(400).json({ error: 'Badge name is required' });
                return;
            }
            const badge = await prisma_1.default.badge.create({
                data: {
                    name,
                    category: category || 'HONOR',
                    shape: shape || 'HEXAGON',
                    badgeBgColor: badgeBgColor || '#7928CA',
                    iconUrl: iconUrl || '🎖️',
                    minLevel: minLevel ? parseInt(minLevel, 10) : 1,
                },
            });
            res.status(201).json({ message: 'Badge created successfully', data: badge });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to create badge' });
        }
    }
    /**
     * PUT /api/admin/badges/:id
     */
    static async updateBadge(req, res) {
        try {
            const { id } = req.params;
            const { name, category, shape, badgeBgColor, iconUrl, minLevel } = req.body;
            const updateData = {};
            if (name)
                updateData.name = name;
            if (category)
                updateData.category = category;
            if (shape)
                updateData.shape = shape;
            if (badgeBgColor)
                updateData.badgeBgColor = badgeBgColor;
            if (iconUrl !== undefined)
                updateData.iconUrl = iconUrl;
            if (minLevel !== undefined)
                updateData.minLevel = parseInt(minLevel, 10);
            const badge = await prisma_1.default.badge.update({
                where: { id },
                data: updateData,
            });
            res.status(200).json({ message: 'Badge updated successfully', data: badge });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to update badge' });
        }
    }
    /**
     * DELETE /api/admin/badges/:id
     */
    static async deleteBadge(req, res) {
        try {
            const { id } = req.params;
            await prisma_1.default.badge.delete({ where: { id } });
            res.status(200).json({ message: 'Badge deleted successfully' });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to delete badge' });
        }
    }
}
exports.AdminController = AdminController;
