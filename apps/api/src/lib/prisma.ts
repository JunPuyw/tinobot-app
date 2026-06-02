import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Singleton to avoid multiple connections during ts-node-dev restarts
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

if (!global.__prisma) {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL || "file:./dev.db",
  });
  global.__prisma = new PrismaClient({ adapter, log: ["error"] });
}

const prisma = global.__prisma as PrismaClient;

export default prisma;
