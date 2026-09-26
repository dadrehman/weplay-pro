"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.optionalAuthenticateJWT = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../db/prisma"));
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret-weplay-jwt-key-change-in-production-min32chars';
const authenticateJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication token required' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Verify user still exists in database and check banned status
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, isBanned: true, role: true, username: true, email: true },
        });
        if (!user) {
            res.status(401).json({ error: 'User no longer exists' });
            return;
        }
        if (user.isBanned) {
            res.status(403).json({ error: 'Account has been banned. Please contact support.' });
            return;
        }
        req.user = {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
};
exports.authenticateJWT = authenticateJWT;
const optionalAuthenticateJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, isBanned: true, role: true, username: true, email: true },
        });
        if (user && !user.isBanned) {
            req.user = {
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            };
        }
    }
    catch (_) {
        // Ignore invalid token on optional auth
    }
    next();
};
exports.optionalAuthenticateJWT = optionalAuthenticateJWT;
const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return Promise.resolve();
    }
    // Allow superadmin role (and admin if designated)
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Access denied: Superadmin role required' });
        return Promise.resolve();
    }
    next();
    return Promise.resolve();
};
exports.requireSuperAdmin = requireSuperAdmin;
