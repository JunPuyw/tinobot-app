// Prisma client singleton for Next.js
// Ensures a single instance across dev hot reloads.
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  // In production we can safely instantiate a new client
  prisma = new PrismaClient();
} else {
  // In development, reuse the client across hot reloads to avoid too many connections
  if (!global.prisma) {
    const adapter = new PrismaLibSql({
      url: process.env.DATABASE_URL || "file:./dev.db",
    });
    global.prisma = new PrismaClient({ adapter });
  }
  prisma = global.prisma as PrismaClient;
}

export default prisma;
