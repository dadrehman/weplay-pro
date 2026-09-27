// cPanel Passenger Entry Point
const fs = require('fs');
const path = require('path');

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
