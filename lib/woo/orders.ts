export type WooOrder = {
  id: number;
  status: string;
  total: string;
  discount_total: string;
};
export async function fetchWooOrders(from: string, to: string): Promise<WooOrder[]> {
  const base = process.env.WOO_STORE_URL;
  const key = process.env.WOO_CONSUMER_KEY;
  const secret = process.env.WOO_CONSUMER_SECRET;
  if (!base || !key || !secret) throw new Error("WooCommerce settings missing");

  const auth = "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
  const all: WooOrder[] = [];

  for (let page = 1; ; page++) {
    const params = new URLSearchParams({
      per_page: "100",
      page: String(page),
      after: `${from}T00:00:00`,
      before: `${to}T23:59:59`,
      _fields: "id,status,total",
    });
    const res = await fetch(`${base}/wp-json/wc/v3/orders?${params}`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`WooCommerce returned ${res.status}`);

    const batch = (await res.json()) as WooOrder[];
    all.push(...batch);
    if (batch.length < 100) break;
  }

  return all;
}