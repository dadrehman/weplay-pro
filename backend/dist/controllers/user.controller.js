"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../db/prisma"));
const user_attribute_service_1 = require("../services/user_attribute.service");
const socket_handler_1 = require("../socket/socket.handler");
const updateProfileSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
    signature: zod_1.z.string().max(200).optional(),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    region: zod_1.z.string().max(50).optional(),
    avatarUrl: zod_1.z.string().url().or(zod_1.z.string().min(1)).optional(),
    birthday: zod_1.z.string().max(30).optional(),
    profileCompleted: zod_1.z.boolean().optional(),
});
const sendGiftSchema = zod_1.z.object({
    receiverId: zod_1.z.string().uuid(),
    coinsAmount: zod_1.z.number().int().positive(),
});
class UserController {
    /**
     * GET /api/users/profile
     * Returns current authenticated user's full profile
     */
    static async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await user_attribute_service_1.UserAttributeService.getFullProfile(userId);
            if (!profile) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.status(200).json({ data: profile });
        }
        catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ error: 'Failed to fetch user profile' });
        }
    }
    /**
     * PATCH /api/users/profile
     * User edits their nickname, gender, region, and signature
     */
    static async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const parsed = updateProfileSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: parsed.error.errors[0].message });
                return;
            }
            const { username, signature, gender, region, avatarUrl, birthday, profileCompleted } = parsed.data;
            const updateData = {};
            if (username) {
                // Check uniqueness if changing username
                const existing = await prisma_1.default.user.findFirst({
                    where: {
                        username: { equals: username, mode: 'insensitive' },
                        NOT: { id: userId },
                    },
                });
                if (existing) {
                    res.status(409).json({ error: 'Username is already taken' });
                    return;
                }
                updateData.username = username;
            }
            if (signature !== undefined)
                updateData.signature = signature;
            if (gender)
                updateData.gender = gender;
            if (region)
                updateData.region = region;
            if (avatarUrl)
                updateData.avatarUrl = avatarUrl;
            if (birthday)
                updateData.birthday = birthday;
            if (profileCompleted !== undefined)
                updateData.profileCompleted = profileCompleted;
            await prisma_1.default.user.update({
                where: { id: userId },
                data: updateData,
            });
            const updatedProfile = await user_attribute_service_1.UserAttributeService.getFullProfile(userId);
            // Real-time broadcast to Superadmin Dashboard
            try {
                const io = (0, socket_handler_1.getSocketIO)();
                if (io && updatedProfile) {
                    io.emit('admin:new_user_login', {
                        user: {
                            ...updatedProfile,
                            coinsBalance: updatedProfile.coinsBalance.toString(),
                            charmPoints: updatedProfile.charmPoints.toString(),
                            expPoints: updatedProfile.expPoints.toString(),
                            blessingPoints: updatedProfile.blessingPoints.toString(),
                        },
                        message: `User ${updatedProfile.username} updated profile details`,
                        timestamp: new Date().toISOString(),
                    });
                }
            }
            catch (e) {
                // Non-fatal socket broadcast
            }
            res.status(200).json({
                message: 'Profile updated successfully',
                data: updatedProfile,
            });
        }
        catch (error) {
            console.error('Error updating profile:', error);
            res.status(400).json({ error: error.message || 'Failed to update profile' });
        }
    }
    /**
     * POST /api/users/gift
     * Real 5:1 coin-to-charm gifting transaction
     */
    static async sendGift(req, res) {
        try {
            const senderId = req.user.userId;
            const parsed = sendGiftSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: parsed.error.errors[0].message });
                return;
            }
            const { receiverId, coinsAmount } = parsed.data;
            const result = await user_attribute_service_1.UserAttributeService.sendGift(senderId, receiverId, coinsAmount);
            res.status(200).json({
                message: `Gift sent successfully! ${coinsAmount} coins deducted, ${result.charmAwarded} charm points awarded.`,
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ error: error.message || 'Failed to send gift' });
        }
    }
    /**
     * GET /api/users/families
     * Public family discovery list
     */
    static async getFamilies(req, res) {
        try {
            const families = await prisma_1.default.family.findMany({
                orderBy: { level: 'desc' },
                include: {
                    owner: { select: { id: true, username: true, avatarUrl: true } },
                    _count: { select: { members: true } },
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
                    owner: f.owner,
                    memberCount: f._count.members,
                })),
            });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch families' });
        }
    }
    /**
     * POST /api/users/complete-onboarding & POST /api/user/complete-onboarding
     */
    static async completeOnboarding(req, res) {
        try {
            const userId = req.user.userId;
            const { avatarUrl, avatar_url, username, nickname, gender, birthday } = req.body;
            const finalAvatar = avatarUrl || avatar_url;
            const finalUsername = nickname || username;
            const updated = await prisma_1.default.user.update({
                where: { id: userId },
                data: {
                    ...(finalAvatar ? { avatarUrl: finalAvatar } : {}),
                    ...(finalUsername ? { username: finalUsername } : {}),
                    ...(gender ? { gender: gender.toUpperCase() } : {}),
                    ...(birthday ? { birthday: String(birthday) } : {}),
                    profileCompleted: true,
                },
                include: {
                    family: true,
                    titles: { include: { title: true } },
                    badges: { include: { badge: true } },
                },
            });
            const io = (0, socket_handler_1.getSocketIO)();
            io?.emit('admin:user_registered', {
                userId: updated.id,
                displayId: updated.displayId,
                username: updated.username,
                avatarUrl: updated.avatarUrl,
                gender: updated.gender,
                birthday: updated.birthday,
                authProvider: updated.authProvider,
                phone: updated.phone,
                timestamp: new Date().toISOString(),
            });
            io?.emit('admin:new_user_login', {
                userId: updated.id,
                displayId: updated.displayId,
                username: updated.username,
                avatarUrl: updated.avatarUrl,
                gender: updated.gender,
                birthday: updated.birthday,
                authProvider: updated.authProvider,
                phone: updated.phone,
                timestamp: new Date().toISOString(),
            });
            res.status(200).json({
                message: 'Onboarding completed successfully',
                success: true,
                user: {
                    id: updated.id,
                    displayId: updated.displayId || '48941316',
                    username: updated.username,
                    email: updated.email,
                    phone: updated.phone,
                    role: updated.role,
                    coinsBalance: updated.coinsBalance.toString(),
                    charmPoints: updated.charmPoints.toString(),
                    expPoints: updated.expPoints.toString(),
                    blessingPoints: updated.blessingPoints.toString(),
                    authProvider: updated.authProvider,
                    avatarUrl: updated.avatarUrl,
                    signature: updated.signature,
                    region: updated.region,
                    gender: updated.gender,
                    birthday: updated.birthday,
                    profileCompleted: true,
                    is_onboarded: true,
                },
            });
        }
        catch (error) {
            console.error('Error completing onboarding:', error);
            res.status(500).json({ error: 'Failed to complete onboarding' });
        }
    }
}
exports.UserController = UserController;
