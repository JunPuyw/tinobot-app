import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";
import {
  findMockPaymentOrderByExternalId,
  findMockPaymentOrderByTransferContent,
  listMockPaymentOrders,
} from "@/lib/mockBilling";
import prisma from "@/lib/prisma";

function getUserIdFromWorkspaceId(workspaceId: string) {
  return workspaceId.startsWith("user-") ? workspaceId.slice(5) : workspaceId;
}

function normalizeSepayContent(body: Record<string, any>) {
  return [
    body.code,
    body.content,
    body.description,
    body.transferContent,
    body.transactionContent,
  ]
    .filter((value) => value != null)
    .map((value) => String(value))
    .join(" ");
}

function getSepayExternalId(body: Record<string, any>, paymentCode: string, transferAmount: number) {
  const externalId = String(body.id ?? body.referenceCode ?? body.transactionId ?? "").trim();
  return externalId || `${paymentCode}-${transferAmount}`;
}

async function findSepayOrderFromContent(content: string) {
  const exact = await findMockPaymentOrderByTransferContent(content);
  if (exact) return exact;

  const normalizedContent = content.toLowerCase();
  return (
    (await listMockPaymentOrders()).find(
      (order) =>
        order.provider === "sepay" &&
        order.status === "pending" &&
        !!order.transferContent &&
        normalizedContent.includes(order.transferContent.toLowerCase()),
    ) ?? null
  );
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const webhookKey = process.env.SEPAY_WEBHOOK_KEY;

    if (webhookKey && authHeader !== `Apikey ${webhookKey}`) {
      console.warn("[SePay Webhook] Unauthorized", { authHeader });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const paymentCode = normalizeSepayContent(body);
    const transferAmount = Number(body.transferAmount ?? body.amount ?? 0);
    const transferType = String(body.transferType ?? "");
    const sepayId = getSepayExternalId(body, paymentCode, transferAmount);

    if (transferType && transferType !== "in") {
      return NextResponse.json({ success: true, message: "Ignored out-transfer" });
    }

    const order = await findSepayOrderFromContent(paymentCode);
    if (!order || order.provider !== "sepay" || order.status !== "pending") {
      console.warn("[SePay Webhook] No pending order for", paymentCode);
      return NextResponse.json({ success: true, message: "Order not found" });
    }

    const existing = await findMockPaymentOrderByExternalId(sepayId);
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
    const userId = getUserIdFromWorkspaceId(order.workspaceId);

    const completedAt = new Date();
    const transactionResult = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.paymentOrder.updateMany({
        where: { id: order.id, status: "pending" },
        data: {
          status: "completed",
          externalId: sepayId,
          creditsEarned,
          completedAt,
        },
      });
      if (updatedOrder.count === 0) return false;
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: creditsEarned } },
      });
      return true;
    });

    if (!transactionResult) {
      return NextResponse.json({ success: true, message: "Order already handled" });
    }

    console.log(`[SePay Webhook] Credited $${creditsEarned} to user ${userId}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[SePay Webhook] Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
