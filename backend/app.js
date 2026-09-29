const fs = require('fs');
const path = require('path');
const Module = require('module');

// 1. Bulletproof module resolution fallback to cPanel virtual environment
const venvPath = '/home/dadrehman/nodevenv/weplay-code/backend/20/lib/node_modules';
const localModules = path.join(__dirname, 'node_modules');

const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  try {
    return origResolve.call(this, request, parent, isMain, options);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      const opts = Object.assign({}, options);
      const searchPaths = [localModules, venvPath].concat(opts.paths || []);
      opts.paths = searchPaths;
      return origResolve.call(this, request, parent, isMain, opts);
    }
    throw err;
  }
};

// 2. Load .env file
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '.env') });
} catch (e) {
  console.warn('[WePlay Boot] dotenv note:', e.message);
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
