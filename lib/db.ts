import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// export const prisma = global.prisma || new PrismaClient();

// if (process.env.NODE_ENV !== 'production') {
//   global.prisma = prisma;
// }

export const prismaDebug = new PrismaClient({ log: ["query", "info", "warn", "error"] });
