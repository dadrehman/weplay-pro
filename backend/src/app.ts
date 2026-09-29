import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db/prisma';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import roomRoutes from './routes/room.routes';
import messageRoutes from './routes/message.routes';
import friendRoutes from './routes/friend.routes';
import rankingRoutes from './routes/ranking.routes';
import taskRoutes from './routes/task.routes';
import eventRoutes from './routes/event.routes';

import { BUILD_ID } from './build_info';

dotenv.config();

const app = express();

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Public Health & Deployment Verification Handler
const healthHandler = async (req: Request, res: Response): Promise<void> => {
  let dbConnected = false;
  let dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch (err: any) {
    dbConnected = false;
    dbError = err?.message || String(err);
  }

  const isDbUrlSet = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
  const isJwtSet = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0);
  const isMetaTokenSet = Boolean(process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_TOKEN.trim().length > 0);
  const isMetaPhoneIdSet = Boolean(
    (process.env.META_WHATSAPP_PHONE_NUMBER_ID && process.env.META_WHATSAPP_PHONE_NUMBER_ID.trim().length > 0) ||
    (process.env.META_PHONE_NUMBER_ID && process.env.META_PHONE_NUMBER_ID.trim().length > 0)
  );
  const isGoogleClientIdSet = Boolean(
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim().length > 0) ||
    (process.env.GOOGLE_SERVER_CLIENT_ID && process.env.GOOGLE_SERVER_CLIENT_ID.trim().length > 0)
  );
  const isFirebaseServiceAccountSet = Boolean(
    (process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_SERVICE_ACCOUNT.trim().length > 0) ||
    (process.env.FIREBASE_SERVICE_ACCOUNT_KEY && process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim().length > 0) ||
    (process.env.FIREBASE_ADMIN_CREDENTIALS && process.env.FIREBASE_ADMIN_CREDENTIALS.trim().length > 0)
  );

  const status = dbConnected && isDbUrlSet && isJwtSet ? 'ok' : (dbConnected ? 'degraded' : 'error');

  res.status(status === 'error' ? 503 : 200).json({
    status,
    buildId: BUILD_ID,
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
app.get(['/setup-prisma', '/api/setup-prisma', '/api/admin/generate-prisma'], async (req: Request, res: Response) => {
  try {
    const { exec } = await import('child_process');
    const path = await import('path');
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
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Meta Developer Compliance Endpoints (Privacy Policy, Terms, Data Deletion)
app.get(['/privacy', '/api/privacy', '/privacy-policy', '/api/privacy-policy'], (req: Request, res: Response) => {
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

app.get(['/terms', '/api/terms', '/terms-of-service', '/api/terms-of-service'], (req: Request, res: Response) => {
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

app.get(['/data-deletion', '/api/data-deletion'], (req: Request, res: Response) => {
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


app.get(['/db-check', '/api/db-check'], async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    const superadmin = await prisma.user.findFirst({
      where: { role: 'superadmin' },
      select: { email: true, username: true, displayId: true, activeLevel: true },
    });
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      userCount,
      superadmin: superadmin || 'Not yet seeded',
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: err?.message || String(err),
      url: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@') : 'NOT SET',
    });
  }
});

// API Routes (matching both /api/... and /... for reverse proxies)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);
app.use(['/api/users', '/users'], userRoutes);
app.use(['/api/user', '/user'], userRoutes);
app.use(['/api/rooms', '/rooms'], roomRoutes);
app.use(['/api/messages', '/messages'], messageRoutes);
app.use(['/api/friends', '/friends'], friendRoutes);
app.use(['/api/rankings', '/rankings'], rankingRoutes);
app.use(['/api/tasks', '/tasks'], taskRoutes);
app.use(['/api/events', '/events'], eventRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err?.message || String(err),
  });
});

export default app;
