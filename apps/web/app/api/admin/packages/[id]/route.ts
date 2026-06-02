import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminUser";
import {
  deletePricingPackage,
  getPricingPackageById,
  updatePricingPackage,
} from "@/lib/pricingPackages";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const pkg = await getPricingPackageById(id);
  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }
  return NextResponse.json({ package: pkg });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if ("name" in body) {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json({ error: "Package name is required" }, { status: 400 });
      }
      data.name = name;
    }

    if ("description" in body) {
      const description = String(body.description || "").trim();
      data.description = description || null;
    }

    if ("priceUSD" in body) {
      const priceUSD = Number(body.priceUSD);
      if (!Number.isFinite(priceUSD) || priceUSD <= 0) {
        return NextResponse.json({ error: "priceUSD must be greater than 0" }, { status: 400 });
      }
      data.priceUSD = priceUSD;
    }

    if ("credits" in body) {
      const credits = Number(body.credits);
      if (!Number.isFinite(credits) || credits <= 0) {
        return NextResponse.json({ error: "credits must be greater than 0" }, { status: 400 });
      }
      data.credits = credits;
    }

    if ("isActive" in body) {
      data.isActive = Boolean(body.isActive);
    }

    if ("sortOrder" in body) {
      const sortOrder = Number(body.sortOrder);
      if (!Number.isFinite(sortOrder)) {
        return NextResponse.json({ error: "sortOrder must be a number" }, { status: 400 });
      }
      data.sortOrder = sortOrder;
    }

    const updated = await updatePricingPackage(id, data);
    if (!updated) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({ package: updated });
  } catch (err: any) {
    console.error("[Admin packages PATCH] Error", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deletePricingPackage(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Admin packages DELETE] Error", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
