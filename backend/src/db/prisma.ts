import { PrismaClient } from '@prisma/client';

// Enable JSON serialization for BigInt values
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

let prisma: PrismaClient;

try {
  prisma = new PrismaClient({
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
