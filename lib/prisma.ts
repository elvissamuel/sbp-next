import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const prismaDebug = new PrismaClient({ log: ["query", "info", "warn", "error"] });
