"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("./db/prisma"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const room_routes_1 = __importDefault(require("./routes/room.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const friend_routes_1 = __importDefault(require("./routes/friend.routes"));
const ranking_routes_1 = __importDefault(require("./routes/ranking.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const event_routes_1 = __importDefault(require("./routes/event.routes"));
const build_info_1 = require("./build_info");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express_1.default.json());
// Public Health & Deployment Verification Handler
const healthHandler = async (req, res) => {
    let dbConnected = false;
    let dbError = null;
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        dbConnected = true;
    }
    catch (err) {
        dbConnected = false;
        dbError = err?.message || String(err);
    }
    const isDbUrlSet = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
    const isJwtSet = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0);
    const isMetaTokenSet = Boolean(process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_TOKEN.trim().length > 0);
    const isMetaPhoneIdSet = Boolean((process.env.META_WHATSAPP_PHONE_NUMBER_ID && process.env.META_WHATSAPP_PHONE_NUMBER_ID.trim().length > 0) ||
        (process.env.META_PHONE_NUMBER_ID && process.env.META_PHONE_NUMBER_ID.trim().length > 0));
    const isGoogleClientIdSet = Boolean((process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim().length > 0) ||
        (process.env.GOOGLE_SERVER_CLIENT_ID && process.env.GOOGLE_SERVER_CLIENT_ID.trim().length > 0));
    const isFirebaseServiceAccountSet = Boolean((process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_SERVICE_ACCOUNT.trim().length > 0) ||
        (process.env.FIREBASE_SERVICE_ACCOUNT_KEY && process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim().length > 0) ||
        (process.env.FIREBASE_ADMIN_CREDENTIALS && process.env.FIREBASE_ADMIN_CREDENTIALS.trim().length > 0));
    const status = dbConnected && isDbUrlSet && isJwtSet ? 'ok' : (dbConnected ? 'degraded' : 'error');
    res.status(status === 'error' ? 503 : 200).json({
        status,
        buildId: build_info_1.BUILD_ID,
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        pid: process.pid,
        dbConnected,
        dbError: dbConnected ? null : dbError,
        env: {
            JWT_SECRET: isJwtSet ? 'set' : 'missing',
            META_WHATSAPP_TOKEN: isMetaTokenSet ? 'set' : 'missing',
            META_WHATSAPP_PHONE_NUMBER_ID: isMetaPhoneIdSet ? 'set' : 'missing',
            GOOGLE_CLIENT_ID: isGoogleClientIdSet ? 'set' : 'missing',
            FIREBASE_SERVICE_ACCOUNT: isFirebaseServiceAccountSet ? 'set' : 'missing',
            DATABASE_URL: isDbUrlSet ? 'set' : 'missing',
        },
    });
};
app.get(['/health', '/api/health', '/', '/api'], healthHandler);
// One-click Web Trigger to initialize/generate Prisma Client on Linux without SSH/Terminal
app.get(['/setup-prisma', '/api/setup-prisma', '/api/admin/generate-prisma'], async (req, res) => {
    try {
        const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const cwd = path.resolve(__dirname, '..');
        const nodeBin = process.execPath;
        const cliPath = path.join(cwd, 'node_modules', 'prisma', 'build', 'index.js');
        const schemaPath = path.join(cwd, 'prisma', 'schema.prisma');
        const cmd = `"${nodeBin}" "${cliPath}" generate --schema="${schemaPath}"`;
        exec(cmd, { cwd, timeout: 60000, env: process.env }, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({
                    success: false,
                    error: error.message,
                    stdout,
                    stderr,
                });
            }
            return res.status(200).json({
                success: true,
                message: 'Prisma Client successfully generated on server! Please restart the app in cPanel.',
                stdout,
                stderr,
            });
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Meta Developer Compliance Endpoints (Privacy Policy, Terms, Data Deletion)
app.get(['/privacy', '/api/privacy', '/privacy-policy', '/api/privacy-policy'], (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WePlay - Privacy Policy</title>
  <style>body{font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333;}h1{color:#111;border-bottom:2px solid #6366f1;padding-bottom:10px;}</style>
</head>
<body>
  <h1>WePlay - Privacy Policy</h1>
  <p><strong>Last Updated: September 2026</strong></p>
  <p>Welcome to WePlay. We respect your privacy and are committed to protecting your personal information.</p>
  <h3>1. Information We Collect</h3>
  <p>We only collect information necessary to authenticate and secure user accounts, including Email address, Mobile Phone Number, Display Name, and Profile Picture provided through Google, Facebook, or WhatsApp authentication.</p>
  <h3>2. How We Use Information</h3>
  <p>Your information is used solely to authenticate your gaming session, prevent fraud, and synchronize your in-game profile. We do not sell, rent, or share personal data with any third-party advertisers.</p>
  <h3>3. Data Protection</h3>
  <p>All communication between your client device and WePlay servers is strictly encrypted with HTTPS/TLS.</p>
  <h3>4. Contact Us</h3>
  <p>If you have any questions, contact us at: <strong>dadrehman14@gmail.com</strong></p>
</body>
</html>`);
});
app.get(['/terms', '/api/terms', '/terms-of-service', '/api/terms-of-service'], (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WePlay - Terms of Service</title>
  <style>body{font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333;}h1{color:#111;border-bottom:2px solid #6366f1;padding-bottom:10px;}</style>
</head>
<body>
  <h1>WePlay - Terms of Service</h1>
  <p><strong>Last Updated: September 2026</strong></p>
  <p>By downloading, accessing, or using the WePlay application and backend services, you agree to follow our community guidelines and fair play standards.</p>
  <p>Contact: <strong>dadrehman14@gmail.com</strong></p>
</body>
</html>`);
});
app.get(['/data-deletion', '/api/data-deletion'], (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WePlay - User Data Deletion Instructions</title>
  <style>body{font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333;}h1{color:#111;border-bottom:2px solid #6366f1;padding-bottom:10px;}</style>
</head>
<body>
  <h1>WePlay - User Data Deletion Request</h1>
  <p>In accordance with Meta and GDPR standards, users may request complete deletion of their account and associated data.</p>
  <p>To request data deletion, send an email to <strong>dadrehman14@gmail.com</strong> with your WePlay Display ID or registered email. All user records will be deleted from our Neon database within 48 hours.</p>
</body>
</html>`);
});
app.get(['/db-check', '/api/db-check'], async (req, res) => {
    try {
        const userCount = await prisma_1.default.user.count();
        const superadmin = await prisma_1.default.user.findFirst({
            where: { role: 'superadmin' },
            select: { email: true, username: true, displayId: true, activeLevel: true },
        });
        res.status(200).json({
            status: 'ok',
            database: 'connected',
            userCount,
            superadmin: superadmin || 'Not yet seeded',
        });
    }
    catch (err) {
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            message: err?.message || String(err),
            url: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@') : 'NOT SET',
        });
    }
});
// API Routes (matching both /api/... and /... for reverse proxies)
app.use(['/api/auth', '/auth'], auth_routes_1.default);
app.use(['/api/admin', '/admin'], admin_routes_1.default);
app.use(['/api/users', '/users'], user_routes_1.default);
app.use(['/api/user', '/user'], user_routes_1.default);
app.use(['/api/rooms', '/rooms'], room_routes_1.default);
app.use(['/api/messages', '/messages'], message_routes_1.default);
app.use(['/api/friends', '/friends'], friend_routes_1.default);
app.use(['/api/rankings', '/rankings'], ranking_routes_1.default);
app.use(['/api/tasks', '/tasks'], task_routes_1.default);
app.use(['/api/events', '/events'], event_routes_1.default);
// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Unhandled Server Error]:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err?.message || String(err),
    });
});
exports.default = app;
