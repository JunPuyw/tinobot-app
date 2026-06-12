import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";
import {
  createMockPaymentOrder,
  expireOldMockOrders,
  findReusableSepayPaymentOrder,
  listMockPaymentOrders,
  serializePaymentOrder,
} from "@/lib/mockBilling";
import { getPricingPackageById } from "@/lib/pricingPackages";
import { getPortalUser } from "@/lib/userAuth";

const SEPAY_BANK_ID = process.env.SEPAY_BANK_ID || "Vietcombank";
const SEPAY_ACCOUNT_NO = process.env.SEPAY_ACCOUNT_NO || "9999999999";
const SEPAY_ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME || "TINOBOT PAY";
const SEPAY_API_BASE_URL = process.env.SEPAY_API_BASE_URL || "https://my.sepay.vn/userapi";
const SEPAY_VA_PROVIDER_PATH = process.env.SEPAY_VA_PROVIDER_PATH || "bidv";
const SEPAY_QR_TEMPLATE = process.env.SEPAY_QR_TEMPLATE || "qronly";
const SEPAY_QR_BANK_ALIASES: Record<string, string> = {
  vietinbank: "VietinBank",
  vietin: "VietinBank",
  icb: "VietinBank",
};

type CheckoutRequestBody = {
  workspaceId?: string;
  packageId?: string;
  customAmountUSD?: string | number;
  customAmountVND?: string | number;
};

type PortalUser = {
  id: string;
  workspaceId?: string;
};

type SepayVaOrderData = {
  order_id?: string;
  order_code?: string;
  va_number?: string;
  va_holder_name?: string;
  amount?: number;
  status?: string;
  bank_name?: string;
  account_holder_name?: string;
  account_number?: string;
  expired_at?: string;
  qr_code_url?: string;
  qr_code?: string;
};

type SepayVaOrderResponse = {
  status?: string;
  message?: string;
  data?: SepayVaOrderData;
};

function getMissingSepayConfig() {
  return [
    ["SEPAY_BANK_ID", process.env.SEPAY_BANK_ID],
    ["SEPAY_ACCOUNT_NO", process.env.SEPAY_ACCOUNT_NO],
    ["SEPAY_ACCOUNT_NAME", process.env.SEPAY_ACCOUNT_NAME],
    ["SEPAY_WEBHOOK_KEY", process.env.SEPAY_WEBHOOK_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function getMissingSepayVaConfig() {
  return [
    ["SEPAY_API_TOKEN", process.env.SEPAY_API_TOKEN],
    ["SEPAY_VA_BANK_ACCOUNT_ID", process.env.SEPAY_VA_BANK_ACCOUNT_ID],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function isSepayVaEnabled() {
  return getMissingSepayVaConfig().length === 0 && SEPAY_VA_PROVIDER_PATH.toLowerCase() === "bidv";
}

function getSepayQrBankId(bankId: string) {
  const normalized = bankId.trim().toLowerCase();
  return SEPAY_QR_BANK_ALIASES[normalized] || bankId;
}

function generateTransferCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "TINO";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function parseSepayDate(value?: string) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAmount(value: string | number) {
  return typeof value === "number" ? value : parseFloat(value);
}

async function createSepayVaOrder(amountVND: number, transferContent: string) {
  const bankAccountId = process.env.SEPAY_VA_BANK_ACCOUNT_ID;
  const apiToken = process.env.SEPAY_API_TOKEN;
  if (!bankAccountId || !apiToken) return null;

  const response = await fetch(
    `${SEPAY_API_BASE_URL}/${SEPAY_VA_PROVIDER_PATH}/${encodeURIComponent(bankAccountId)}/orders`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountVND,
        order_code: transferContent,
        duration: 15 * 60,
        with_qrcode: true,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as SepayVaOrderResponse | null;
  if (!response.ok || payload?.status !== "success" || !payload.data) {
    console.error("[SePay Checkout] VA order create failed", {
      status: response.status,
      message: payload?.message,
    });
    throw new Error(payload?.message || `Failed to create SePay VA order (${response.status})`);
  }

  return payload.data;
}

export async function POST(request: Request) {
  const user = (await getPortalUser()) as PortalUser | null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as CheckoutRequestBody;
  const workspaceId = request.headers.get("X-Workspace-Id") || body.workspaceId || user.workspaceId || `user-${user.id}`;
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace required" }, { status: 400 });
  }

  try {
    const missingConfig = getMissingSepayConfig();
    if (missingConfig.length > 0) {
      console.error("[SePay Checkout] Missing ENV config:", missingConfig);
      return NextResponse.json(
        { error: `SePay is not configured on server. Missing: ${missingConfig.join(", ")}` },
        { status: 500 },
      );
    }

    const settings = await getSettings();
    const vndToUsdRate = Number(settings.vndUsdRate || process.env.VND_TO_USD_RATE || 25000);

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
      amountUSD = parseAmount(body.customAmountUSD);
      amountVND = Math.max(10_000, Math.round(amountUSD * vndToUsdRate));
      amountUSD = parseFloat((amountVND / vndToUsdRate).toFixed(2));
    } else if (body.customAmountVND) {
      amountVND = Math.max(10_000, Math.trunc(parseAmount(body.customAmountVND)));
      amountUSD = parseFloat((amountVND / vndToUsdRate).toFixed(2));
    } else {
      return NextResponse.json(
        { error: "packageId, customAmountUSD, or customAmountVND is required" },
        { status: 400 },
      );
    }

    await expireOldMockOrders(workspaceId);

    const reusableOrder = await findReusableSepayPaymentOrder(workspaceId, amountVND);
    if (reusableOrder) {
      return NextResponse.json({ order: serializePaymentOrder(reusableOrder), reused: true });
    }

    let transferContent = generateTransferCode();
    for (let attempts = 0; attempts < 5; attempts++) {
      const existing = (await listMockPaymentOrders()).find(
        (order) => order.transferContent === transferContent,
      );
      if (!existing) break;
      transferContent = generateTransferCode();
    }

    const sepayVaOrder = isSepayVaEnabled()
      ? await createSepayVaOrder(amountVND, transferContent)
      : null;
    const qrUrl =
      sepayVaOrder?.qr_code_url ||
      sepayVaOrder?.qr_code ||
      `https://qr.sepay.vn/img?bank=${encodeURIComponent(getSepayQrBankId(SEPAY_BANK_ID))}&acc=${SEPAY_ACCOUNT_NO}&template=${encodeURIComponent(SEPAY_QR_TEMPLATE)}&amount=${amountVND}&des=${encodeURIComponent(`SEVQR ${transferContent}`)}`;
    const expiresAt = parseSepayDate(sepayVaOrder?.expired_at) || new Date(Date.now() + 15 * 60 * 1000);

    const order = await createMockPaymentOrder({
      workspaceId,
      userId: user.id,
      amountUSD,
      amountVND,
      provider: "sepay",
      status: "pending",
      transferContent,
      qrUrl,
      bankId: sepayVaOrder?.bank_name || SEPAY_BANK_ID,
      accountNo: sepayVaOrder?.va_number || sepayVaOrder?.account_number || SEPAY_ACCOUNT_NO,
      accountName: sepayVaOrder?.va_holder_name || sepayVaOrder?.account_holder_name || SEPAY_ACCOUNT_NAME,
      expiresAt,
      creditsEarned: null,
    });

    return NextResponse.json({ order: serializePaymentOrder(order), reused: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create SePay order";
    console.error("[POST create-order] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
