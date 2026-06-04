import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminUser";
import prisma from "@/lib/prisma";

async function getSettings() {
  return prisma.gatewaySetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ settings: await getSettings() });
}

export async function PATCH(request: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const platformMarkupPercent = Number(body.platformMarkupPercent);
  const vndUsdRate = Number(body.vndUsdRate);

  if (!Number.isFinite(platformMarkupPercent) || platformMarkupPercent < 0) {
    return NextResponse.json({ error: "Markup percent must be zero or greater" }, { status: 400 });
  }
  if (!Number.isFinite(vndUsdRate) || vndUsdRate <= 0) {
    return NextResponse.json({ error: "VND/USD rate must be greater than zero" }, { status: 400 });
  }

  const settings = await prisma.gatewaySetting.upsert({
    where: { id: "default" },
    update: { platformMarkupPercent, vndUsdRate },
    create: { id: "default", platformMarkupPercent, vndUsdRate },
  });
  return NextResponse.json({ settings });
}
