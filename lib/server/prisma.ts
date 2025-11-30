import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __triviacast_prisma: PrismaClient | undefined;
}

const prisma = global.__triviacast_prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__triviacast_prisma = prisma;

export default prisma;
