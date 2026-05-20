import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;

export async function POST(request: Request) {
  // Ensure raw body for signature verification
  const rawBody = await request.arrayBuffer();
  const payload = Buffer.from(rawBody).toString("utf-8");

  const webhookId = request.headers.get("webhook-id") || request.headers.get("webhook-id".toLowerCase());
  const webhookTimestamp = request.headers.get("webhook-timestamp") || request.headers.get("webhook-timestamp".toLowerCase());
  const webhookSignature = request.headers.get("webhook-signature") || request.headers.get("webhook-signature".toLowerCase());

  if (!POLAR_WEBHOOK_SECRET) {
    console.error("[Polar Webhook] Missing POLAR_WEBHOOK_SECRET in ENV");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    console.warn("[Polar Webhook] Missing required headers");
    return NextResponse.json({ error: "Missing headers" }, { status: 401 });
  }

  // Verify signature (try a few key formats)
  const signedContent = `${webhookId}.${webhookTimestamp}.${payload}`;
  const secretPart = POLAR_WEBHOOK_SECRET.includes("_") ? POLAR_WEBHOOK_SECRET.split("_").pop()! : POLAR_WEBHOOK_SECRET;
  const signatures = webhookSignature.split(" ").map(s => s.split(",")[1]).filter(Boolean);

  const trials = [
    { name: "Base64 decoded", key: Buffer.from(secretPart, "base64") },
    { name: "Raw secretPart", key: Buffer.from(secretPart, "utf-8") },
    { name: "Full secret", key: Buffer.from(POLAR_WEBHOOK_SECRET, "utf-8") },
  ];

  let valid = false;
  for (const t of trials) {
    const hmac = crypto.createHmac("sha256", t.key);
    const computed = hmac.update(signedContent).digest("base64");
    if (signatures.includes(computed)) {
      valid = true;
      break;
    }
  }

  if (!valid) {
    console.warn("[Polar Webhook] Signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(payload);
    if (event.type !== "order.created") {
      return NextResponse.json({ success: true });
    }
    const orderData = event.data;
    const metadata = orderData.metadata || {};
    const { workspaceId, credits, amountUSD, packageName } = metadata;
    if (!workspaceId || !credits) {
      console.warn("[Polar Webhook] Missing metadata");
      return NextResponse.json({ success: true, message: "Missing metadata" });
    }
    const creditsNum = parseFloat(credits);
    const amountUSDNum = parseFloat(amountUSD || (orderData.amount / 100).toString());
    const polarOrderId = orderData.id;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.paymentOrder.findUnique({ where: { externalId: polarOrderId } });
      if (existing) return { alreadyProcessed: true };
      const newOrder = await tx.paymentOrder.create({
        data: {
          workspaceId,
          amountUSD: amountUSDNum,
          status: "completed",
          provider: "polar",
          externalId: polarOrderId,
          creditsEarned: creditsNum,
          completedAt: new Date(),
        },
      });
      await tx.workspace.update({ where: { id: workspaceId }, data: { credits: { increment: creditsNum } } });
      return { alreadyProcessed: false, orderId: newOrder.id, creditsNum };
    });

    if (result.alreadyProcessed) {
      console.log(`[Polar Webhook] Order ${polarOrderId} already processed`);
    } else {
      console.log(`[Polar Webhook] Processed order ${polarOrderId}, added ${result.creditsNum} credits`);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Polar Webhook] Server error", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
