import crypto from "crypto";
import { NextResponse } from "next/server";
import { findMockPaymentOrderByExternalId } from "@/lib/mockBilling";
import prisma from "@/lib/prisma";

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;

function getUserIdFromWorkspaceId(workspaceId: string) {
  return workspaceId.startsWith("user-") ? workspaceId.slice(5) : workspaceId;
}

function isPaidPolarEvent(event: any) {
  if (event?.type === "order.created" || event?.type === "order.updated" || event?.type === "order.paid") {
    return event?.data?.paid === true || event?.data?.status === "paid";
  }
  if (event?.type === "checkout.updated") {
    return event?.data?.status === "confirmed" || event?.data?.status === "succeeded";
  }
  return false;
}

function getPolarPaymentId(event: any) {
  const data = event?.data || {};
  return String(
    data.id ||
      data.order_id ||
      data.checkout_id ||
      data.client_secret ||
      "",
  );
}

function getPolarAmountUSD(data: any, metadata: Record<string, any>) {
  return parseFloat(
    String(
      metadata.amountUSD ||
        (typeof data.amount === "number" ? data.amount / 100 : 0) ||
        (typeof data.total_amount === "number" ? data.total_amount / 100 : 0),
    ),
  );
}

export async function POST(request: Request) {
  const rawBody = await request.arrayBuffer();
  const payload = Buffer.from(rawBody).toString("utf-8");

  const webhookId = request.headers.get("webhook-id") || request.headers.get("webhook-id".toLowerCase());
  const webhookTimestamp =
    request.headers.get("webhook-timestamp") || request.headers.get("webhook-timestamp".toLowerCase());
  const webhookSignature =
    request.headers.get("webhook-signature") || request.headers.get("webhook-signature".toLowerCase());

  if (!POLAR_WEBHOOK_SECRET) {
    console.error("[Polar Webhook] Missing POLAR_WEBHOOK_SECRET in ENV");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    console.warn("[Polar Webhook] Missing required headers");
    return NextResponse.json({ error: "Missing headers" }, { status: 401 });
  }

  const signedContent = `${webhookId}.${webhookTimestamp}.${payload}`;
  const secretPart = POLAR_WEBHOOK_SECRET.includes("_")
    ? POLAR_WEBHOOK_SECRET.split("_").pop() || POLAR_WEBHOOK_SECRET
    : POLAR_WEBHOOK_SECRET;
  const signatures = webhookSignature
    .split(" ")
    .map((segment) => segment.split(",")[1])
    .filter(Boolean);

  const trials = [
    Buffer.from(secretPart, "base64"),
    Buffer.from(secretPart, "utf-8"),
    Buffer.from(POLAR_WEBHOOK_SECRET, "utf-8"),
  ];

  const valid = trials.some((key) => {
    const hmac = crypto.createHmac("sha256", key);
    const computed = hmac.update(signedContent).digest("base64");
    return signatures.includes(computed);
  });

  if (!valid) {
    console.warn("[Polar Webhook] Signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(payload);
    if (!isPaidPolarEvent(event)) {
      return NextResponse.json({ success: true });
    }

    const orderData = event.data;
    const metadata = orderData.metadata || {};
    const workspaceId = String(metadata.workspaceId || "");
    const creditsNum = parseFloat(String(metadata.credits || "0"));
    const amountUSDNum = getPolarAmountUSD(orderData, metadata);
    const polarOrderId = getPolarPaymentId(event);

    if (!workspaceId || !creditsNum) {
      console.warn("[Polar Webhook] Missing metadata");
      return NextResponse.json({ success: true, message: "Missing metadata" });
    }

    const existing = await findMockPaymentOrderByExternalId(polarOrderId);
    if (existing) {
      console.log(`[Polar Webhook] Order ${polarOrderId} already processed`);
      return NextResponse.json({ success: true });
    }

    const userId = getUserIdFromWorkspaceId(workspaceId);

    try {
      await prisma.$transaction([
        prisma.paymentOrder.create({
          data: {
            workspaceId,
            userId,
            amountUSD: amountUSDNum,
            provider: "polar",
            status: "completed",
            externalId: polarOrderId,
            completedAt: new Date(),
            creditsEarned: creditsNum,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: creditsNum } },
        }),
      ]);
    } catch (error: any) {
      if (error?.code === "P2002") {
        return NextResponse.json({ success: true, alreadyProcessed: true });
      }
      throw error;
    }

    console.log(`[Polar Webhook] Processed ${event.type} ${polarOrderId}, added ${creditsNum} credits to user ${userId}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Polar Webhook] Server error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
