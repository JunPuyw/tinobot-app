import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Singleton to avoid multiple connections during ts-node-dev restarts
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

if (!global.__prisma) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Prisma");
  }
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  global.__prisma = new PrismaClient({ adapter, log: ["error"] });
}

const prisma = global.__prisma as PrismaClient;

export default prisma;
