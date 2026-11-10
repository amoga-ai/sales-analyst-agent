import type { WooOrder } from "@/lib/woo/orders";

const PAID = ["processing", "completed"];
const cents = (value: string) => Math.round(parseFloat(value || "0") * 100);
const money = (c: number) => c / 100;

export function dailyReview(orders: WooOrder[]) {
    const statusCounts: Record<string, number> = {};
    for (const o of orders) {
        statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    }
    const count = (status: string) => statusCounts[status] ?? 0;

    const paid = orders.filter((o) => PAID.includes(o.status));
    const totalCents = orders.reduce((s, o) => s + cents(o.total), 0);
    const paidCents = paid.reduce((s, o) => s + cents(o.total), 0);
    const refundCents = orders.reduce(
        (s, o) => s + o.refunds.reduce((r, x) => r + Math.abs(cents(x.total)), 0),
        0
    );

    const byProduct = new Map<number, { name: string; sku: string; units: number; salesCents: number }>(); for (const o of paid) {
        for (const li of o.line_items) {
            const row = byProduct.get(li.product_id) ?? { name: li.name, sku: li.sku ?? "", units: 0, salesCents: 0 };
            row.units += li.quantity;
            row.salesCents += cents(li.total);
            byProduct.set(li.product_id, row);
        }
    }
    const products = [...byProduct.values()]
        .sort((a, b) => b.salesCents - a.salesCents)
        .slice(0, 10)
        .map((p) => ({ name: p.name, sku: p.sku, units: p.units, sales: money(p.salesCents) }));

    const kpis = {
        totalOrders: orders.length,
        paidOrders: paid.length,
        totalValue: money(totalCents),
        paidSales: money(paidCents),
        averageOrderValue: paid.length ? money(Math.round(paidCents / paid.length)) : 0,
        pendingOrders: count("pending"),
        failedOrders: count("failed"),
        cancelledOrders: count("cancelled"),
        refundedValue: money(refundCents),
        productsSold: byProduct.size,
    };

    const exceptions = [
        { issue: "Failed payments", orders: count("failed"), priority: "High" },
        { issue: "Orders on hold", orders: count("on-hold"), priority: "Medium" },
        { issue: "Pending payment", orders: count("pending"), priority: "Medium" },
        { issue: "Still processing", orders: count("processing"), priority: "Medium" },
    ].filter((e) => e.orders > 0);

    const findings: { kind: "positive" | "attention" | "opportunity"; text: string }[] = [];
    if (products[0]) {
        findings.push({
            kind: "positive",
            text: `${products[0].name} generated the highest sales value (${products[0].sales}).`,
        });
    }
    if (kpis.failedOrders) {
        findings.push({ kind: "attention", text: `${kpis.failedOrders} failed orders need investigation.` });
    }
    if (kpis.pendingOrders) {
        findings.push({ kind: "attention", text: `${kpis.pendingOrders} orders are still pending payment.` });
        findings.push({ kind: "opportunity", text: "Following up on pending orders could recover sales." });
    }
    if (kpis.refundedValue) {
        findings.push({ kind: "attention", text: `Refunds total ${kpis.refundedValue}.` });
    }

    const recommendations: {
        priority: "High" | "Medium" | "Normal";
        owner: string;
        action: string;
        reason: string;
        evidence: string;
        expected: string;
        humanAction: boolean;
    }[] = [];
    if (kpis.failedOrders) {
        recommendations.push({
            priority: "High",
            owner: "Finance / Payment Operations",
            action: `Review ${kpis.failedOrders} failed orders`,
            reason: "Failed payments can mean lost sales.",
            evidence: `${kpis.failedOrders} failed orders on the review day`,
            expected: "Recover payments where possible.",
            humanAction: true,
        });
    }
    if (count("processing")) {
        recommendations.push({
            priority: "High",
            owner: "Operations",
            action: `Check ${count("processing")} orders still processing`,
            reason: "Paid orders should move on to fulfilment.",
            evidence: `${count("processing")} orders in processing`,
            expected: "Orders move on to completed.",
            humanAction: true,
        });
    }
    if (kpis.pendingOrders) {
        recommendations.push({
            priority: "Medium",
            owner: "Sales / Customer Service",
            action: `Review ${kpis.pendingOrders} pending orders`,
            reason: "Customers may not have finished paying.",
            evidence: `${kpis.pendingOrders} orders pending payment`,
            expected: "Some pending orders become paid sales.",
            humanAction: true,
        });
    }
    if (products[0]) {
        recommendations.push({
            priority: "Normal",
            owner: "Merchandising",
            action: `Review ${products[0].name} sales performance`,
            reason: "It is the top seller on the review day.",
            evidence: `${products[0].name}: ${products[0].sales} MYR from ${products[0].units} units`,
            expected: "Stock and promotions stay aligned with demand.",
            humanAction: true,
        });
    }
    if (kpis.refundedValue) {
        recommendations.push({
            priority: "Medium",
            owner: "Finance",
            action: `Review refunds of ${kpis.refundedValue} MYR`,
            reason: "Refunds reduce net sales.",
            evidence: `Refund   s total ${kpis.refundedValue} MYR`,
            expected: "Confirm the refunds are valid and spot repeat issues.",
            humanAction: true,
        });
    }
    return { kpis, statusCounts, exceptions, products, findings, recommendations };
}
type Review = ReturnType<typeof dailyReview>;
export function trendFindings(r: Review, prev: Review, lastWeek: Review) {
    type Item = { group: "went_well" | "needs_attention" | "opportunity"; text: string };
    const items: Item[] = [];
    const change = (now: number, before: number) =>
        before ? Math.round(((now - before) / before) * 100) : null;
    const word = (n: number) => (n >= 0 ? "up" : "down");

    const compare = (label: string, base: Review) => {
        const salesPct = change(r.kpis.paidSales, base.kpis.paidSales);
        if (salesPct !== null) {
            items.push({
                group: salesPct >= 0 ? "went_well" : "needs_attention",
                text: `Paid sales are ${word(salesPct)} ${Math.abs(salesPct)}% against ${label}.`,
            });
        }
        const aovPct = change(r.kpis.averageOrderValue, base.kpis.averageOrderValue);
        if (aovPct !== null) {
            items.push({
                group: aovPct >= 0 ? "went_well" : "needs_attention",
                text: `Average order value is ${word(aovPct)} ${Math.abs(aovPct)}% against ${label}.`,
            });
        }
        if (r.kpis.failedOrders > base.kpis.failedOrders) {
            items.push({
                group: "needs_attention",
                text: `Failed orders rose from ${base.kpis.failedOrders} to ${r.kpis.failedOrders} against ${label}.`,
            });
        }
    };
    compare("the day before", prev);
    compare("the same weekday last week", lastWeek);

    if (r.products[0]) {
        items.push({
            group: "went_well",
            text: `${r.products[0].name} is the top seller with ${r.products[0].sales} MYR in paid sales.`,
        });
    }
    if (r.kpis.pendingOrders) {
        items.push({
            group: "opportunity",
            text: `Following up on ${r.kpis.pendingOrders} pending orders could recover sales.`,
        });
    }
    if (r.kpis.refundedValue) {
        items.push({ group: "needs_attention", text: `Refunds total ${r.kpis.refundedValue} MYR.` });
    }
    return items;
}