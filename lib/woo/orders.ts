export type WooLineItem = {
  product_id: number;
  name: string;
  quantity: number;
  total: string;
  sku: string;
};

export type WooOrder = {
  id: number;
  status: string;
  date_created: string;
  total: string;
  discount_total: string;
  currency: string;
  payment_method_title: string;
  line_items: WooLineItem[];
  refunds: { total: string }[];
};

const FIELDS = [
  "id",
  "status",
  "date_created",
  "total",
  "discount_total",
  "currency",
  "payment_method_title",
  "line_items",
  "refunds",
].join(",");

export async function fetchWooOrders(from: string, to: string): Promise<WooOrder[]> {
  const base = process.env.WOO_STORE_URL;
  const key = process.env.WOO_CONSUMER_KEY;
  const secret = process.env.WOO_CONSUMER_SECRET;
  if (!base || !key || !secret) {
    throw new Error("WooCommerce settings are missing");
  }

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const orders: WooOrder[] = [];

  for (let page = 1; ; page++) {
    const url = new URL("/wp-json/wc/v3/orders", base);
    url.search = new URLSearchParams({
      per_page: "100",
      page: String(page),
      after: `${from}T00:00:00`,
      before: `${to}T23:59:59`,
      _fields: FIELDS,
    }).toString();

    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`WooCommerce returned ${res.status}`);

    const batch = (await res.json()) as WooOrder[];
    orders.push(...batch);
    if (batch.length < 100) break;
  }

  return orders;
}