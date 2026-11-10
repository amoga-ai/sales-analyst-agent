import { fetchWooOrders, type WooOrder } from "@/lib/woo/orders";
import { previousDay, shiftDay } from "@/lib/daily/dates";
import { dailyReview } from "@/lib/daily/review";
import { validateOrders } from "@/lib/daily/validate";
import * as cards from "@/lib/daily/cards";

type Loaded = { day: string; orders: WooOrder[] };

const g = globalThis as unknown as { __dailyData?: Map<string, Loaded> };
const cache = (g.__dailyData ??= new Map<string, Loaded>());

async function refresh(sessionId: string): Promise<Loaded> {
    const { from, to } = previousDay();
    const orders = await fetchWooOrders(from, to);
    const loaded = { day: from, orders };
    cache.set(sessionId, loaded);
    return loaded;
}

async function current(sessionId: string): Promise<Loaded> {
    return cache.get(sessionId) ?? (await refresh(sessionId));
}

async function ordersOn(day: string): Promise<WooOrder[]> {
    return fetchWooOrders(day, day);
}

export type StepResult = { spec?: unknown; text?: string; vars?: Record<string, string> };

export async function runDailyAction(action: string, sessionId: string): Promise<StepResult> {
    switch (action) {
        case "verify_connection": {
            const { day } = await refresh(sessionId);
            return { spec: cards.connectionReport(day) };
        }
        case "fetch_orders": {
            const { day, orders } = await current(sessionId);
            return { spec: cards.ordersReport(day, orders.length) };
        }
        case "validate_orders": {
            const { orders } = await current(sessionId);
            const v = validateOrders(orders);
            return {
                spec: cards.validationReport(v.checks),
                vars: { validation_ok: v.ok ? "true" : "false" },
            };
        }
        case "daily_kpis": {
            const { day, orders } = await current(sessionId);
            const [dayBefore, lastWeek] = await Promise.all([
                ordersOn(shiftDay(day, -1)),
                ordersOn(shiftDay(day, -7)),
            ]);
            return {
                spec: cards.kpiReport(
                    dailyReview(orders),
                    dailyReview(dayBefore),
                    dailyReview(lastWeek)
                ),
            };
        }
        case "status_exceptions": {
            const { orders } = await current(sessionId);
            return { spec: cards.statusReport(dailyReview(orders)) };
        }
        case "top_products": {
            const { orders } = await current(sessionId);
            return { spec: cards.productsReport(dailyReview(orders)) };
        }
        case "findings": {
            const { orders } = await current(sessionId);
            return { spec: cards.findingsReport(dailyReview(orders)) };
        }
        case "recommendations": {
            const { orders } = await current(sessionId);
            return { spec: cards.recommendationsReport(dailyReview(orders)) };
        }
        case "publish_report":
            return { text: "Report approved. Saving and publishing are not connected yet." };
        case "answer_failed_orders": {
            const { orders } = await current(sessionId);
            const failed = orders.filter((o) => o.status === "failed");
            return {
                spec: cards.failedOrdersReport(
                    failed.map((o) => [`#${o.id}`, o.total, o.payment_method_title || "—"])
                ),
            };
        }
        case "answer_best_products": {
            const { orders } = await current(sessionId);
            return { spec: cards.productsReport(dailyReview(orders)) };
        }
        case "answer_compare": {
            const { day, orders } = await current(sessionId);
            const lastWeek = await ordersOn(shiftDay(day, -7));
            return { spec: cards.comparisonReport(dailyReview(orders), dailyReview(lastWeek)) };
        }
        default:
            throw new Error(`Unknown action: ${action}`);
    }
}