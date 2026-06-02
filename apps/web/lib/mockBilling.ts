export type MockPaymentOrder = {
  id: string;
  workspaceId: string;
  amountUSD: number;
  amountVND?: number;
  provider: "sepay" | "polar";
  status: "pending" | "completed" | "expired";
  transferContent?: string;
  qrUrl?: string;
  bankId?: string;
  accountNo?: string;
  accountName?: string;
  expiresAt?: string;
  externalId?: string;
  createdAt: string;
  completedAt?: string;
  creditsEarned?: number | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __tinoMockBilling:
    | {
        orders: MockPaymentOrder[];
      }
    | undefined;
}

function getStore() {
  if (!global.__tinoMockBilling) {
    global.__tinoMockBilling = {
      orders: [],
    };
  }
  return global.__tinoMockBilling;
}

export function createMockPaymentOrder(
  order: Omit<MockPaymentOrder, "id" | "createdAt">,
) {
  const createdOrder: MockPaymentOrder = {
    ...order,
    id: `ord_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
  getStore().orders.unshift(createdOrder);
  return createdOrder;
}

export function listMockPaymentOrders(workspaceId?: string) {
  const orders = getStore().orders;
  if (!workspaceId) return orders;
  return orders.filter((order) => order.workspaceId === workspaceId);
}

export function getMockPaymentOrder(orderId: string) {
  return getStore().orders.find((order) => order.id === orderId) ?? null;
}

export function findMockPaymentOrderByTransferContent(transferContent: string) {
  return (
    getStore().orders.find(
      (order) =>
        order.transferContent?.toLowerCase() === transferContent.toLowerCase(),
    ) ?? null
  );
}

export function findMockPaymentOrderByExternalId(externalId: string) {
  return (
    getStore().orders.find((order) => order.externalId === externalId) ?? null
  );
}

export function markMockPaymentOrderCompleted(
  orderId: string,
  updates: Pick<MockPaymentOrder, "externalId" | "creditsEarned" | "completedAt">,
) {
  const order = getStore().orders.find((entry) => entry.id === orderId);
  if (!order) return null;
  order.status = "completed";
  order.externalId = updates.externalId;
  order.creditsEarned = updates.creditsEarned;
  order.completedAt = updates.completedAt;
  return order;
}

export function expireOldMockOrders(workspaceId: string, now = new Date()) {
  for (const order of getStore().orders) {
    if (
      order.workspaceId === workspaceId &&
      order.provider === "sepay" &&
      order.status === "pending" &&
      order.expiresAt &&
      new Date(order.expiresAt) < now
    ) {
      order.status = "expired";
    }
  }
}
