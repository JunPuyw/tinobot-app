import { NextResponse } from "next/server";
import { listBillingPackages } from "@/lib/mockBilling";

export async function GET() {
  return NextResponse.json({ packages: listBillingPackages() });
}
