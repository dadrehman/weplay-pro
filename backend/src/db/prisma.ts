import { PrismaClient } from '@prisma/client';

// Enable JSON serialization for BigInt values
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
