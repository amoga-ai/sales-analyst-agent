import { fetchWooOrders } from "@/lib/woo/orders";
import { rangeFor } from "@/lib/bot/periods";
import { askModel } from "@/lib/ai/openrouter";

type AiStep = { prompt: string; source: string; output: string };

async function buildSource(source: string): Promise<string> {
    if (source !== "top_orders") throw new Error(`Unknown data source: ${source}`);
    const range = rangeFor("this_year");
    if (!range) throw new Error("Unknown period");
    const orders = await fetchWooOrders(range.from, range.to);
    const top = orders
        .map((o) => ({
            id: o.id,
            status: o.status,
            date: o.date_created.slice(0, 10),
            total: Number(o.total),
            currency: o.currency,
            payment: o.payment_method_title || "Unknown",
            items: o.line_items.reduce((s, li) => s + li.quantity, 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    return JSON.stringify(top);
}

export async function runAiStep(step: AiStep, _sessionId: string) {
    const data = await buildSource(step.source);
    const text = await askModel(
        "You write short, plain-English business summaries from order data. Use only the numbers given. Do not invent figures. Amounts are in the currency given in each order; write MYR, not $.",
        `${step.prompt}\n\nData (top 10 orders this year, JSON):\n${data}`
    );
    return {
        text,
        spec: {
            root: "card",
            elements: {
                card: {
                    type: "StoryCard",
                    props: { title: "Order trend narrative", text },
                    children: [],
                },
            },
        },
    };
}