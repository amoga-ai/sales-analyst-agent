import type { dailyReview } from "@/lib/daily/review";
import type { WooOrder } from "@/lib/woo/orders";
type Review = ReturnType<typeof dailyReview>;
type El = { type: string; props: Record<string, unknown>; children: string[] };
type Block = { id: string; el: El; extra?: Record<string, El> };

const money = (n: number) =>
    n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const text = (id: string, content: string): Block => ({
    id,
    el: { type: "Text", props: { content }, children: [] },
});

const table = (
    id: string,
    title: string,
    columns: string[],
    rows: (string | number)[][]
): Block => ({
    id,
    el: {
        type: "Table",
        props: { title, columns, rows: rows.map((r) => r.map(String)) },
        children: [],
    },
});

const bars = (id: string, title: string, labels: string[], values: number[]): Block => ({
    id,
    el: { type: "BarChart", props: { title, labels, values }, children: [] },
});

const donut = (id: string, title: string, labels: string[], values: number[]): Block => ({
    id,
    el: { type: "DonutChart", props: { title, labels, values }, children: [] },
});

const GROUPS = {
    went_well: "What went well",
    needs_attention: "What needs attention",
    opportunity: "Opportunities",
} as const;

function metrics(id: string, columns: number, items: [string, string | number][]): Block {
    const extra: Record<string, El> = {};
    const children = items.map(([label, value], i) => {
        const key = `${id}_${i}`;
        extra[key] = { type: "MetricCard", props: { label, value: String(value) }, children: [] };
        return key;
    });
    return { id, el: { type: "Grid", props: { columns }, children }, extra };
}

function report(title: string, blocks: Block[]) {
    const elements: Record<string, El> = {};
    for (const b of blocks) {
        elements[b.id] = b.el;
        Object.assign(elements, b.extra ?? {});
    }
    return {
        root: "card",
        elements: {
            card: { type: "Card", props: { title }, children: blocks.map((b) => b.id) },
            ...elements,
        },
    };
}

export function connectionReport(day: string, storeName: string) {
    return report("Daily Order Performance", [
        text("store", `Store: ${storeName}`),
        text("review_date", `Review date: ${day}`),
        table("conn", "WooCommerce connection", ["Check", "Result"], [
            ["Connection", "Connected"],
            ["API version", "wc/v3"],
            ["API access", "Read-only"],
        ]),
    ]);
}

export function ordersReport(day: string, count: number) {
    return report("Order retrieval", [
        text("day", `Review date: ${day}`),
        metrics("retrieval", 2, [
            ["Orders retrieved", count],
            ["Retrieval", "Complete"],
        ]),
    ]);
}

export function validationReport(checks: { label: string; passed: boolean }[]) {
    return report("Data validation", [
        table("checks", "Validation", ["Check", "Result"], checks.map((c) => [
            c.label,
            c.passed ? "Passed" : "Failed",
        ])),
    ]);
}

export function kpiReport(r: Review, prev: Review, lastWeek: Review) {
    const k = r.kpis;
    const row = (label: string, pick: (x: Review) => string | number) => [
        label,
        pick(r),
        pick(prev),
        pick(lastWeek),
    ];
    return report("Daily KPIs", [
        metrics("kpis", 5, [
            ["Total orders", k.totalOrders],
            ["Paid orders", k.paidOrders],
            ["Total order value (MYR)", money(k.totalValue)],
            ["Paid sales value (MYR)", money(k.paidSales)],
            ["Avg order value (MYR)", money(k.averageOrderValue)],
            ["Pending orders", k.pendingOrders],
            ["Failed orders", k.failedOrders],
            ["Cancelled orders", k.cancelledOrders],
            ["Refunded value (MYR)", money(k.refundedValue)],
            ["Products sold", k.productsSold],
        ]),
        table(
            "comparison",
            "Comparison",
            ["Measure", "Review day", "Day before", "Same weekday last week"],
            [
                row("Total orders", (x) => x.kpis.totalOrders),
                row("Paid sales (MYR)", (x) => money(x.kpis.paidSales)),
                row("Avg order value (MYR)", (x) => money(x.kpis.averageOrderValue)),
                row("Failed orders", (x) => x.kpis.failedOrders),
            ]
        ),
    ]);
}

