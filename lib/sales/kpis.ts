import { fetchWooOrders, type WooOrder } from "@/lib/woo/orders";

const SALES_STATUSES = ["completed", "processing"];

const toCents = (value: string) => Math.round(parseFloat(value || "0") * 100);

export async function salesKpis(from: string, to: string) {
  const orders: WooOrder[] = await fetchWooOrders(from, to);

  const statusCounts: Record<string, number> = {};
  let salesCount = 0;
  let salesCents = 0;
  let discountCents = 0;

  for (const order of orders) {
    statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
    if (SALES_STATUSES.includes(order.status)) {
      salesCount += 1;
      salesCents += toCents(order.total);
      discountCents += toCents(order.discount_total);
    }
  }

  return {
    orderCount: salesCount,
    totalSales: salesCents / 100,
    averageOrderValue: salesCount ? Math.round(salesCents / salesCount) / 100 : 0,
    totalDiscount: discountCents / 100,
    statusCounts,
  };
}