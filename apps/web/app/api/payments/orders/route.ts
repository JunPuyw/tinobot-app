import { NextRequest, NextResponse } from "next/server";
import { getMockPaymentOrder, listMockPaymentOrders } from "@/lib/mockBilling";
import { reconcileSepayOrder } from "@/lib/sepayReconciliation";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const orderId = searchParams.get("id");

  if (orderId) {
    const order = await getMockPaymentOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const reconciledOrder = await reconcileSepayOrder(order);
    return NextResponse.json({ order: reconciledOrder });
  }

  const workspaceId = searchParams.get("workspaceId") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "5", 10));
  const allOrders = await listMockPaymentOrders(workspaceId);
  const totalPages = Math.max(1, Math.ceil(allOrders.length / limit));
  const start = (page - 1) * limit;
  const orders = allOrders.slice(start, start + limit);

  return NextResponse.json({
    orders,
    total: allOrders.length,
    totalPages,
    page,
    limit,
  });
}
