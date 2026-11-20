// Converts the editor's blocks into the report shape the document generator uses: title, key figures, tables, and chart pictures.
type Block = { type: string; children?: any[]; url?: string };

// Collects the plain text inside a block, including nested text.
function textOf(node: any): string {
    return node.text ?? (node.children ?? []).map(textOf).join("");
}

export function plateToReport(blocks: Block[]) {
    let title = "Report";
    let heading = "";
    const kpis: { label: string; value: string }[] = [];
    const sections: { title?: string; columns: string[]; rows: unknown[][] }[] = [];
    const charts: { title: string; png: string }[] = [];

    for (const b of blocks) {
        if (b.type === "h1") title = textOf(b);
        else if (b.type === "h2") heading = textOf(b);
        else if (b.type === "p") {
            // Treats "label: value" lines as key figures
            const text = textOf(b);
            const i = text.indexOf(": ");
            if (i > 0) kpis.push({ label: text.slice(0, i), value: text.slice(i + 2) });
        } else if (b.type === "table") {
            // The first row is the header; the rest are data rows
            const [head, ...body] = b.children ?? [];
            sections.push({
                title: heading || undefined,
                columns: (head?.children ?? []).map(textOf),
                rows: body.map((tr: any) => (tr.children ?? []).map(textOf)),
            });
            heading = "";
        } else if (b.type === "img" && b.url) {
            charts.push({ title: heading, png: b.url });
            heading = "";
        }
    }
    return { title, kpis, sections, charts };
}