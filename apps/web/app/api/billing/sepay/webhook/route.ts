import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/localDb";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const webhookKey = process.env.SEPAY_WEBHOOK_KEY;
    if (webhookKey && authHeader !== `Apikey ${webhookKey}`) {
      console.warn("[SePay Webhook] Unauthorized", { authHeader });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id: sepayId, code, transferAmount, transferType } = body;
    if (transferType !== "in") {
      return NextResponse.json({ success: true, message: "Ignored out-transfer" });
    }
    const paymentCode = code || "";

    const result = await prisma.$transaction(async (tx) => {
      const settings = await tx.globalSettings.findUnique({ where: { id: 1 } });
      const bonusRate = (settings?.data as any)?.topupExchangeRate || 1.0;

      const order = await tx.paymentOrder.findFirst({
        where: {
          transferContent: { equals: paymentCode, mode: "insensitive" },
          status: "pending",
          provider: "sepay",
        },
      });
      if (!order) {
        console.warn("[SePay Webhook] No pending order for", paymentCode);
        return { success: false, error: "Order not found" };
      }

      // amount tolerance check
      if (Math.abs(order.amountVND - transferAmount) > 10) {
        console.warn("[SePay Webhook] Amount mismatch", { expected: order.amountVND, received: transferAmount });
      }

      const already = await tx.paymentOrder.findFirst({
        where: { externalId: String(sepayId), status: "completed" },
      });
      if (already) {
        return { success: true, alreadyProcessed: true };
      }

      const creditsEarned = parseFloat((order.amountUSD * bonusRate).toFixed(2));

      await tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: "completed",
          externalId: String(sepayId),
          completedAt: new Date(),
          creditsEarned,
        },
      });

      await tx.workspace.update({
        where: { id: order.workspaceId },
        data: { credits: { increment: creditsEarned } },
      });

      return { success: true, workspaceId: order.workspaceId, credits: creditsEarned };
    });

    if (!result.success) {
      return NextResponse.json({ success: true, message: result.error });
    }
    console.log(`[SePay Webhook] ✅ Credited $${result.credits} to workspace ${result.workspaceId}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[SePay Webhook] Error", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
