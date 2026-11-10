import type { dailyReview } from "@/lib/daily/review";

type Review = ReturnType<typeof dailyReview>;
type El = { type: string; props: Record<string, unknown>; children: string[] };
type Block = { id: string; el: El; extra?: Record<string, El> };

const money = (n: number) =>
  n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const text = (id: string, content: string): Block => ({
  id,
  el: { type: "Text", props: { content }, children: [] },
});

const table = (
  id: string,
  title: string,
  columns: string[],
  rows: (string | number)[][]
): Block => ({
  id,
  el: {
    type: "Table",
    props: { title, columns, rows: rows.map((r) => r.map(String)) },
    children: [],
  },
});

const bars = (id: string, title: string, labels: string[], values: number[]): Block => ({
  id,
  el: { type: "BarChart", props: { title, labels, values }, children: [] },
});

function metrics(id: string, columns: number, items: [string, string | number][]): Block {
  const extra: Record<string, El> = {};
  const children = items.map(([label, value], i) => {
    const key = `${id}_${i}`;
    extra[key] = { type: "MetricCard", props: { label, value: String(value) }, children: [] };
    return key;
  });
  return { id, el: { type: "Grid", props: { columns }, children }, extra };
}

function report(title: string, blocks: Block[]) {
  const elements: Record<string, El> = {};
  for (const b of blocks) {
    elements[b.id] = b.el;
    Object.assign(elements, b.extra ?? {});
  }
  return {
    root: "card",
    elements: {
      card: { type: "Card", props: { title }, children: blocks.map((b) => b.id) },
      ...elements,
    },
  };
}

export function connectionReport(day: string) {
  return report("Connection check", [
    table("conn", "WooCommerce connection", ["Check", "Result"], [
      ["Connection", "Connected"],
      ["API version", "wc/v3"],
      ["API access", "Read-only"],
      ["Review date", day],
    ]),
  ]);
}

export function ordersReport(day: string, count: number) {
  return report("Order retrieval", [
    text("day", `Review date: ${day}`),
    metrics("retrieval", 2, [
      ["Orders retrieved", count],
      ["Retrieval", "Complete"],
    ]),
  ]);
}

export function validationReport(checks: { label: string; passed: boolean }[]) {
  return report("Data validation", [
    table("checks", "Validation", ["Check", "Result"], checks.map((c) => [
      c.label,
      c.passed ? "Passed" : "Failed",
    ])),
  ]);
}

export function kpiReport(r: Review, prev: Review, lastWeek: Review) {
  const k = r.kpis;
  const row = (label: string, pick: (x: Review) => string | number) => [
    label,
    pick(r),
    pick(prev),
    pick(lastWeek),
  ];
  return report("Daily KPIs", [
    metrics("kpis", 5, [
      ["Total orders", k.totalOrders],
      ["Paid orders", k.paidOrders],
      ["Total order value (MYR)", money(k.totalValue)],
      ["Paid sales value (MYR)", money(k.paidSales)],
      ["Avg order value (MYR)", money(k.averageOrderValue)],
      ["Pending orders", k.pendingOrders],
      ["Failed orders", k.failedOrders],
      ["Cancelled orders", k.cancelledOrders],
      ["Refunded value (MYR)", money(k.refundedValue)],
      ["Products sold", k.productsSold],
    ]),
    table(
      "comparison",
      "Comparison",
      ["Measure", "Review day", "Day before", "Same weekday last week"],
      [
        row("Total orders", (x) => x.kpis.totalOrders),
        row("Paid sales (MYR)", (x) => money(x.kpis.paidSales)),
        row("Avg order value (MYR)", (x) => money(x.kpis.averageOrderValue)),
        row("Failed orders", (x) => x.kpis.failedOrders),
      ]
    ),
  ]);
}

export function statusReport(r: Review) {
  const labels = Object.keys(r.statusCounts);
  return report("Order status and exceptions", [
    bars("status_chart", "Order status", labels, labels.map((l) => r.statusCounts[l])),
    table(
      "exceptions",
      "Exceptions requiring attention",
      ["Issue", "Orders", "Priority"],
      r.exceptions.map((e) => [e.issue, e.orders, e.priority])
    ),
  ]);
}

export function productsReport(r: Review) {
  return report("Top products", [
    bars(
      "product_chart",
      "Top products by sales (MYR)",
      r.products.map((p) => p.name),
      r.products.map((p) => p.sales)
    ),
    table(
      "product_table",
      "Top 10 products",
      ["Product", "Units sold", "Sales (MYR)"],
      r.products.map((p) => [p.name, p.units, money(p.sales)])
    ),
  ]);
}

const LABELS = { positive: "Positive", attention: "Attention", opportunity: "Opportunity" };

export function findingsReport(r: Review) {
  const blocks = r.findings.length
    ? r.findings.map((f, i) => text(`finding_${i}`, `${LABELS[f.kind]}: ${f.text}`))
    : [text("finding_none", "No issues found.")];
  return report("Findings", blocks);
}

export function recommendationsReport(r: Review) {
  const blocks = r.recommendations.length
    ? [
        table(
          "recs",
          "Recommended actions",
          ["Priority", "Owner", "Action"],
          r.recommendations.map((x) => [x.priority, x.owner, x.action])
        ),
      ]
    : [text("recs_none", "No actions needed today.")];
  return report("Recommended actions", blocks);
}

export function failedOrdersReport(rows: (string | number)[][]) {
  return report("Failed orders", [
    rows.length
      ? table("failed", "Failed orders", ["Order", "Total (MYR)", "Payment"], rows)
      : text("failed_none", "No failed orders yesterday."),
  ]);
}

export function comparisonReport(r: Review, lastWeek: Review) {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : money(n));
  const diff = (a: number, b: number) => {
    const d = a - b;
    return `${d > 0 ? "+" : ""}${fmt(d)}`;
  };
  const rows: [string, number, number][] = [
    ["Total orders", r.kpis.totalOrders, lastWeek.kpis.totalOrders],
    ["Paid sales (MYR)", r.kpis.paidSales, lastWeek.kpis.paidSales],
    ["Avg order value (MYR)", r.kpis.averageOrderValue, lastWeek.kpis.averageOrderValue],
    ["Failed orders", r.kpis.failedOrders, lastWeek.kpis.failedOrders],
  ];
  return report("Yesterday vs last week", [
    table(
      "compare",
      "Yesterday vs last week",
      ["Measure", "Yesterday", "Last week", "Change"],
      rows.map(([label, a, b]) => [label, fmt(a), fmt(b), diff(a, b)])
    ),
  ]);
}