// Turns a report spec into editor blocks: a title, a table for each table, a line for each figure, and a picture for each chart.
import { chartToPng } from "@/lib/chart/chart-to-png";

// Builds one table cell holding a single paragraph of text.
function cell(text: unknown) {
    return { type: "td", children: [{ type: "p", children: [{ text: String(text) }] }] };
}

// Converts the report's elements into Plate blocks, in the order they appear in the spec.
export function reportToPlateValue(spec: any): any[] {
    const title: string = spec?.elements?.card?.props?.title ?? "Report";
    const blocks: any[] = [{ type: "h1", children: [{ text: title }] }];
    for (const el of Object.values<any>(spec?.elements ?? {})) {
        if (el.type === "MetricCard") {
            blocks.push({ type: "p", children: [{ text: `${el.props.label}: ${el.props.value}` }] });
        }
        if (el.type === "Table") {
            const { title: heading, columns, rows } = el.props;
            if (heading) blocks.push({ type: "h2", children: [{ text: heading }] });
            blocks.push({
                type: "table",
                children: [
                    { type: "tr", children: columns.map((c: string) => cell(c)) },
                    ...rows.map((r: unknown[]) => ({ type: "tr", children: r.map((v) => cell(v)) })),
                ],
            });
        }
        if (el.type === "BarChart") {
            // Adds an editable bar chart block with the report's labels and values.
            blocks.push({
                type: "chart",
                title: el.props.title ?? "",
                labels: el.props.labels,
                values: el.props.values,
                children: [{ text: "" }],
            });
        }
        if (el.type === "DonutChart") {
            // Draws the donut to a picture; the type value must match what chart-to-png.ts expects.
            const url = chartToPng({
                type: "donut",
                title: el.props.title,
                labels: el.props.labels,
                values: el.props.values,
            } as any);
            blocks.push({ type: "img", url, children: [{ text: "" }] });
        }
    }
    return blocks;
}