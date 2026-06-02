// Prisma client singleton for Next.js
// Ensures a single instance across dev hot reloads.
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

if (!global.prisma || !global.prisma.modelCombo || !global.prisma.pricingPackage) {
  void global.prisma?.$disconnect();
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL || "file:./dev.db",
  });
  global.prisma = new PrismaClient({ adapter });
}

export default global.prisma as PrismaClient;