export function statusReport(r: Review, orders: WooOrder[]) {
    const labels = Object.keys(r.statusCounts);

    const paid = orders.filter((o) => ["processing", "completed"].includes(o.status));
    const byPayment = new Map<string, number>();
    for (const o of paid) {
        const key = o.payment_method_title || "Unknown";
        byPayment.set(key, (byPayment.get(key) ?? 0) + parseFloat(o.total || "0"));
    }
    const pmLabels = [...byPayment.keys()];
    const pmValues = pmLabels.map((k) => Math.round((byPayment.get(k) ?? 0) * 100) / 100);

    const hours = new Array<number>(24).fill(0);
    for (const o of orders) {
        const h = Number(o.date_created.slice(11, 13));
        if (!Number.isNaN(h)) hours[h] += 1;
    }
    const hourLabels: string[] = [];
    const hourValues: number[] = [];
    hours.forEach((count, h) => {
        if (count > 0) {
            hourLabels.push(`${String(h).padStart(2, "0")}:00`);
            hourValues.push(count);
        }
    });

    return report("Order status and exceptions", [
        donut("status_chart", "Order status breakdown", labels, labels.map((l) => r.statusCounts[l])),
        pmLabels.length
            ? bars("payment_chart", "Paid sales by payment method (MYR)", pmLabels, pmValues)
            : text("payment_none", "No paid sales to chart by payment method."),
        hourLabels.length
            ? bars("hour_chart", "Orders by hour", hourLabels, hourValues)
            : text("hour_none", "No orders to chart by hour."),
        table(
            "exceptions",
            "Exceptions requiring attention",
            ["Issue", "Orders", "Priority"],
            r.exceptions.length ? r.exceptions.map((e) => [e.issue, e.orders, e.priority]) : [["No exceptions found", "-", "-"]]
        ),
    ]);
}

export function productsReport(r: Review, orders: WooOrder[]) {
    const points = orders.map((o) => ({
        x: o.line_items.reduce((s, li) => s + li.quantity, 0),
        y: Math.round(parseFloat(o.total || "0") * 100) / 100,
    }));
    return report("Top products", [
        bars(
            "product_chart",
            "Top products by sales (MYR)",
            r.products.map((p) => p.name),
            r.products.map((p) => p.sales)
        ),
        table(
            "product_table",
            "Top 10 products",
            ["Product", "SKU", "Units sold", "Sales (MYR)"],
            r.products.map((p) => [p.name, p.sku, p.units, money(p.sales)])
        ),
        {
            id: "order_scatter",
            el: {
                type: "ScatterChart",
                props: { title: "Order value vs items per order (MYR)", points },
                children: [],
            },
        },
    ]);
}

const LABELS = { positive: "Positive", attention: "Attention", opportunity: "Opportunity" };

export function findingsReport(items: { group: keyof typeof GROUPS; text: string }[]) {
    return report("Findings", [
        items.length
            ? table(
                "findings",
                "Findings",
                ["Group", "Finding"],
                items.map((i) => [GROUPS[i.group], i.text])
            )
            : text("findings_none", "No findings for this day."),
    ]);
}

export function recommendationsReport(r: Review) {
    return report("Recommended actions", [
        r.recommendations.length
            ? table(
                "recs",
                "Recommended actions",
                ["Priority", "Action", "Reason", "Evidence", "Expected outcome", "Owner", "Human action"],
                r.recommendations.map((x) => [
                    x.priority,
                    x.action,
                    x.reason,
                    x.evidence,
                    x.expected,
                    x.owner,
                    x.humanAction ? "Yes" : "No",
                ])
            )
            : text("recs_none", "No actions needed today."),
    ]);
}

export function failedOrdersReport(rows: (string | number)[][]) {
    return report("Failed orders", [
        rows.length
            ? table("failed", "Failed orders", ["Order", "Total (MYR)", "Payment"], rows)
            : text("failed_none", "No failed orders yesterday."),
    ]);
}

export function comparisonReport(r: Review, lastWeek: Review) {
    const fmt = (n: number) => (Number.isInteger(n) ? String(n) : money(n));
    const diff = (a: number, b: number) => {
        const d = a - b;
        return `${d > 0 ? "+" : ""}${fmt(d)}`;
    };
    const rows: [string, number, number][] = [
        ["Total orders", r.kpis.totalOrders, lastWeek.kpis.totalOrders],
        ["Paid sales (MYR)", r.kpis.paidSales, lastWeek.kpis.paidSales],
        ["Avg order value (MYR)", r.kpis.averageOrderValue, lastWeek.kpis.averageOrderValue],
        ["Failed orders", r.kpis.failedOrders, lastWeek.kpis.failedOrders],
    ];
    return report("Yesterday vs last week", [
        table(
            "compare",
            "Yesterday vs last week",
            ["Measure", "Yesterday", "Last week", "Change"],
            rows.map(([label, a, b]) => [label, fmt(a), fmt(b), diff(a, b)])
        ),
    ]);
}

export function monthlyReport(rows: { month: string; orders: number; sales: number }[]) {
    if (!rows.length) {
        return report("Monthly orders", [text("monthly_none", "No orders this year yet.")]);
    }
    return report("Monthly orders", [
        table(
            "monthly_table",
            "Orders by month",
            ["Month", "Orders", "Paid sales (MYR)"],
            rows.map((r) => [r.month, r.orders, money(r.sales)])
        ),
        bars(
            "monthly_chart",
            "Paid sales by month (MYR)",
            rows.map((r) => r.month),
            rows.map((r) => r.sales)
        ),
    ]);
}