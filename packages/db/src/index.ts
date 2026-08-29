import { PrismaClient } from '@prisma/client';
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
export const prisma = new PrismaClient({
  log: isDev ? ['query', 'error', 'warn'] : ['error'],
});
export * from '@prisma/client';
