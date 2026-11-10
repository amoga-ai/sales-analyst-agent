import uiConfig from "@/bot-configs/sales-analyst/ui.json";
import { rangeFor } from "@/lib/bot/periods";
import { fetchWooOrders } from "@/lib/woo/orders";

function fill(value: unknown, values: Record<string, string>): unknown {
  if (typeof value === "string") {
    return value.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
  }
  if (Array.isArray(value)) return value.map((v) => fill(v, values));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, fill(v, values)])
    );
  }
  return value;
}

export async function POST(req: Request) {
  const { actionId } = await req.json();
  const question = uiConfig.questions.find((q) => q.actionId === actionId);
  if (!question) {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

    const range = rangeFor((question as { period?: string }).period ?? uiConfig.period);
  if (!range) {
    return Response.json({ error: "Invalid period" }, { status: 500 });
  }

  try {
    const orders = await fetchWooOrders(range.from, range.to);
    const values: Record<string, string> = { total: String(orders.length) };
    for (const o of orders) {
      values[o.status] = String((Number(values[o.status]) || 0) + 1);
    }
    values.pending ??= "0";

    return Response.json({ spec: fill(question.layout, values) });
  } catch {
    return Response.json({ error: "Could not load data" }, { status: 500 });
  }
}