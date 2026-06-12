import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";
import {
  findMockPaymentOrderByExternalId,
  findMockPaymentOrderByTransferContent,
  listMockPaymentOrders,
} from "@/lib/mockBilling";
import prisma from "@/lib/prisma";

type SepayWebhookBody = Record<string, unknown>;

function getUserIdFromWorkspaceId(workspaceId: string) {
  return workspaceId.startsWith("user-") ? workspaceId.slice(5) : workspaceId;
}

function normalizeSepayContent(body: SepayWebhookBody) {
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

function getSepayExternalId(body: SepayWebhookBody, paymentCode: string, transferAmount: number) {
  const externalId = String(body.id ?? body.referenceCode ?? body.transactionId ?? "").trim();
  return externalId || `${paymentCode}-${transferAmount}`;
}

function getAuthLogState(authHeader: string | null) {
  if (!authHeader) return "missing";
  const [scheme] = authHeader.split(/\s+/, 1);
  return `${scheme || "present"}:${authHeader.length}`;
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
    const userAgent = request.headers.get("user-agent") || "unknown";

    if (webhookKey && authHeader !== `Apikey ${webhookKey}`) {
      console.warn("[SePay Webhook] Unauthorized", {
        auth: getAuthLogState(authHeader),
        expectedAuthLength: `Apikey ${webhookKey}`.length,
        userAgent,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as SepayWebhookBody;
    const paymentCode = normalizeSepayContent(body);
    const transferAmount = Number(body.transferAmount ?? body.amount ?? 0);
    const transferType = String(body.transferType ?? "");
    const sepayId = getSepayExternalId(body, paymentCode, transferAmount);

    console.log("[SePay Webhook] Received", {
      bodyKeys: Object.keys(body),
      paymentCode,
      transferAmount,
      transferType,
      sepayId,
      userAgent,
    });

    if (transferType && transferType !== "in") {
      console.log("[SePay Webhook] Ignored out-transfer", { transferType, sepayId });
      return NextResponse.json({ success: true, message: "Ignored out-transfer" });
    }

    const order = await findSepayOrderFromContent(paymentCode);
    if (!order || order.provider !== "sepay" || order.status !== "pending") {
      console.warn("[SePay Webhook] No pending order", {
        paymentCode,
        foundOrderId: order?.id,
        foundProvider: order?.provider,
        foundStatus: order?.status,
      });
      return NextResponse.json({ success: true, message: "Order not found" });
    }

    const existing = await findMockPaymentOrderByExternalId(sepayId);
    if (existing) {
      console.log("[SePay Webhook] Duplicate external id", {
        sepayId,
        existingOrderId: existing.id,
        existingStatus: existing.status,
      });
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
      console.log("[SePay Webhook] Order already handled", { orderId: order.id, sepayId });
      return NextResponse.json({ success: true, message: "Order already handled" });
    }

    console.log(`[SePay Webhook] Credited $${creditsEarned} to user ${userId}`);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[SePay Webhook] Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
