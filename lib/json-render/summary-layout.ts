// lib/json-render/summary-layout.ts: Builds a json-render spec for the daily sales summary, so the Eve No AI screen can open it in the side panel.
export function dailySummarySpec(summary: { date: string; total: number; orders: number }) {
  return {
    root: "card",
    elements: {
      card: { type: "Card", props: { title: `Daily sales, ${summary.date}` }, children: ["kpis"] },
      kpis: { type: "Grid", props: { columns: 2 }, children: ["total", "orders"] },
      total: { type: "MetricCard", props: { label: "Total sales", value: String(summary.total) }, children: [] },
      orders: { type: "MetricCard", props: { label: "Orders", value: String(summary.orders) }, children: [] },
    },
  };
}