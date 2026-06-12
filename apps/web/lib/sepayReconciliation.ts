import { getSettings } from "@/lib/localDb";
import {
  findMockPaymentOrderByExternalId,
  getMockPaymentOrder,
  type MockPaymentOrder,
} from "@/lib/mockBilling";
import prisma from "@/lib/prisma";

const SEPAY_API_BASE_URL = process.env.SEPAY_API_BASE_URL || "https://my.sepay.vn/userapi";

type SepayTransaction = {
  id?: string | number;
  reference_number?: string | null;
  code?: string | null;
  transaction_content?: string | null;
  content?: string | null;
  amount_in?: string | number | null;
  account_number?: string | null;
};

type SepayTransactionsResponse = {
  transactions?: SepayTransaction[];
};

function getUserIdFromWorkspaceId(workspaceId: string) {
  return workspaceId.startsWith("user-") ? workspaceId.slice(5) : workspaceId;
}

function normalizeText(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function getTransactionAmount(transaction: SepayTransaction) {
  return Number(transaction.amount_in ?? 0);
}

function getTransactionExternalId(transaction: SepayTransaction) {
  return String(transaction.id ?? transaction.reference_number ?? "").trim();
}

function transactionMatchesOrder(transaction: SepayTransaction, order: MockPaymentOrder) {
  const transferContent = order.transferContent?.toLowerCase();
  if (!transferContent) return false;
  const searchable = [
    transaction.code,
    transaction.transaction_content,
    transaction.content,
    transaction.reference_number,
  ]
    .map(normalizeText)
    .join(" ");
  const amountMatches =
    typeof order.amountVND !== "number" ||
    Math.abs(order.amountVND - getTransactionAmount(transaction)) <= 10;
  return amountMatches && searchable.includes(transferContent);
}

export async function completeSepayOrderFromTransaction(
  order: MockPaymentOrder,
  transaction: SepayTransaction,
) {
  const externalId = getTransactionExternalId(transaction);
  if (!externalId) return null;

  const existing = await findMockPaymentOrderByExternalId(externalId);
  if (existing && existing.id !== order.id) return null;

  const settings = await getSettings();
  const creditsEarned = parseFloat((order.amountUSD * (settings.topupExchangeRate || 1)).toFixed(2));
  const userId = getUserIdFromWorkspaceId(order.workspaceId);
  const completedAt = new Date();

  const transactionResult = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.paymentOrder.updateMany({
      where: { id: order.id, status: "pending" },
      data: {
        status: "completed",
        externalId,
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

  if (!transactionResult) return null;
  return getMockPaymentOrder(order.id);
}

export async function reconcileSepayOrder(order: MockPaymentOrder) {
  const apiToken = process.env.SEPAY_API_TOKEN;
  if (!apiToken || order.provider !== "sepay" || order.status !== "pending") return order;

  const params = new URLSearchParams();
  if (process.env.SEPAY_ACCOUNT_NO) params.set("account_number", process.env.SEPAY_ACCOUNT_NO);
  if (typeof order.amountVND === "number") params.set("amount_in", String(order.amountVND));
  params.set("limit", "20");

  const response = await fetch(`${SEPAY_API_BASE_URL}/transactions/list?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.warn("[SePay Reconcile] Transaction lookup failed", {
      status: response.status,
      orderId: order.id,
    });
    return order;
  }

  const payload = (await response.json().catch(() => null)) as SepayTransactionsResponse | null;
  const transaction = payload?.transactions?.find((entry) => transactionMatchesOrder(entry, order));
  if (!transaction) return order;

  const completedOrder = await completeSepayOrderFromTransaction(order, transaction);
  return completedOrder || order;
}
