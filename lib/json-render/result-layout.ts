type Period = { from: string; to: string };

type Kpis = {
  orderCount: number;
  totalSales: number;
  averageOrderValue: number | null;
  totalDiscount: number;
  statusCounts: Record<string, number>;
};

const money = (n: number | null) =>
  n === null
    ? "—"
    : n.toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export function buildResultSpec(kpis: Kpis, period: Period) {
  const statusEntries = Object.entries(kpis.statusCounts).sort(
    (a, b) => b[1] - a[1]
  );

  return {
    root: "card",
    elements: {
      card: {
        type: "Card",
        props: { title: "Sales performance" },
        children: ["subtitle", "kpis", "chart", "table"],
      },
      subtitle: {
        type: "Text",
        props: {
          content: `${period.from} to ${period.to} · Completed and processing orders only`,
        },
        children: [],
      },
      kpis: {
        type: "Grid",
        props: { columns: 4 },
        children: ["total", "orders", "average", "discount"],
      },
      total: {
        type: "MetricCard",
        props: { label: "Total sales (MYR)", value: money(kpis.totalSales) },
        children: [],
      },
      orders: {
        type: "MetricCard",
        props: { label: "Orders", value: String(kpis.orderCount) },
        children: [],
      },
      average: {
        type: "MetricCard",
        props: {
          label: "Avg order value (MYR)",
          value: money(kpis.averageOrderValue),
        },
        children: [],
      },
      discount: {
        type: "MetricCard",
        props: { label: "Discounts (MYR)", value: money(kpis.totalDiscount) },
        children: [],
      },
      chart: {
        type: "BarChart",
        props: {
          title: "Orders by status",
          labels: statusEntries.map(([s]) => s),
          values: statusEntries.map(([, c]) => c),
        },
        children: [],
      },
      table: {
        type: "Table",
        props: {
          title: "Status breakdown",
          columns: ["Status", "Orders"],
          rows: statusEntries.map(([s, c]) => [s, String(c)]),
        },
        children: [],
      },
    },
  };
}