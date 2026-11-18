// components/ArtifactPanel.tsx: Side panel. Shows a report (Chart or CSV view) or an HTML document (preview). A drag handle on the left edge resizes it on desktop.
"use client";

import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "@/lib/json-render/registry";
import { useEffect, useState } from "react";
import SheetGrid from "@/components/SheetGrid";
import { parse, unparse } from "papaparse";
import { downloadCsv } from "@/lib/csv";
import { reportPdfBlob } from "@/lib/report-pdf";

type Spec = { root: string; elements: Record<string, { type: string; props?: Record<string, any> }> };

const MIN_PANEL = 320;
const MIN_CHAT = 320;

// Reads the report's data as columns and rows: from its first Table, or else from its first BarChart as Label and Value. Null when it has neither.
export function specTable(spec: Spec): { columns: (string | number)[]; rows: (string | number)[][] } | null {
    const elements = Object.values(spec.elements);
    const table = elements.find((e) => e.type === "Table");
    const chart = elements.find((e) => e.type === "BarChart");
    if (table?.props) return { columns: table.props.columns, rows: table.props.rows };
    if (chart?.props) {
        return {
            columns: ["Name", "Total"],
            rows: chart.props.labels.map((label: string, i: number) => [label, chart.props!.values[i]]),
        };
    }
    return null;
}

export function specToCsv(spec: Spec): string {
    const table = specTable(spec);
    const rows = table ? [table.columns, ...table.rows] : [];
    return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

// Builds a table spec from the report's rows, so the CSV view shows the same styled table.
function csvTableSpec(spec: Spec) {
    const { columns, rows } = specTable(spec) ?? { columns: ["Label", "Value"], rows: [] };
    return { root: "t", elements: { t: { type: "Table", props: { title: "", columns, rows } } } };
}

// Shared settings for the icons, so they all look the same.
const iconProps = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
};

// Parses CSV text, including quoted cells, into the table spec the panel already renders.
function csvToSpec(csv: string) {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < csv.length; i++) {
        const ch = csv[i];
        if (quoted) {
            if (ch === '"' && csv[i + 1] === '"') { cell += '"'; i++; }
            else if (ch === '"') quoted = false;
            else cell += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ",") { row.push(cell); cell = ""; }
        else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && csv[i + 1] === "\n") i++;
            row.push(cell); cell = "";
            if (row.some((c) => c.trim() !== "")) rows.push(row);
            row = [];
        } else cell += ch;
    }
    row.push(cell);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    const [columns = [], ...body] = rows;
    return { root: "t", elements: { t: { type: "Table", props: { title: "", columns, rows: body } } } };
}

