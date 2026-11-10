import { fetchWooOrders, type WooOrder } from "@/lib/woo/orders";
import { previousDay, shiftDay } from "@/lib/daily/dates";
import { validateOrders } from "@/lib/daily/validate";
import { rangeFor } from "@/lib/bot/periods";
import { dailyReview, trendFindings } from "@/lib/daily/review";
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
            return { spec: cards.connectionReport(day, process.env.STORE_NAME ?? "My WooCommerce Store") };
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
            return { spec: cards.statusReport(dailyReview(orders), orders) };
        }
        case "top_products": {
            const { orders } = await current(sessionId);
            return { spec: cards.productsReport(dailyReview(orders), orders) };
        }
        case "findings": {
            const { day, orders } = await current(sessionId);
            const [dayBefore, lastWeek] = await Promise.all([
                ordersOn(shiftDay(day, -1)),
                ordersOn(shiftDay(day, -7)),
            ]);
            return {
                spec: cards.findingsReport(
                    trendFindings(dailyReview(orders), dailyReview(dayBefore), dailyReview(lastWeek))
                ),
            };
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
            return { spec: cards.productsReport(dailyReview(orders), orders) };
        }
        case "answer_compare": {
            const { day, orders } = await current(sessionId);
            const lastWeek = await ordersOn(shiftDay(day, -7));
            return { spec: cards.comparisonReport(dailyReview(orders), dailyReview(lastWeek)) };
        }
        case "monthly_orders": {
            const range = rangeFor("this_year");
            if (!range) throw new Error("Unknown period");
            const orders = await fetchWooOrders(range.from, range.to);
            const months = new Map<string, { orders: number; sales: number }>();
            for (const o of orders) {
                const month = o.date_created.slice(0, 7);
                const row = months.get(month) ?? { orders: 0, sales: 0 };
                row.orders += 1;
                if (["processing", "completed"].includes(o.status)) {
                    row.sales += parseFloat(o.total || "0");
                }
                months.set(month, row);
            }
            const rows = [...months.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, v]) => ({
                    month,
                    orders: v.orders,
                    sales: Math.round(v.sales * 100) / 100,
                }));
            return { spec: cards.monthlyReport(rows) };
        }
        case "retry_validation": {
            const { orders } = await refresh(sessionId);
            const v = validateOrders(orders);
            return {
                spec: cards.validationReport(v.checks),
                vars: { validation_ok: v.ok ? "true" : "false" },
            };
        }
        default:
            throw new Error(`Unknown action: ${action}`);
    }
}