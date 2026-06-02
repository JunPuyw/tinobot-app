import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";
import {
  createMockPaymentOrder,
  expireOldMockOrders,
  listMockPaymentOrders,
} from "@/lib/mockBilling";
import { getPricingPackageById } from "@/lib/pricingPackages";
import { getPortalUser } from "@/lib/userAuth";

const SEPAY_BANK_ID = process.env.SEPAY_BANK_ID || "Vietcombank";
const SEPAY_ACCOUNT_NO = process.env.SEPAY_ACCOUNT_NO || "9999999999";
const SEPAY_ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME || "TINOBOT PAY";

function generateTransferCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "TINO";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: Request) {
  const user = await getPortalUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = request.headers.get("X-Workspace-Id") || (user as any).workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace required" }, { status: 400 });
  }

  try {
    const settings = await getSettings();
    const vndToUsdRate = Number(settings.vndUsdRate || process.env.VND_TO_USD_RATE || 25000);
    const body = await request.json();

    let amountVND: number;
    let amountUSD: number;

    if (body.packageId) {
      const pkg = await getPricingPackageById(body.packageId);
      if (!pkg) {
        return NextResponse.json({ error: "Package not found" }, { status: 404 });
      }
      amountUSD = pkg.priceUSD;
      amountVND = Math.round(amountUSD * vndToUsdRate);
    } else if (body.customAmountUSD) {
      amountUSD = parseFloat(body.customAmountUSD);
      amountVND = Math.max(10_000, Math.round(amountUSD * vndToUsdRate));
      amountUSD = parseFloat((amountVND / vndToUsdRate).toFixed(2));
    } else if (body.customAmountVND) {
      amountVND = Math.max(10_000, parseInt(body.customAmountVND, 10));
      amountUSD = parseFloat((amountVND / vndToUsdRate).toFixed(2));
    } else {
      return NextResponse.json(
        { error: "packageId, customAmountUSD, or customAmountVND is required" },
        { status: 400 },
      );
    }

    let transferContent = generateTransferCode();
    for (let attempts = 0; attempts < 5; attempts++) {
      const existing = listMockPaymentOrders().find(
        (order) => order.transferContent === transferContent,
      );
      if (!existing) break;
      transferContent = generateTransferCode();
    }

    const qrUrl = `https://qr.sepay.vn/img?acc=${SEPAY_ACCOUNT_NO}&bank=${encodeURIComponent(SEPAY_BANK_ID)}&amount=${amountVND}&des=${encodeURIComponent(transferContent)}&template=compact`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    expireOldMockOrders(workspaceId);

    const order = createMockPaymentOrder({
      workspaceId,
      amountUSD,
      amountVND,
      provider: "sepay",
      status: "pending",
      transferContent,
      qrUrl,
      bankId: SEPAY_BANK_ID,
      accountNo: SEPAY_ACCOUNT_NO,
      accountName: SEPAY_ACCOUNT_NAME,
      expiresAt: expiresAt.toISOString(),
      creditsEarned: null,
    });

    return NextResponse.json({
      order: {
        id: order.id,
        amountVND: order.amountVND,
        amountUSD: order.amountUSD,
        transferContent: order.transferContent,
        status: order.status,
        qrUrl: order.qrUrl,
        bankId: order.bankId,
        accountNo: order.accountNo,
        accountName: order.accountName,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
      },
    });
  } catch (err: any) {
    console.error("[POST create-order] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
