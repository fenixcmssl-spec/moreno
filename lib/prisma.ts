// Prisma Client Singleton for Next.js App Router (Fast Refresh / Hot-Reload safe)
// Prevents connection pool saturation and avoids runtime crashes when DATABASE_URL is not configured

let PrismaClientClass: any = null;
try {
  if (process.env.DATABASE_URL) {
    PrismaClientClass = require('@prisma/client').PrismaClient;
  }
} catch {
  PrismaClientClass = null;
}

const prismaClientSingleton = () => {
  if (!process.env.DATABASE_URL || !PrismaClientClass) {
    return null;
  }
  try {
    return new PrismaClientClass({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  } catch {
    return null;
  }
};

type PrismaClientSingleton = any;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma: any = globalForPrisma.prisma !== undefined
  ? globalForPrisma.prisma
  : (globalForPrisma.prisma = prismaClientSingleton());

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;

