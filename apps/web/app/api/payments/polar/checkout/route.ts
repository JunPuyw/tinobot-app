import { NextResponse } from "next/server";
import { handlePolarCheckout } from "@/lib/checkout";

export async function POST(request: Request) {
  try {
    // Directly handle Polar checkout without additional auth check
    return await handlePolarCheckout(request);
  } catch (err: any) {
    console.error("[Payments polar checkout] Error", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
