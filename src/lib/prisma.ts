import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const createPrismaClient = () => {
  return new PrismaClient({
    // Only log errors in production to reduce memory/IO usage
    log: process.env.NODE_ENV === 'production' 
      ? ['error'] 
      : ['query', 'error', 'warn'],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Always cache in development AND production to prevent connection pool exhaustion
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
} else {
  // In production, also cache to prevent creating new connections on each request
  globalForPrisma.prisma = prisma;
}
