import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminUser";
import { createPricingPackage, listPricingPackages } from "@/lib/pricingPackages";

export async function GET() {
  const packages = await listPricingPackages(true);
  return NextResponse.json({ packages });
}

export async function POST(request: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const priceUSD = Number(body.priceUSD);
    const credits = Number(body.credits);
    const isActive = body.isActive !== false;
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

    if (!name) {
      return NextResponse.json({ error: "Package name is required" }, { status: 400 });
    }
    if (!Number.isFinite(priceUSD) || priceUSD <= 0) {
      return NextResponse.json({ error: "priceUSD must be greater than 0" }, { status: 400 });
    }
    if (!Number.isFinite(credits) || credits <= 0) {
      return NextResponse.json({ error: "credits must be greater than 0" }, { status: 400 });
    }

    const created = await createPricingPackage({
      name,
      description: description || null,
      priceUSD,
      credits,
      isActive,
      sortOrder,
    });

    return NextResponse.json({ package: created }, { status: 201 });
  } catch (err: any) {
    console.error("[Admin packages POST] Error", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
