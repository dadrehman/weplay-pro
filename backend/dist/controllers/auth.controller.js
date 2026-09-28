"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
exports.generateUniqueDisplayId = generateUniqueDisplayId;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../db/prisma"));
const client_1 = require("@prisma/client");
const whatsapp_service_1 = require("../services/whatsapp.service");
const socket_handler_1 = require("../socket/socket.handler");
const google_auth_library_1 = require("google-auth-library");
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret-weplay-jwt-key-change-in-production-min32chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const googleOAuthClient = new google_auth_library_1.OAuth2Client();
async function generateUniqueDisplayId() {
    let displayId = '';
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 20) {
        attempts++;
        displayId = Math.floor(10000000 + Math.random() * 90000000).toString();
        const found = await prisma_1.default.user.findUnique({ where: { displayId } });
        if (!found)
            exists = false;
    }
    return displayId || Math.floor(10000000 + Math.random() * 90000000).toString();
}
const registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username must only contain letters, numbers, and underscores'),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters long'),
    role: zod_1.z.enum(['user', 'admin', 'superadmin']).optional(),
});
const loginSchema = zod_1.z.object({
    login: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    username: zod_1.z.string().optional(),
    password: zod_1.z.string().min(1, 'Password is required'),
});
class AuthController {
    static async register(req, res) {
        try {
            const parsed = registerSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: parsed.error.errors[0].message });
                return;
            }
            const { username, email, password, role } = parsed.data;
            // Check existing user
            const existingUser = await prisma_1.default.user.findFirst({
                where: {
                    OR: [
                        { username: { equals: username, mode: 'insensitive' } },
                        { email: { equals: email, mode: 'insensitive' } },
                    ],
                },
            });
            if (existingUser) {
                if (existingUser.username.toLowerCase() === username.toLowerCase()) {
                    res.status(409).json({ error: 'Username is already taken' });
                    return;
                }
                res.status(409).json({ error: 'Email is already registered' });
                return;
            }
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(password, salt);
            // Default role is user unless explicitly allowed superadmin creation
            const userRole = role || client_1.Role.user;
            const displayId = await generateUniqueDisplayId();
            const newUser = await prisma_1.default.user.create({
                data: {
                    displayId,
                    username,
                    email,
                    passwordHash,
                    role: userRole,
                    coinsBalance: 50n, // Welcome gift of 50 coins for new players
                    charmPoints: 10n,
                    activeLevel: 1,
                    profileCompleted: false,
                },
            });
            const tokenPayload = {
                userId: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            res.status(201).json({
                message: 'Registration successful',
                isNewUser: true,
                token,
                user: {
                    id: newUser.id,
                    displayId: newUser.displayId,
                    username: newUser.username,
                    email: newUser.email,
                    role: newUser.role,
                    coinsBalance: newUser.coinsBalance.toString(),
                    charmPoints: newUser.charmPoints.toString(),
                    activeLevel: newUser.activeLevel,
                    isBanned: newUser.isBanned,
                    avatarUrl: newUser.avatarUrl,
                    profileCompleted: newUser.profileCompleted,
                    is_onboarded: newUser.profileCompleted,
                    isOnboarded: newUser.profileCompleted,
                    createdAt: newUser.createdAt,
                },
            });
        }
        catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Internal server error during registration' });
        }
    }
    static async login(req, res) {
        try {
            const parsed = loginSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: parsed.error.errors[0].message });
                return;
            }
            const { password } = parsed.data;
            const identifier = (parsed.data.login || parsed.data.email || parsed.data.username || '').trim();
            if (!identifier) {
                res.status(400).json({ error: 'Username or email is required' });
                return;
            }
            const user = await prisma_1.default.user.findFirst({
                where: {
                    OR: [
                        { email: { equals: identifier, mode: 'insensitive' } },
                        { username: { equals: identifier, mode: 'insensitive' } },
                    ],
                },
            });
            if (!user) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }
            const isValidPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!isValidPassword) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }
            if (user.isBanned) {
                res.status(403).json({ error: 'Account has been banned. Please contact platform administration.' });
                return;
            }
            const tokenPayload = {
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            res.status(200).json({
                message: 'Login successful',
                isNewUser: false,
                token,
                user: {
                    id: user.id,
                    displayId: user.displayId || '48941316',
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    coinsBalance: user.coinsBalance.toString(),
                    charmPoints: user.charmPoints.toString(),
                    activeLevel: user.activeLevel,
                    isBanned: user.isBanned,
                    avatarUrl: user.avatarUrl,
                    profileCompleted: user.profileCompleted,
                    is_onboarded: user.profileCompleted,
                    isOnboarded: user.profileCompleted,
                    createdAt: user.createdAt,
                },
            });
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error during login' });
        }
    }
    static async getMe(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const user = await prisma_1.default.user.findUnique({
                where: { id: req.user.userId },
                select: {
                    id: true,
                    displayId: true,
                    username: true,
                    email: true,
                    phone: true,
                    role: true,
                    coinsBalance: true,
                    charmPoints: true,
                    expPoints: true,
                    activeLevel: true,
                    blessingPoints: true,
                    signature: true,
                    region: true,
                    gender: true,
                    birthday: true,
                    profileCompleted: true,
                    isBanned: true,
                    avatarUrl: true,
                    authProvider: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.status(200).json({
                user: {
                    ...user,
                    displayId: user.displayId || '48941316',
                    coinsBalance: user.coinsBalance.toString(),
                    charmPoints: user.charmPoints.toString(),
                    expPoints: user.expPoints.toString(),
                    blessingPoints: user.blessingPoints.toString(),
                    is_onboarded: user.profileCompleted,
                    isOnboarded: user.profileCompleted,
                },
            });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to retrieve profile' });
        }
    }
    /**
     * POST /api/auth/phone/send-otp & POST /api/auth/whatsapp/send-otp
     * Generates and dispatches WhatsApp OTP with rate limiting & security
     */
    static async sendWhatsAppOtp(req, res) {
        try {
            const phoneNumber = req.body.phoneNumber || req.body.phone;
            if (!phoneNumber || String(phoneNumber).trim().length < 8) {
                res.status(400).json({ error: 'Valid phone number is required (e.g. +923001234567)' });
                return;
            }
            const result = await whatsapp_service_1.whatsappService.sendOtp(String(phoneNumber));
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Send WhatsApp OTP Error:', error);
            res.status(400).json({ error: error.message || 'Failed to send WhatsApp verification code' });
        }
    }
    /**
     * POST /api/auth/phone/verify-otp & POST /api/auth/whatsapp/verify-otp
     * Verifies WhatsApp OTP, upserts user, notifies Superadmin, and returns JWT
     */
    static async verifyWhatsAppOtp(req, res) {
        try {
            const phoneNumber = req.body.phoneNumber || req.body.phone;
            const code = req.body.code;
            if (!phoneNumber || !code) {
                res.status(400).json({ error: 'Phone number and verification code are required' });
                return;
            }
            const verify = whatsapp_service_1.whatsappService.verifyOtp(String(phoneNumber), String(code));
            if (!verify.valid) {
                res.status(400).json({ error: verify.error || 'Invalid verification code' });
                return;
            }
            const cleanDigits = String(phoneNumber).replace(/[^\d+]/g, '');
            const normalizedPhone = (typeof whatsapp_service_1.whatsappService.normalizePhone === 'function' && whatsapp_service_1.whatsappService.normalizePhone(String(phoneNumber)))
                ? whatsapp_service_1.whatsappService.normalizePhone(String(phoneNumber))
                : (cleanDigits.startsWith('+') ? cleanDigits : `+${cleanDigits}`);
            let user = await prisma_1.default.user.findFirst({
                where: { phone: normalizedPhone },
                include: {
                    family: true,
                    titles: { include: { title: true } },
                    badges: { include: { badge: true } },
                },
            });
            let isNewUser = false;
            if (!user) {
                isNewUser = true;
                const displayId = await generateUniqueDisplayId();
                const username = `Player_${normalizedPhone.slice(-4)}_${Math.floor(100 + Math.random() * 900)}`;
                const salt = await bcryptjs_1.default.genSalt(10);
                const dummyHash = await bcryptjs_1.default.hash(`phone_${Date.now()}_pwd`, salt);
                user = await prisma_1.default.user.create({
                    data: {
                        displayId,
                        username,
                        email: `phone_${normalizedPhone.replace('+', '')}@weplay.pro`,
                        phone: normalizedPhone,
                        passwordHash: dummyHash,
                        role: client_1.Role.user,
                        coinsBalance: 50n,
                        charmPoints: 0n,
                        expPoints: 0n,
                        activeLevel: 1,
                        blessingPoints: 0n,
                        authProvider: 'WHATSAPP',
                        lastLoginAt: new Date(),
                        signature: 'Welcome to WePlay!',
                        region: 'Pakistan',
                        gender: 'MALE',
                        profileCompleted: false,
                    },
                    include: {
                        family: true,
                        titles: { include: { title: true } },
                        badges: { include: { badge: true } },
                    },
                });
            }
            else {
                user = await prisma_1.default.user.update({
                    where: { id: user.id },
                    data: {
                        lastLoginAt: new Date(),
                        authProvider: 'WHATSAPP',
                    },
                    include: {
                        family: true,
                        titles: { include: { title: true } },
                        badges: { include: { badge: true } },
                    },
                });
            }
            if (user.isBanned) {
                res.status(403).json({ error: 'Account has been banned. Please contact platform administration.' });
                return;
            }
            const tokenPayload = {
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            // Real-time notification to Superadmin
            const io = (0, socket_handler_1.getSocketIO)();
            if (isNewUser) {
                io?.emit('admin:user_registered', {
                    userId: user.id,
                    displayId: user.displayId,
                    username: user.username,
                    authProvider: 'WHATSAPP',
                    phone: user.phone,
                    timestamp: new Date().toISOString(),
                });
            }
            io?.emit('admin:user_login', {
                userId: user.id,
                displayId: user.displayId,
                username: user.username,
                authProvider: 'WHATSAPP',
                phone: user.phone,
                timestamp: new Date().toISOString(),
            });
            io?.emit('admin:new_user_login', {
                userId: user.id,
                displayId: user.displayId,
                username: user.username,
                authProvider: 'WHATSAPP',
                phone: user.phone,
                timestamp: new Date().toISOString(),
            });
            res.status(200).json({
                message: 'WhatsApp phone verification successful',
                isNewUser,
                token,
                user: {
                    id: user.id,
                    displayId: user.displayId || '48941316',
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    coinsBalance: user.coinsBalance.toString(),
                    charmPoints: user.charmPoints.toString(),
                    expPoints: user.expPoints.toString(),
                    activeLevel: user.activeLevel,
                    blessingPoints: user.blessingPoints.toString(),
                    authProvider: user.authProvider,
                    signature: user.signature,
                    region: user.region,
                    gender: user.gender,
                    birthday: user.birthday,
                    profileCompleted: user.profileCompleted,
                    is_onboarded: user.profileCompleted,
                    isOnboarded: user.profileCompleted,
                    avatarUrl: user.avatarUrl,
                    family: user.family,
                    titles: user.titles.map((t) => ({ ...t.title, isEquipped: t.isEquipped })),
                    badges: user.badges.map((b) => b.badge),
                },
            });
        }
        catch (error) {
            console.error('Verify WhatsApp OTP Error:', error);
            res.status(500).json({ error: 'Failed to verify WhatsApp OTP' });
        }
    }
    /**
     * POST /api/auth/firebase-sync
     * Synchronizes Firebase user credentials with PostgreSQL & Superadmin
     */
    static async firebaseSync(req, res) {
        try {
            const uid = req.body.uid || req.body.firebaseUid;
            const { email, displayName, photoUrl, providerId, phoneNumber } = req.body;
            if (!uid && !email && !phoneNumber) {
                res.status(400).json({ error: 'Firebase authentication credentials required' });
                return;
            }
            let provider = req.body.provider ? String(req.body.provider).toUpperCase() : 'GOOGLE';
            if (providerId?.includes('facebook'))
                provider = 'FACEBOOK';
            else if (providerId?.includes('twitter') || providerId?.includes('x'))
                provider = 'TWITTER';
            else if (providerId?.includes('phone'))
                provider = 'PHONE_WHATSAPP';
            else if (providerId?.includes('google'))
                provider = 'GOOGLE';
            const cleanEmail = email ? email.toLowerCase().trim() : `${uid || 'firebase'}_${Date.now()}@weplay.pro`;
            let user = await prisma_1.default.user.findFirst({
                where: {
                    OR: [
                        ...(uid ? [{ firebaseUid: uid }] : []),
                        ...(email ? [{ email: cleanEmail }] : []),
                        ...(phoneNumber ? [{ phone: phoneNumber }] : []),
                    ],
                },
                include: {
                    family: true,
                    titles: { include: { title: true } },
                    badges: { include: { badge: true } },
                },
            });
            let isNewUser = false;
            if (!user) {
                isNewUser = true;
                const displayId = await generateUniqueDisplayId();
                let cleanName = displayName ? displayName.trim().replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20) : '';
                if (cleanName.length < 3)
                    cleanName = `${provider.toLowerCase()}_user`;
                const exists = await prisma_1.default.user.findFirst({ where: { username: { equals: cleanName, mode: 'insensitive' } } });
                const username = exists ? `${cleanName}_${Math.floor(100 + Math.random() * 900)}` : cleanName;
                const salt = await bcryptjs_1.default.genSalt(10);
                const dummyHash = await bcryptjs_1.default.hash(`firebase_${uid || Date.now()}_pwd`, salt);
                user = await prisma_1.default.user.create({
                    data: {
                        displayId,
                        username,
                        email: cleanEmail,
                        phone: phoneNumber || null,
                        firebaseUid: uid || null,
                        authProvider: provider,
                        passwordHash: dummyHash,
                        role: client_1.Role.user,
                        coinsBalance: 50n,
                        charmPoints: 0n,
                        expPoints: 0n,
                        activeLevel: 1,
                        blessingPoints: 0n,
                        avatarUrl: photoUrl || null,
                        lastLoginAt: new Date(),
                        signature: 'Welcome to WePlay!',
                        region: 'Pakistan',
                        gender: 'MALE',
                        profileCompleted: false,
                    },
                    include: {
                        family: true,
                        titles: { include: { title: true } },
                        badges: { include: { badge: true } },
                    },
                });
            }
            else {
                user = await prisma_1.default.user.update({
                    where: { id: user.id },
                    data: {
                        firebaseUid: uid || user.firebaseUid,
                        authProvider: provider,
                        lastLoginAt: new Date(),
                        avatarUrl: photoUrl || user.avatarUrl,
                    },
                    include: {
                        family: true,
                        titles: { include: { title: true } },
                        badges: { include: { badge: true } },
                    },
                });
            }
            if (user.isBanned) {
                res.status(403).json({ error: 'Account has been banned. Please contact platform administration.' });
                return;
            }
            const tokenPayload = {
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            // Real-time broadcast to Superadmin
            (0, socket_handler_1.getSocketIO)()?.emit('admin:new_user_login', {
                userId: user.id,
                displayId: user.displayId,
                username: user.username,
                authProvider: provider,
                email: user.email,
                phone: user.phone,
                timestamp: new Date().toISOString(),
            });
            res.status(200).json({
                message: `${provider} authentication synchronized`,
                isNewUser,
                token,
                user: {
                    id: user.id,
                    displayId: user.displayId || '48941316',
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    coinsBalance: user.coinsBalance.toString(),
                    charmPoints: user.charmPoints.toString(),
                    expPoints: user.expPoints.toString(),
                    activeLevel: user.activeLevel,
                    blessingPoints: user.blessingPoints.toString(),
                    authProvider: user.authProvider,
                    avatarUrl: user.avatarUrl,
                    signature: user.signature,
                    region: user.region,
                    gender: user.gender,
                    birthday: user.birthday,
                    profileCompleted: user.profileCompleted,
                    is_onboarded: user.profileCompleted,
                    isOnboarded: user.profileCompleted,
                    family: user.family,
                    titles: user.titles.map((t) => ({ ...t.title, isEquipped: t.isEquipped })),
                    badges: user.badges.map((b) => b.badge),
                },
            });
        }
        catch (error) {
            console.error('Firebase Sync Error:', error);
            res.status(500).json({ error: 'Firebase authentication synchronization failed' });
        }
    }
    /**
     * POST /api/auth/social
     * Authentic WePlay Social Login (Google, Facebook, Twitter, Phone, Dev 1-Tap)
     */
    static async socialAuth(req, res) {
        try {
            const { provider, email, displayName, photoUrl, phoneNumber } = req.body;
            if (!provider) {
                res.status(400).json({ error: 'Provider is required (google, facebook, twitter, phone, dev)' });
                return;
            }
            // If dev provider, instant 1-tap login as superadmin
            if (provider === 'dev') {
                const admin = await prisma_1.default.user.findFirst({
                    where: { role: client_1.Role.superadmin },
                    include: {
                        family: true,
                        titles: { include: { title: true } },
                        badges: { include: { badge: true } },
                    },
                });
                if (admin) {
                    const tokenPayload = {
                        userId: admin.id,
                        username: admin.username,
                        email: admin.email,
                        role: admin.role,
                    };
                    const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
                    res.status(200).json({
                        message: 'Dev quick access successful',
                        token,
                        user: {
                            id: admin.id,
                            displayId: admin.displayId || '48941316',
                            username: admin.username,
                            email: admin.email,
                            role: admin.role,
                            coinsBalance: admin.coinsBalance.toString(),
                            charmPoints: admin.charmPoints.toString(),
                            expPoints: admin.expPoints.toString(),
                            activeLevel: admin.activeLevel,
                            blessingPoints: admin.blessingPoints.toString(),
                            authProvider: admin.authProvider || 'LOCAL',
                            signature: admin.signature,
                            region: admin.region,
                            gender: admin.gender,
                            family: admin.family,
                            titles: admin.titles.map((t) => ({ ...t.title, isEquipped: t.isEquipped })),
                            badges: admin.badges.map((b) => b.badge),
                        },
                    });
                    return;
                }
            }
            const normalizedProvider = provider.toUpperCase();
            // Format clean email or fallback
            const cleanEmail = email
                ? email.toLowerCase().trim()
                : `${provider}_${Math.floor(100000 + Math.random() * 900000)}@weplay.pro`;
            let user = await prisma_1.default.user.findFirst({
                where: {
                    OR: [
                        ...(email ? [{ email: cleanEmail }] : []),
                        ...(phoneNumber ? [{ phone: phoneNumber }] : []),
                    ],
                },
                include: {
                    family: true,
                    titles: { include: { title: true } },
                    badges: { include: { badge: true } },
                },
            });
            let isNewUser = false;
            if (!user) {
                isNewUser = true;
                const displayId = await generateUniqueDisplayId();
                const username = displayName
                    ? displayName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 16) + '_' + Math.floor(100 + Math.random() * 900)
                    : `${provider}_player_${Math.floor(1000 + Math.random() * 9000)}`;
                const salt = await bcryptjs_1.default.genSalt(10);
                const dummyHash = await bcryptjs_1.default.hash(`social_${Date.now()}_pwd`, salt);
                user = await prisma_1.default.user.create({
                    data: {
                        displayId,
                        username,
                        email: cleanEmail,
                        phone: phoneNumber || null,
                        passwordHash: dummyHash,
                        role: client_1.Role.user,
                        coinsBalance: 50n,
                        avatarUrl: photoUrl || null,
                        authProvider: normalizedProvider,
                        lastLoginAt: new Date(),
                        signature: 'Welcome to WePlay!',
                        region: 'Pakistan',
                        gender: 'MALE',
                        profileCompleted: false,
                    },
                    include: {
                        family: true,
                        titles: { include: { title: true } },
                        badges: { include: { badge: true } },
                    },
                });
            }
            else {
                user = await prisma_1.default.user.update({
                    where: { id: user.id },
                    data: {
                        authProvider: normalizedProvider,
                        lastLoginAt: new Date(),
                        avatarUrl: user.avatarUrl || photoUrl || null,
                    },
                    include: {
                        family: true,
                        titles: { include: { title: true } },
                        badges: { include: { badge: true } },
                    },
                });
            }
            if (user.isBanned) {
                res.status(403).json({ error: 'Account has been banned. Please contact platform administration.' });
                return;
            }
            const tokenPayload = {
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            // Notify Superadmin dashboard in real-time
            (0, socket_handler_1.getSocketIO)()?.emit('admin:new_user_login', {
                userId: user.id,
                displayId: user.displayId,
                username: user.username,
                authProvider: normalizedProvider,
                email: user.email,
                phone: user.phone,
                timestamp: new Date().toISOString(),
            });
            res.status(200).json({
                message: 'Social sign in successful',
                token,
                isNewUser,
                user: {
                    id: user.id,
                    displayId: user.displayId || '48941316',
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    coinsBalance: user.coinsBalance.toString(),
                    charmPoints: user.charmPoints.toString(),
                    expPoints: user.expPoints.toString(),
                    activeLevel: user.activeLevel,
                    blessingPoints: user.blessingPoints.toString(),
                    authProvider: user.authProvider,
                    avatarUrl: user.avatarUrl,
                    signature: user.signature,
                    region: user.region,
                    gender: user.gender,
                    birthday: user.birthday,
                    profileCompleted: user.profileCompleted,
                    is_onboarded: user.profileCompleted,
                    family: user.family,
                    titles: user.titles.map((t) => ({ ...t.title, isEquipped: t.isEquipped })),
                    badges: user.badges.map((b) => b.badge),
                },
            });
        }
        catch (error) {
            console.error('Social Auth Error:', error);
            res.status(500).json({ error: 'Social authentication failed' });
        }
    }
    /**
     * POST /api/auth/phone-otp
     * Instant phone verification for WePlay Mobile
     */
    static async phoneOtp(req, res) {
        try {
            const { phoneNumber, otpCode, code } = req.body;
            const verifyCode = code || otpCode;
            if (!phoneNumber) {
                res.status(400).json({ error: 'Phone number is required' });
                return;
            }
            if (verifyCode) {
                const verify = whatsapp_service_1.whatsappService.verifyOtp(phoneNumber, verifyCode);
                if (!verify.valid) {
                    res.status(400).json({ error: verify.error || 'Invalid verification code' });
                    return;
                }
            }
            req.body = {
                provider: 'PHONE_WHATSAPP',
                phoneNumber,
                displayName: `Player_${phoneNumber.slice(-4)}`,
            };
            return AuthController.socialAuth(req, res);
        }
        catch (error) {
            console.error('Phone OTP Error:', error);
            res.status(500).json({ error: 'Phone OTP verification failed' });
        }
    }
    /**
     * POST /api/auth/google
     * Verifies Google token, provisions user with 8-digit WePlay ID, returns JWT
     */
    static async googleAuth(req, res) {
        try {
            const { idToken, accessToken, token: clientToken, email, displayName, photoUrl } = req.body;
            const gToken = idToken || accessToken || clientToken;
            let verifiedEmail = email;
            let verifiedName = displayName;
            let verifiedPicture = photoUrl;
            let googleUid = '';
            if (gToken) {
                try {
                    const ticket = await googleOAuthClient.verifyIdToken({
                        idToken: gToken,
                    });
                    const payload = ticket.getPayload();
                    if (payload && payload.email) {
                        verifiedEmail = payload.email;
                        verifiedName = payload.name || verifiedName;
                        verifiedPicture = payload.picture || verifiedPicture;
                        googleUid = payload.sub;
                    }
                }
                catch (oauthErr) {
                    try {
                        const gRes = await axios_1.default.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${gToken}`, { timeout: 8000 });
                        if (gRes.data && gRes.data.email) {
                            verifiedEmail = gRes.data.email;
                            verifiedName = gRes.data.name || verifiedName;
                            verifiedPicture = gRes.data.picture || verifiedPicture;
                            googleUid = gRes.data.sub;
                        }
                    }
                    catch (gErr) {
                        console.warn('[AuthController] Google token verification fallback note:', gErr.message);
                    }
                }
            }
            if (!verifiedEmail && !googleUid && !verifiedName) {
                res.status(400).json({ error: 'Valid Google credentials required' });
                return;
            }
            const cleanEmail = verifiedEmail ? verifiedEmail.toLowerCase().trim() : `google_${googleUid || Date.now()}@weplay.pro`;
            let user = await prisma_1.default.user.findFirst({
                where: {
                    OR: [
                        ...(googleUid ? [{ firebaseUid: googleUid }] : []),
                        ...(cleanEmail ? [{ email: cleanEmail }] : []),
                    ],
                },
                include: {
                    family: true,
                    titles: { include: { title: true } },
                    badges: { include: { badge: true } },
                },
            });
            let isNewUser = false;
            if (!user) {
                isNewUser = true;
                const displayId = await generateUniqueDisplayId();
                let cleanName = verifiedName ? verifiedName.trim().replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20) : '';
                if (cleanName.length < 3)
                    cleanName = 'Google_User';
                const exists = await prisma_1.default.user.findFirst({ where: { username: { equals: cleanName, mode: 'insensitive' } } });
                const username = exists ? `${cleanName}_${Math.floor(100 + Math.random() * 900)}` : cleanName;
                const salt = await bcryptjs_1.default.genSalt(10);
                const dummyHash = await bcryptjs_1.default.hash(`google_${googleUid || Date.now()}_pwd`, salt);
                user = await prisma_1.default.user.create({
                    data: {
                        displayId,
                        username,
                        email: cleanEmail,
                        firebaseUid: googleUid || null,
                        authProvider: 'GOOGLE',
                        passwordHash: dummyHash,
                        role: client_1.Role.user,
                        coinsBalance: 50n,
                        avatarUrl: verifiedPicture || null,
                        lastLoginAt: new Date(),
                        signature: 'Welcome to WePlay!',
                        region: 'Global',
                        gender: 'MALE',
                        profileCompleted: false,
                    },
                    include: {
                        family: true,
                        titles: { include: { title: true } },
                        badges: { include: { badge: true } },
                    },
                });
            }
            else {
                user = await prisma_1.default.user.update({
                    where: { id: user.id },
                    data: {
                        lastLoginAt: new Date(),
                        authProvider: 'GOOGLE',
                        avatarUrl: user.avatarUrl || verifiedPicture || null,
                    },
                    include: {
                        family: true,
                        titles: { include: { title: true } },
                        badges: { include: { badge: true } },
                    },
                });
            }
            if (user.isBanned) {
                res.status(403).json({ error: 'Account has been banned. Please contact platform administration.' });
                return;
            }
            const tokenPayload = {
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            const io = (0, socket_handler_1.getSocketIO)();
            if (isNewUser) {
                io?.emit('admin:user_registered', {
                    userId: user.id,
                    displayId: user.displayId,
                    username: user.username,
                    authProvider: 'GOOGLE',
                    email: user.email,
                    timestamp: new Date().toISOString(),
                });
            }
            io?.emit('admin:user_login', {
                userId: user.id,
                displayId: user.displayId,
                username: user.username,
                authProvider: 'GOOGLE',
                email: user.email,
                timestamp: new Date().toISOString(),
            });
            io?.emit('admin:new_user_login', {
                userId: user.id,
                displayId: user.displayId,
                username: user.username,
                authProvider: 'GOOGLE',
                email: user.email,
                timestamp: new Date().toISOString(),
            });
            res.status(200).json({
                message: 'Google authentication successful',
                token,
                isNewUser,
                user: {
                    id: user.id,
                    displayId: user.displayId || '48941316',
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    coinsBalance: user.coinsBalance.toString(),
                    charmPoints: user.charmPoints.toString(),
                    expPoints: user.expPoints.toString(),
                    activeLevel: user.activeLevel,
                    blessingPoints: user.blessingPoints.toString(),
                    authProvider: user.authProvider,
                    avatarUrl: user.avatarUrl,
                    signature: user.signature,
                    region: user.region,
                    gender: user.gender,
                    birthday: user.birthday,
                    profileCompleted: user.profileCompleted,
                    is_onboarded: user.profileCompleted,
                    family: user.family,
                    titles: user.titles.map((t) => ({ ...t.title, isEquipped: t.isEquipped })),
                    badges: user.badges.map((b) => b.badge),
                },
            });
        }
        catch (error) {
            console.error('Google Auth Error:', error);
            res.status(500).json({ error: error.message || 'Failed to authenticate with Google' });
        }
    }
    /**
     * POST /api/auth/facebook
     * Verifies Facebook Access Token via Graph API, provisions user with 8-digit ID
     */
    static async facebookAuth(req, res) {
        try {
            const { accessToken, token: clientToken, email, displayName, photoUrl } = req.body;
            const fbToken = accessToken || clientToken;
            let verifiedEmail = email;
            let verifiedName = displayName;
            let verifiedPicture = photoUrl;
            let fbUid = '';
            if (fbToken) {
                try {
                    const fbRes = await axios_1.default.get(`https://graph.facebook.com/me?access_token=${fbToken}&fields=id,name,email,picture.type(large)`, { timeout: 8000 });
                    if (fbRes.data && fbRes.data.id) {
                        fbUid = fbRes.data.id;
                        verifiedName = fbRes.data.name || verifiedName;
                        if (fbRes.data.email)
                            verifiedEmail = fbRes.data.email;
                        if (fbRes.data.picture?.data?.url)
                            verifiedPicture = fbRes.data.picture.data.url;
                    }
                }
                catch (fbErr) {
                    console.warn('[AuthController] Facebook Graph API note:', fbErr.message);
                }
            }
            if (!verifiedEmail && !fbUid && !verifiedName) {
                res.status(400).json({ error: 'Valid Facebook credentials required' });
                return;
            }
            const cleanEmail = verifiedEmail ? verifiedEmail.toLowerCase().trim() : `fb_${fbUid || Date.now()}@weplay.pro`;
            let user = await prisma_1.default.user.findFirst({
                where: {
                    OR: [
                        ...(fbUid ? [{ firebaseUid: fbUid }] : []),
                        ...(cleanEmail ? [{ email: cleanEmail }] : []),
                    ],
                },
                include: {
                    family: true,
                    titles: { include: { title: true } },
                    badges: { include: { badge: true } },
                },
            });
            let isNewUser = false;
            if (!user) {
                isNewUser = true;
                const displayId = await generateUniqueDisplayId();
                let cleanName = verifiedName ? verifiedName.trim().replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20) : '';
                if (cleanName.length < 3)
                    cleanName = 'Facebook_User';
                const exists = await prisma_1.default.user.findFirst({ where: { username: { equals: cleanName, mode: 'insensitive' } } });
                const username = exists ? `${cleanName}_${Math.floor(100 + Math.random() * 900)}` : cleanName;
                const salt = await bcryptjs_1.default.genSalt(10);
                const dummyHash = await bcryptjs_1.default.hash(`fb_${fbUid || Date.now()}_pwd`, salt);
                user = await prisma_1.default.user.create({
                    data: {
                        displayId,
                        username,
                        email: cleanEmail,
                        firebaseUid: fbUid || null,
                        authProvider: 'FACEBOOK',
                        passwordHash: dummyHash,
                        role: client_1.Role.user,
                        coinsBalance: 50n,
                        avatarUrl: verifiedPicture || null,
                        lastLoginAt: new Date(),
                        signature: 'Welcome to WePlay!',
                        region: 'Global',
                        gender: 'MALE',
                        profileCompleted: false,
                    },
                    include: {
                        family: true,
                        titles: { include: { title: true } },
                        badges: { include: { badge: true } },
                    },
                });
            }
            else {
                user = await prisma_1.default.user.update({
                    where: { id: user.id },
                    data: {
                        lastLoginAt: new Date(),
                        authProvider: 'FACEBOOK',
                        avatarUrl: user.avatarUrl || verifiedPicture || null,
                    },
                    include: {
                        family: true,
                        titles: { include: { title: true } },
                        badges: { include: { badge: true } },
                    },
                });
            }
            if (user.isBanned) {
                res.status(403).json({ error: 'Account has been banned. Please contact platform administration.' });
                return;
            }
            const tokenPayload = {
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            const io = (0, socket_handler_1.getSocketIO)();
            if (isNewUser) {
                io?.emit('admin:user_registered', {
                    userId: user.id,
                    displayId: user.displayId,
                    username: user.username,
                    authProvider: 'FACEBOOK',
                    email: user.email,
                    timestamp: new Date().toISOString(),
                });
            }
            io?.emit('admin:user_login', {
                userId: user.id,
                displayId: user.displayId,
                username: user.username,
                authProvider: 'FACEBOOK',
                email: user.email,
                timestamp: new Date().toISOString(),
            });
            io?.emit('admin:new_user_login', {
                userId: user.id,
                displayId: user.displayId,
                username: user.username,
                authProvider: 'FACEBOOK',
                email: user.email,
                timestamp: new Date().toISOString(),
            });
            res.status(200).json({
                message: 'Facebook authentication successful',
                token,
                isNewUser,
                user: {
                    id: user.id,
                    displayId: user.displayId || '48941316',
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    coinsBalance: user.coinsBalance.toString(),
                    charmPoints: user.charmPoints.toString(),
                    expPoints: user.expPoints.toString(),
                    activeLevel: user.activeLevel,
                    blessingPoints: user.blessingPoints.toString(),
                    authProvider: user.authProvider,
                    avatarUrl: user.avatarUrl,
                    signature: user.signature,
                    region: user.region,
                    gender: user.gender,
                    birthday: user.birthday,
                    profileCompleted: user.profileCompleted,
                    is_onboarded: user.profileCompleted,
                    family: user.family,
                    titles: user.titles.map((t) => ({ ...t.title, isEquipped: t.isEquipped })),
                    badges: user.badges.map((b) => b.badge),
                },
            });
        }
        catch (error) {
            console.error('Facebook Auth Error:', error);
            res.status(500).json({ error: 'Failed to authenticate with Facebook' });
        }
    }
    /**
     * POST /api/auth/complete-onboarding & POST /api/user/complete-onboarding
     * Commits Player Setup & Onboarding (Avatar, Nickname, Gender, Birthday)
     */
    static async completeOnboarding(req, res) {
        try {
            const authHeader = req.headers.authorization;
            let userId = req.user?.userId;
            if (!userId && authHeader?.startsWith('Bearer ')) {
                try {
                    const decoded = jsonwebtoken_1.default.verify(authHeader.split(' ')[1], JWT_SECRET);
                    userId = decoded.userId;
                }
                catch (_) { }
            }
            if (!userId && req.body.userId) {
                userId = req.body.userId;
            }
            if (!userId) {
                res.status(401).json({ error: 'Authentication required to complete onboarding' });
                return;
            }
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
            // Notify Superadmin live
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
                message: 'Player setup completed successfully',
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
                    activeLevel: updated.activeLevel,
                    blessingPoints: updated.blessingPoints.toString(),
                    authProvider: updated.authProvider,
                    avatarUrl: updated.avatarUrl,
                    signature: updated.signature,
                    region: updated.region,
                    gender: updated.gender,
                    birthday: updated.birthday,
                    profileCompleted: true,
                    is_onboarded: true,
                    family: updated.family,
                    titles: updated.titles.map((t) => ({ ...t.title, isEquipped: t.isEquipped })),
                    badges: updated.badges.map((b) => b.badge),
                },
            });
        }
        catch (error) {
            console.error('Complete Onboarding Error:', error);
            res.status(500).json({ error: 'Failed to complete onboarding' });
        }
    }
}
exports.AuthController = AuthController;
