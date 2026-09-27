import { PrismaClient } from '@prisma/client';

// Enable JSON serialization for BigInt values
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const DEFAULT_NEON_URL = "postgresql://neondb_owner:npg_UxkR37NVfciW@ep-wandering-dawn-b4bzcqyr-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=30";

let effectiveDbUrl = process.env.DATABASE_URL || DEFAULT_NEON_URL;
if (effectiveDbUrl.includes('.neon.tech')) {
  if (!effectiveDbUrl.includes('-pooler')) {
    effectiveDbUrl = effectiveDbUrl.replace('.c-6.us-east-2.aws.neon.tech', '-pooler.c-6.us-east-2.aws.neon.tech');
  }
  if (!effectiveDbUrl.includes('pgbouncer=true')) {
    effectiveDbUrl += (effectiveDbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
  if (!effectiveDbUrl.includes('connect_timeout=')) {
    effectiveDbUrl += '&connect_timeout=30';
  }
}
process.env.DATABASE_URL = effectiveDbUrl;

let prisma: PrismaClient;

try {
  prisma = new PrismaClient({
    datasources: {
      db: { url: effectiveDbUrl },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
} catch (err: any) {
  console.error('[WePlay Database] PrismaClient initialization error:', err);
  // Fallback proxy to prevent instant crash of the HTTP server process
  prisma = new Proxy({} as PrismaClient, {
    get(target, prop) {
      if (prop === '$connect' || prop === '$disconnect') {
        return async () => {};
      }
      console.warn(`[WePlay Database] Database call attempted while Prisma is initializing: ${String(prop)}`);
      return () => Promise.reject(new Error(`Database client not ready: ${err?.message || 'Prisma error'}`));
    },
  });
}

export default prisma;
