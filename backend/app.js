const fs = require('fs');
const path = require('path');

// 1. Explicitly register nodevenv and local paths so LiteSpeed lsnode always finds all modules
const venvModules = '/home/dadrehman/nodevenv/weplay-code/backend/20/lib/node_modules';
if (fs.existsSync(venvModules) && !module.paths.includes(venvModules)) {
  module.paths.unshift(venvModules);
}
const localModules = path.join(__dirname, 'node_modules');
if (fs.existsSync(localModules) && !module.paths.includes(localModules)) {
  module.paths.unshift(localModules);
}

// 2. Safe dotenv loader
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '.env') });
} catch (err) {
  console.warn('[WePlay Boot] dotenv note:', err.message);
}

// 3. Database URL Neon connection pooler configuration
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

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "weplay_production_secret_key_32_characters";
}

// 4. Global process error logging
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

// 5. Start compiled server
require('./dist/server.js');
