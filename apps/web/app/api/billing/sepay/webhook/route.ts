import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";
import {
  findMockPaymentOrderByExternalId,
  findMockPaymentOrderByTransferContent,
  markMockPaymentOrderCompleted,
} from "@/lib/mockBilling";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const webhookKey = process.env.SEPAY_WEBHOOK_KEY;

    if (webhookKey && authHeader !== `Apikey ${webhookKey}`) {
      console.warn("[SePay Webhook] Unauthorized", { authHeader });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const sepayId = String(body.id ?? "");
    const paymentCode = String(body.code ?? "");
    const transferAmount = Number(body.transferAmount ?? 0);
    const transferType = String(body.transferType ?? "");

    if (transferType !== "in") {
      return NextResponse.json({ success: true, message: "Ignored out-transfer" });
    }

    const order = findMockPaymentOrderByTransferContent(paymentCode);
    if (!order || order.provider !== "sepay" || order.status !== "pending") {
      console.warn("[SePay Webhook] No pending order for", paymentCode);
      return NextResponse.json({ success: true, message: "Order not found" });
    }

    const existing = findMockPaymentOrderByExternalId(sepayId);
    if (existing) {
      return NextResponse.json({ success: true, alreadyProcessed: true });
    }

    if (typeof order.amountVND === "number" && Math.abs(order.amountVND - transferAmount) > 10) {
      console.warn("[SePay Webhook] Amount mismatch", {
        expected: order.amountVND,
        received: transferAmount,
      });
    }

    const settings = await getSettings();
    const creditsEarned = parseFloat((order.amountUSD * (settings.topupExchangeRate || 1)).toFixed(2));

    const updatedOrder = markMockPaymentOrderCompleted(order.id, {
      externalId: sepayId,
      completedAt: new Date().toISOString(),
      creditsEarned,
    });

    if (!updatedOrder) {
      return NextResponse.json({ success: true, message: "Order update failed" });
    }

    console.log(`[SePay Webhook] Credited $${creditsEarned} to workspace ${order.workspaceId}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[SePay Webhook] Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
