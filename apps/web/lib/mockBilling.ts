import prisma from "@/lib/prisma";

export type MockPaymentOrder = {
  id: string;
  workspaceId: string;
  userId?: string | null;
  amountUSD: number;
  amountVND?: number | null;
  provider: "sepay" | "polar";
  status: "pending" | "completed" | "expired";
  transferContent?: string | null;
  qrUrl?: string | null;
  bankId?: string | null;
  accountNo?: string | null;
  accountName?: string | null;
  expiresAt?: Date | string | null;
  externalId?: string | null;
  createdAt: Date | string;
  completedAt?: Date | string | null;
  creditsEarned?: number | null;
};

type PaymentOrderRecord = Omit<MockPaymentOrder, "provider" | "status"> & {
  provider: string;
  status: string;
};

function normalizeOrder(order: PaymentOrderRecord): MockPaymentOrder {
  return {
    ...order,
    provider: order.provider as "sepay" | "polar",
    status: order.status as "pending" | "completed" | "expired",
  };
}

export function serializePaymentOrder(order: MockPaymentOrder) {
  return {
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
  };
}

export async function createMockPaymentOrder(
  order: Omit<MockPaymentOrder, "id" | "createdAt">,
) {
  const createdOrder = await prisma.paymentOrder.create({
    data: {
      ...order,
      expiresAt: order.expiresAt ? new Date(order.expiresAt) : null,
      completedAt: order.completedAt ? new Date(order.completedAt) : null,
    },
  });
  return normalizeOrder(createdOrder);
}

export async function listMockPaymentOrders(workspaceId?: string) {
  const orders = await prisma.paymentOrder.findMany({
    where: workspaceId ? { workspaceId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(normalizeOrder);
}

export async function findReusableSepayPaymentOrder(workspaceId: string, amountVND: number) {
  const order = await prisma.paymentOrder.findFirst({
    where: {
      workspaceId,
      provider: "sepay",
      status: "pending",
      amountVND,
      expiresAt: { gt: new Date(Date.now() + 30 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  return order ? normalizeOrder(order) : null;
}

export async function getMockPaymentOrder(orderId: string) {
  const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  return order ? normalizeOrder(order) : null;
}

export async function findMockPaymentOrderByTransferContent(transferContent: string) {
  const order = await prisma.paymentOrder.findUnique({ where: { transferContent } });
  return order ? normalizeOrder(order) : null;
}

export async function findMockPaymentOrderByExternalId(externalId: string) {
  if (!externalId) return null;
  const order = await prisma.paymentOrder.findUnique({ where: { externalId } });
  return order ? normalizeOrder(order) : null;
}

export async function markMockPaymentOrderCompleted(
  orderId: string,
  updates: Pick<MockPaymentOrder, "externalId" | "creditsEarned" | "completedAt">,
) {
  const updated = await prisma.paymentOrder.updateMany({
    where: { id: orderId, status: "pending" },
    data: {
      status: "completed",
      externalId: updates.externalId,
      creditsEarned: updates.creditsEarned,
      completedAt: updates.completedAt ? new Date(updates.completedAt) : new Date(),
    },
  });
  if (updated.count === 0) return null;
  return getMockPaymentOrder(orderId);
}

export async function expireOldMockOrders(workspaceId: string, now = new Date()) {
  await prisma.paymentOrder.updateMany({
    where: {
      workspaceId,
      provider: "sepay",
      status: "pending",
      expiresAt: { lt: now },
    },
    data: { status: "expired" },
  });
}
