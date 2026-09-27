const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DEFAULT_NEON_URL = "postgresql://neondb_owner:npg_UxkR37NVfciW@ep-wandering-dawn-b4bzcqyr-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=30&connection_limit=1&pool_timeout=30";

let dbUrl = process.env.DATABASE_URL || DEFAULT_NEON_URL;
if (dbUrl.includes('.neon.tech')) {
  if (!dbUrl.includes('-pooler')) {
    dbUrl = dbUrl.replace('.c-6.us-east-2.aws.neon.tech', '-pooler.c-6.us-east-2.aws.neon.tech');
  }
  if (!dbUrl.includes('pgbouncer=true')) {
    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
  if (!dbUrl.includes('connect_timeout=')) {
    dbUrl += '&connect_timeout=30';
  }
  if (!dbUrl.includes('connection_limit=')) {
    dbUrl += '&connection_limit=1';
  }
  if (!dbUrl.includes('pool_timeout=')) {
    dbUrl += '&pool_timeout=30';
  }
}
process.env.DATABASE_URL = dbUrl;

process.on('uncaughtException', (err) => {
  console.error('[Passenger Error]', err);
  try {
    fs.appendFileSync(path.join(__dirname, 'startup.log'), `[${new Date().toISOString()}] Uncaught Exception: ${err.stack || err}\n`);
  } catch (_) {}
});

process.on('unhandledRejection', (reason) => {
  console.error('[Passenger Rejection]', reason);
  try {
    fs.appendFileSync(path.join(__dirname, 'startup.log'), `[${new Date().toISOString()}] Unhandled Rejection: ${reason.stack || reason}\n`);
  } catch (_) {}
});

// Auto-verify and Auto-generate Prisma Client
(function ensurePrisma() {
  let isReady = false;
  try {
    const { PrismaClient } = require('@prisma/client');
    const testClient = new PrismaClient();
    if (typeof testClient.$connect === 'function') {
      isReady = true;
      console.log('[WePlay] Prisma Client verified and operational.');
    }
  } catch (err) {
    console.log('[WePlay] Prisma Client needs generation. Reason:', err?.message || err);
  }

  if (!isReady) {
    console.log('[WePlay] Running prisma generate on server...');
    try {
      const { execSync } = require('child_process');
      const bin = path.join(__dirname, 'node_modules', '.bin', 'prisma');
      const cmd = fs.existsSync(bin) ? `"${bin}" generate` : 'npx prisma generate';
      const output = execSync(cmd, { cwd: __dirname, encoding: 'utf-8', timeout: 90000, env: process.env });
      console.log('[WePlay] Prisma generate completed successfully:\n', output);
    } catch (genErr) {
      console.error('[WePlay] Prisma generate execution error:', genErr?.message || genErr);
    }
  }
})();

require('dotenv').config();
require('./dist/server.js');
