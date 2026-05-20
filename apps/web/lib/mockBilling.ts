type PricingPackage = {
  id: string;
  name: string;
  description: string;
  priceUSD: number;
  credits: number;
  isActive: boolean;
};

export type MockPaymentOrder = {
  id: string;
  workspaceId: string;
  amountUSD: number;
  amountVND: number;
  provider: "sepay";
  status: "pending" | "completed" | "expired";
  transferContent: string;
  qrUrl: string;
  bankId: string;
  accountNo: string;
  accountName: string;
  expiresAt: string;
  createdAt: string;
  creditsEarned?: number | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __tinoMockBilling:
    | {
        packages: PricingPackage[];
        orders: MockPaymentOrder[];
      }
    | undefined;
}

const defaultPackages: PricingPackage[] = [
  {
    id: "starter",
    name: "Starter Pack",
    description: "Phu hop de nap thu\nTop-up nhanh cho workspace nho",
    priceUSD: 5,
    credits: 5,
    isActive: true,
  },
  {
    id: "growth",
    name: "Growth Pack",
    description: "Can bang gia va credits\nHop cho nhu cau su dung hang ngay",
    priceUSD: 10,
    credits: 11,
    isActive: true,
  },
  {
    id: "pro",
    name: "Pro Pack",
    description: "Gia tot hon cho top-up lon\nUu tien cho team dang tang truong",
    priceUSD: 25,
    credits: 28,
    isActive: true,
  },
];

function getStore() {
  if (!global.__tinoMockBilling) {
    global.__tinoMockBilling = {
      packages: defaultPackages,
      orders: [],
    };
  }
  return global.__tinoMockBilling;
}

export function listBillingPackages() {
  return getStore().packages;
}

export function findBillingPackage(packageId: string) {
  return getStore().packages.find((pkg) => pkg.id === packageId) ?? null;
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

export function expireOldMockOrders(workspaceId: string, now = new Date()) {
  for (const order of getStore().orders) {
    if (
      order.workspaceId === workspaceId &&
      order.provider === "sepay" &&
      order.status === "pending" &&
      new Date(order.expiresAt) < now
    ) {
      order.status = "expired";
    }
  }
}
