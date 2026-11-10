import { FatalError } from "workflow";

type Range = { from: string; to: string };

type WooOrder = {
  id: number;
  status: string;
  date_created: string;
  total: string;
  discount_total: string;
  billing?: { country?: string };
};

const SALES_STATUSES = new Set(["completed", "processing"]);

const toCents = (v: string | number | undefined | null) =>
  Math.round(Number(v ?? 0) * 100);

export async function salesReviewWorkflow(range: Range) {
  "use workflow";
  const orders = await fetchOrders(range);
  return await calculateKpis(orders);
}

async function fetchOrders(range: Range): Promise<WooOrder[]> {
  "use step";
  const base = process.env.WOO_STORE_URL;
  const key = process.env.WOO_CONSUMER_KEY;
  const secret = process.env.WOO_CONSUMER_SECRET;
  if (!base || !key || !secret) {
    throw new FatalError("WooCommerce settings missing in .env.local");
  }

  const auth = "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
  const all: WooOrder[] = [];

  for (let page = 1; ; page++) {
    const params = new URLSearchParams({
      per_page: "100",
      page: String(page),
      after: `${range.from}T00:00:00`,
      before: `${range.to}T23:59:59`,
      _fields: "id,status,date_created,total,discount_total,billing",
    });

    const res = await fetch(`${base}/wp-json/wc/v3/orders?${params}`, {
      headers: { Authorization: auth },
    });
    if (res.status === 401 || res.status === 403) {
      throw new FatalError("WooCommerce rejected the API keys");
    }
    if (!res.ok) throw new Error(`WooCommerce returned ${res.status}`);

    const batch = (await res.json()) as WooOrder[];
    all.push(...batch);
    if (batch.length < 100) break;
  }

  return all;
}

async function calculateKpis(orders: WooOrder[]) {
  "use step";
  const statusCounts: Record<string, number> = {};
  let gross = 0;
  let discount = 0;
  let sales = 0;
  let saleOrders = 0;
  const byRegion: Record<string, number> = {};

  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    if (!SALES_STATUSES.has(o.status)) continue;

    const total = toCents(o.total);
    const disc = toCents(o.discount_total);
    saleOrders++;
    sales += total;
    discount += disc;
    gross += total + disc;
    const country = o.billing?.country || "Unknown";
    byRegion[country] = (byRegion[country] ?? 0) + total;
  }

  const money = (cents: number) => cents / 100;

  const kpis = {
    orderCount: saleOrders,
    grossSales: money(gross),
    totalDiscount: money(discount),
    totalSales: money(sales),
    averageOrderValue: saleOrders ? money(Math.round(sales / saleOrders)) : null,
    discountRate: gross ? discount / gross : 0,
    byRegion: Object.fromEntries(
      Object.entries(byRegion).map(([k, v]) => [k, money(v)])
    ),
    statusCounts,
  };

  console.log("[sales-review] KPIs", kpis);
  return kpis;
}