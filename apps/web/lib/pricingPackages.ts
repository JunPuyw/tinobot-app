import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";

export type PricingPackageRecord = {
  id: string;
  name: string;
  description: string | null;
  priceUSD: number;
  credits: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const DEFAULT_PACKAGES = [
  {
    name: "Starter Pack",
    description: "Phu hop de nap thu\nTop-up nhanh cho workspace nho",
    priceUSD: 5,
    credits: 5,
    isActive: true,
    sortOrder: 0,
  },
  {
    name: "Growth Pack",
    description: "Can bang gia va credits\nHop cho nhu cau su dung hang ngay",
    priceUSD: 10,
    credits: 11,
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Pro Pack",
    description: "Gia tot hon cho top-up lon\nUu tien cho team dang tang truong",
    priceUSD: 25,
    credits: 28,
    isActive: true,
    sortOrder: 2,
  },
];

function normalizePackage(pkg: PricingPackageRecord) {
  return {
    ...pkg,
    priceUSD: Number(pkg.priceUSD),
    credits: Number(pkg.credits),
    isActive: Boolean(pkg.isActive),
    sortOrder: Number(pkg.sortOrder),
    createdAt: pkg.createdAt instanceof Date ? pkg.createdAt.toISOString() : pkg.createdAt,
    updatedAt: pkg.updatedAt instanceof Date ? pkg.updatedAt.toISOString() : pkg.updatedAt,
  };
}

async function listRawPackages() {
  const rows = await prisma.pricingPackage.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(normalizePackage);
}

export async function ensureDefaultPricingPackages() {
  const total = await prisma.pricingPackage.count();
  if (total > 0) return;

  for (const pkg of DEFAULT_PACKAGES) {
    await createPricingPackage(pkg);
  }
}

export async function listPricingPackages(includeInactive = true) {
  await ensureDefaultPricingPackages();
  const packages = await listRawPackages();
  return includeInactive ? packages : packages.filter((pkg) => pkg.isActive);
}

export async function getPricingPackageById(id: string) {
  await ensureDefaultPricingPackages();
  const pkg = await prisma.pricingPackage.findUnique({
    where: { id },
  });
  return pkg ? normalizePackage(pkg) : null;
}

export async function createPricingPackage(input: {
  name: string;
  description?: string | null;
  priceUSD: number;
  credits: number;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const id = randomUUID();
  await prisma.pricingPackage.create({
    data: {
      id,
      name: input.name,
      description: input.description ?? null,
      priceUSD: input.priceUSD,
      credits: input.credits,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  return getPricingPackageById(id);
}

export async function updatePricingPackage(
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    priceUSD: number;
    credits: number;
    isActive: boolean;
    sortOrder: number;
  }>,
) {
  const current = await getPricingPackageById(id);
  if (!current) return null;

  const merged = {
    name: input.name ?? current.name,
    description:
      input.description !== undefined ? input.description : current.description,
    priceUSD: input.priceUSD ?? current.priceUSD,
    credits: input.credits ?? current.credits,
    isActive: input.isActive ?? current.isActive,
    sortOrder: input.sortOrder ?? current.sortOrder,
  };

  await prisma.pricingPackage.update({
    where: { id },
    data: merged,
  });

  return getPricingPackageById(id);
}

export async function deletePricingPackage(id: string) {
  await prisma.pricingPackage.delete({
    where: { id },
  });
}
