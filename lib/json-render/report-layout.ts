// lib/json-render/report-layout.ts: Builds json-render specs for WooCommerce report results, so AgentChat can draw them.
type SalesDay = { sales: string; orders: number };

// Sales report: total sales and orders as number tiles, then a table of the days that had orders.
function salesSpec(output: unknown) {
  const report = (Array.isArray(output) ? output[0] : output) as
    | { total_sales?: string; total_orders?: number; totals?: Record<string, SalesDay> }
    | undefined;
  const rows = Object.entries(report?.totals ?? {})
    .filter(([, d]) => d.orders > 0)
    .map(([day, d]) => [day, d.sales, String(d.orders)]);
  const body = rows.length
    ? { type: "Table", props: { title: "Days with orders", columns: ["Day", "Sales", "Orders"], rows }, children: [] }
    : { type: "Text", props: { content: "No sales in this period." }, children: [] };
  return {
    root: "card",
    elements: {
      card: { type: "Card", props: { title: "Sales" }, children: ["kpis", "body"] },
      kpis: { type: "Grid", props: { columns: 2 }, children: ["sales", "orders"] },
      sales: { type: "MetricCard", props: { label: "Total sales", value: report?.total_sales ?? "0.00" }, children: [] },
      orders: { type: "MetricCard", props: { label: "Orders", value: String(report?.total_orders ?? 0) }, children: [] },
      body,
    },
  };
}

// Order, product, customer and coupon totals: rows of name and total, drawn as a bar chart.
function totalsSpec(tool: string, output: unknown) {
  const titles: Record<string, string> = {
    woocommerce__get_orders_report: "Orders by status",
    woocommerce__get_products_report: "Products by type",
    woocommerce__get_customers_report: "Customers",
    woocommerce__get_coupons_report: "Coupons by type",
  };
  const rows = (Array.isArray(output) ? output : []) as { name: string; total: number }[];
  const shown = rows.filter((r) => r.total > 0);
  return {
    root: "card",
    elements: {
      card: { type: "Card", props: { title: titles[tool] ?? "Report" }, children: ["chart"] },
      chart: {
        type: "BarChart",
        props: {
          title: "",
          labels: shown.map((r) => r.name),
          values: shown.map((r) => r.total),
        },
        children: [],
      },
    },
  };
}

// Picks the right layout for each WooCommerce report tool.
export function reportSpec(tool: string, output: unknown) {
  if (tool === "woocommerce__get_sales_report") return salesSpec(output);
  return totalsSpec(tool, output);
}