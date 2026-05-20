import { NextResponse } from "next/server";
import { POST as sepayPOST } from "@/app/api/billing/sepay/checkout/route";
import { handlePolarCheckout } from "@/lib/checkout";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const cloned = request.clone();
    const body = await cloned.json();
    const inferredProvider = body.packageId || body.customAmountUSD || body.customAmountVND ? "sepay" : "polar";
    const provider = (body.provider ?? inferredProvider).toString().toLowerCase();
    const headerWorkspaceId = request.headers.get("X-Workspace-Id");
    const user = await getAuthUser();
    // Determine workspaceId from body, header, or authenticated user
    const workspaceId = body.workspaceId ?? headerWorkspaceId ?? (user ? (user as any).workspaceId : undefined);
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }
    // Ensure body includes workspaceId for downstream logic
    body.workspaceId = workspaceId;

    if (provider === "sepay") {
      const sepayRequest = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(body),
      });
      return await sepayPOST(sepayRequest);
    }

    // Authentication is optional; if user is present, it may provide workspaceId.
    // No further auth checks needed here.

    const newRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body),
    });

    return await handlePolarCheckout(newRequest);
  } catch (err: any) {
    console.error("[Payments create-order] Error handling request", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
