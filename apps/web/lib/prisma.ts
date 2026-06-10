// Prisma client singleton for Next.js
// Ensures a single instance across dev hot reloads.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Prisma");
  }
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  global.prisma = new PrismaClient({ adapter });
  return global.prisma;
}

export default getPrisma();
