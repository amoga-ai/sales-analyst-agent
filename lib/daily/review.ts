import type { WooOrder } from "@/lib/woo/orders";

const PAID = ["processing", "completed"];
const cents = (value: string) => Math.round(parseFloat(value || "0") * 100);
const money = (c: number) => c / 100;

export function dailyReview(orders: WooOrder[]) {
  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  }
  const count = (status: string) => statusCounts[status] ?? 0;

  const paid = orders.filter((o) => PAID.includes(o.status));
  const totalCents = orders.reduce((s, o) => s + cents(o.total), 0);
  const paidCents = paid.reduce((s, o) => s + cents(o.total), 0);
  const refundCents = orders.reduce(
    (s, o) => s + o.refunds.reduce((r, x) => r + Math.abs(cents(x.total)), 0),
    0
  );

  const byProduct = new Map<number, { name: string; units: number; salesCents: number }>();
  for (const o of paid) {
    for (const li of o.line_items) {
      const row = byProduct.get(li.product_id) ?? { name: li.name, units: 0, salesCents: 0 };
      row.units += li.quantity;
      row.salesCents += cents(li.total);
      byProduct.set(li.product_id, row);
    }
  }
  const products = [...byProduct.values()]
    .sort((a, b) => b.salesCents - a.salesCents)
    .slice(0, 10)
    .map((p) => ({ name: p.name, units: p.units, sales: money(p.salesCents) }));

  const kpis = {
    totalOrders: orders.length,
    paidOrders: paid.length,
    totalValue: money(totalCents),
    paidSales: money(paidCents),
    averageOrderValue: paid.length ? money(Math.round(paidCents / paid.length)) : 0,
    pendingOrders: count("pending"),
    failedOrders: count("failed"),
    cancelledOrders: count("cancelled"),
    refundedValue: money(refundCents),
    productsSold: byProduct.size,
  };

  const exceptions = [
    { issue: "Failed payments", orders: count("failed"), priority: "High" },
    { issue: "Orders on hold", orders: count("on-hold"), priority: "Medium" },
    { issue: "Pending payment", orders: count("pending"), priority: "Medium" },
    { issue: "Still processing", orders: count("processing"), priority: "Medium" },
  ].filter((e) => e.orders > 0);

  const findings: { kind: "positive" | "attention" | "opportunity"; text: string }[] = [];
  if (products[0]) {
    findings.push({
      kind: "positive",
      text: `${products[0].name} generated the highest sales value (${products[0].sales}).`,
    });
  }
  if (kpis.failedOrders) {
    findings.push({ kind: "attention", text: `${kpis.failedOrders} failed orders need investigation.` });
  }
  if (kpis.pendingOrders) {
    findings.push({ kind: "attention", text: `${kpis.pendingOrders} orders are still pending payment.` });
    findings.push({ kind: "opportunity", text: "Following up on pending orders could recover sales." });
  }
  if (kpis.refundedValue) {
    findings.push({ kind: "attention", text: `Refunds total ${kpis.refundedValue}.` });
  }

  const recommendations: {
    priority: "High" | "Medium" | "Normal";
    owner: string;
    action: string;
  }[] = [];
  if (kpis.failedOrders) {
    recommendations.push({
      priority: "High",
      owner: "Finance / Payment Operations",
      action: `Review ${kpis.failedOrders} failed orders`,
    });
  }
  if (count("processing")) {
    recommendations.push({
      priority: "High",
      owner: "Operations",
      action: `Check ${count("processing")} orders still processing`,
    });
  }
  if (kpis.pendingOrders) {
    recommendations.push({
      priority: "Medium",
      owner: "Sales / Customer Service",
      action: `Review ${kpis.pendingOrders} pending orders`,
    });
  }
  if (products[0]) {
    recommendations.push({
      priority: "Normal",
      owner: "Merchandising",
      action: `Review ${products[0].name} sales performance`,
    });
  }

  return { kpis, statusCounts, exceptions, products, findings, recommendations };
}