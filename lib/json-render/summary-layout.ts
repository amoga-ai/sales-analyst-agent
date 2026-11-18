// lib/json-render/summary-layout.ts: Builds a json-render spec for the daily sales summary and its top orders table, so the Eve No AI screen can open it in the side panel.
type TopOrder = { id: number; date: string; status: string; total: number; currency: string; payment: string; items: number };

export function dailySummarySpec(summary: { date: string; total: number; orders: number; topOrders?: TopOrder[] }) {
  const top = summary.topOrders ?? [];
  return {
    root: "card",
    elements: {
      card: { type: "Card", props: { title: `Daily sales, ${summary.date}` }, children: ["kpis", "top"] },
      kpis: { type: "Grid", props: { columns: 2 }, children: ["total", "orders"] },
      total: { type: "MetricCard", props: { label: "Total sales", value: String(summary.total) }, children: [] },
      orders: { type: "MetricCard", props: { label: "Orders", value: String(summary.orders) }, children: [] },
      top: {
        type: "Table",
        props: {
          title: "Top orders",
          columns: ["Order", "Date", "Status", "Total", "Currency", "Payment", "Items"],
          rows: top.map((o) => [String(o.id), o.date, o.status, String(o.total), o.currency, o.payment, String(o.items)]),
        },
        children: [],
      },
    },
  };
}