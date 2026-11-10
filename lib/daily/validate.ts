import type { WooOrder } from "@/lib/woo/orders";

const PAID = ["processing", "completed"];

export function validateOrders(orders: WooOrder[]) {
  const ids = new Set(orders.map((o) => o.id));
  const checks = [
    { label: "Duplicate orders", passed: ids.size === orders.length },
    {
      label: "Order IDs and dates",
      passed: orders.every((o) => o.id && !isNaN(Date.parse(o.date_created))),
    },
    { label: "Order totals", passed: orders.every((o) => o.total !== "") },
    { label: "Currency present", passed: orders.every((o) => !!o.currency) },
    {
      label: "Line items on paid orders",
      passed: orders
        .filter((o) => PAID.includes(o.status))
        .every((o) => o.line_items.length > 0),
    },
  ];
  return { checks, ok: checks.every((c) => c.passed) };
}