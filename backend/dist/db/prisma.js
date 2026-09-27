"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Enable JSON serialization for BigInt values
BigInt.prototype.toJSON = function () {
    return this.toString();
};
let prisma;
try {
    prisma = new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
}
catch (err) {
    console.error('[WePlay Database] PrismaClient initialization error:', err);
    // Fallback proxy to prevent instant crash of the HTTP server process
    prisma = new Proxy({}, {
        get(target, prop) {
            if (prop === '$connect' || prop === '$disconnect') {
                return async () => { };
            }
            console.warn(`[WePlay Database] Database call attempted while Prisma is initializing: ${String(prop)}`);
            return () => Promise.reject(new Error(`Database client not ready: ${err?.message || 'Prisma error'}`));
        },
    });
}
exports.default = prisma;