// Side panel. Shows a report with a Chart / CSV switch, or an HTML document in a sandboxed preview.
export default function ArtifactPanel({
    title,
    label,
    spec,
    html,
    csv,
    onClose,
    width,
    onWidthChange,
}: {
    title: string;
    label?: string;
    spec?: Spec;
    html?: string;
    csv?: string;
    onClose: () => void;
    width: number;
    onWidthChange: (w: number) => void;
}) {
    const [openedAt] = useState(() => new Date());
    const [view, setView] = useState<"chart" | "csv" | "pdf">("chart");
    // ArtifactProvider keys this panel by the artifact, so a new artifact mounts a new panel and this starts from its csv.
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // Builds the PDF when the PDF tab opens, and frees the old file when the tab or report changes.
    useEffect(() => {
        if (view !== "pdf" || !spec) return;
        const table = specTable(spec) ?? { columns: ["Label", "Value"], rows: [] };
        let url: string | null = null;
        let cancelled = false;
        reportPdfBlob(title, table.columns, table.rows).then((blob) => {
            if (cancelled) return;
            url = URL.createObjectURL(blob);
            setPdfUrl(url);
        });
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
            setPdfUrl(null);
        };
    }, [view, spec, title]);
    const [sheetCsv, setSheetCsv] = useState(csv ?? "");

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    function downloadReport() {
        if (!spec) return;
        downloadCsv(title, specToCsv(spec));
    }

    // Drops empty rows, and the empty columns on the right that the grid adds as padding (it always has 26 columns).
    function cleanSheetCsv() {
        const rows = parse<string[]>(sheetCsv, { skipEmptyLines: true }).data.filter((row) =>
            row.some((c) => c.trim() !== ""),
        );
        const width = Math.max(0, ...rows.map((row) => row.findLastIndex((c) => c.trim() !== "") + 1));
        return unparse(rows.map((row) => row.slice(0, width)));
    }

    function copySheet() {
        navigator.clipboard.writeText(cleanSheetCsv());
    }

    function downloadSheet() {
        downloadCsv(title, cleanSheetCsv());
    }

    function startResize(e: { preventDefault: () => void }) {
        e.preventDefault();
        const move = (ev: PointerEvent) => {
            const next = window.innerWidth - ev.clientX;
            onWidthChange(Math.min(Math.max(next, MIN_PANEL), window.innerWidth - MIN_CHAT));
        };
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    }

    const iconButton =
        "flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:ring-offset-zinc-950";
    const bodySpec = spec
        ? {
            ...spec,
            elements: {
                ...spec.elements,
                card: { ...spec.elements.card, props: { ...spec.elements.card?.props, title: undefined } },
            },
        }
        : null;

    return (
        <aside
            id="artifact-panel"
            style={{ ["--panel-w" as string]: `${width}px` }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-zinc-200 bg-white md:relative md:z-auto md:w-(--panel-w) md:max-w-none md:shrink-0 dark:border-zinc-800 dark:bg-zinc-950"
        >
            {/* Drag handle on the left edge (desktop only). Drag to resize the panel. */}
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize panel"
                onPointerDown={startResize}
                className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize hover:bg-violet-500/30 md:block"
            />

            {/* When printing, show only the panel, so the PDF icon prints the report. */}
            <style>{`
                @page { size: A4; margin: 16mm; }
                @media print {
                    body * { visibility: hidden; }
                    #artifact-panel, #artifact-panel * { visibility: visible; }
                    #artifact-panel { position: absolute; left: 0; top: 0; width: 100%; max-width: none; border: 0; box-shadow: none; }
                    #artifact-panel button, #artifact-panel footer, #artifact-panel [role="separator"] { display: none !important; }
                    #artifact-panel * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    #artifact-panel .mb-4.inline-flex { display: none !important; }
                }
            `}</style>

            <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
                    <p className="text-xs text-zinc-500">{label ?? (html ? "Document" : "Report")}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => window.print()} aria-label="Save as PDF" title="Save as PDF" className={iconButton}>
                        <svg {...iconProps}>
                            <path d="M6 9V2h12v7" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <path d="M6 14h12v8H6z" />
                        </svg>
                    </button>
                    <button type="button" onClick={onClose} aria-label="Close" title="Close" className={iconButton}>
                        <svg {...iconProps}>
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                    </button>
                </div>
            </header>

            {html ? (
                // The document runs in a sandboxed frame, so its scripts cannot reach this page.
                <div className="min-h-0 flex-1 p-3">
                    <iframe
                        title={title}
                        sandbox="allow-scripts"
                        srcDoc={html}
                        className="h-full w-full rounded-xl border border-zinc-200 bg-white"
                    />
                </div>
            ) : csv !== undefined && !spec ? (
                <div className="flex-1 overflow-y-auto p-5">
                    <div className="h-[60vh]">
                        <SheetGrid csv={csv} onChange={setSheetCsv} />
                    </div>
                </div>
            ) :
                (
                    <div className="flex-1 overflow-y-auto p-5">
                        {/* Switch between the chart and the CSV table of the same report. */}
                        <div className="mb-4 inline-flex rounded-lg border border-zinc-200 p-0.5 text-sm dark:border-zinc-800">
                            {(["chart", "csv", "pdf"] as const).map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setView(v)}
                                    className={`rounded-md px-3 py-1 transition ${view === v
                                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                        : "text-zinc-600 dark:text-zinc-400"
                                        }`}
                                >
                                    {v === "chart" ? "Chart" : v === "csv" ? "CSV" : "PDF"}
                                </button>
                            ))}
                        </div>
                        {view === "chart" && bodySpec ? (
                            <JSONUIProvider registry={registry}>
                                <Renderer spec={bodySpec as any} registry={registry} />
                            </JSONUIProvider>
                        ) : view === "csv" && spec ? (
                            <JSONUIProvider registry={registry}>
                                <Renderer spec={csvTableSpec(spec) as any} registry={registry} />
                            </JSONUIProvider>
                        ) : view === "pdf" ? (
                            pdfUrl ? (
                                <iframe title={`${title} PDF`} src={pdfUrl} className="h-[70vh] w-full rounded-xl border border-zinc-200" />
                            ) : (
                                <p className="text-sm text-zinc-500">Building the PDF…</p>
                            )
                        ) : null}
                    </div>
                )}

            <footer className="flex items-center justify-between border-t border-zinc-200 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800">
                <span>Opened: {openedAt.toLocaleTimeString()}</span>
                {spec && (
                    <button type="button" onClick={downloadReport} aria-label="Download CSV" title="Download CSV" className={iconButton}>
                        <svg {...iconProps}>
                            <path d="M12 3v12" />
                            <path d="m7 10 5 5 5-5" />
                            <path d="M5 21h14" />
                        </svg>
                    </button>
                )}
                {csv !== undefined && !spec && (
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={copySheet} aria-label="Copy as CSV" title="Copy as CSV" className={iconButton}>
                            <svg {...iconProps}>
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        </button>
                        <button type="button" onClick={downloadSheet} aria-label="Download CSV" title="Download CSV" className={iconButton}>
                            <svg {...iconProps}>
                                <path d="M12 3v12" />
                                <path d="m7 10 5 5 5-5" />
                                <path d="M5 21h14" />
                            </svg>
                        </button>
                    </div>
                )}
            </footer>
        </aside>
    );
}