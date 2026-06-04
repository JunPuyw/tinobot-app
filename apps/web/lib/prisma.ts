// Prisma client singleton for Next.js
// Ensures a single instance across dev hot reloads.
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function isCurrentClient(client: PrismaClient | undefined) {
  const currentClient = client as any;
  return !!currentClient &&
    !!currentClient.modelCombo &&
    !!currentClient.pricingPackage &&
    !!currentClient.gatewaySetting &&
    !!currentClient.platformUsage &&
    !!currentClient.clientDailyUsage;
}

export function getPrisma() {
  if (isCurrentClient(global.prisma)) return global.prisma as PrismaClient;

  void global.prisma?.$disconnect();
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL || "file:./dev.db",
  });
  global.prisma = new PrismaClient({ adapter });
  return global.prisma;
}

export default getPrisma();
