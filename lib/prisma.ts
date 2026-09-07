// Prisma Client Singleton for Next.js App Router (Fast Refresh / Hot-Reload safe)
// Prevents connection pool saturation in development

let PrismaClientClass: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PrismaClientClass = require('@prisma/client').PrismaClient;
} catch {
  PrismaClientClass = class MockPrismaClient {
    constructor(public options?: any) {}
  };
}

const prismaClientSingleton = () => {
  return new PrismaClientClass({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

