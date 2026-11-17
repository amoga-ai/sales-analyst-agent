// components/ArtifactPanel.tsx: Side panel. Shows a report (Chart or CSV view) or an HTML document (preview). A drag handle on the left edge resizes it on desktop.
"use client";

import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "@/lib/json-render/registry";
import { useEffect, useState } from "react";

type Spec = { root: string; elements: Record<string, { type: string; props?: Record<string, any> }> };

// The panel never gets narrower than MIN_PANEL, and the chat keeps at least MIN_CHAT.
const MIN_PANEL = 320;
const MIN_CHAT = 320;

// Turns the spec's table, or its bar chart, into CSV text.
export function specToCsv(spec: Spec): string {
    const elements = Object.values(spec.elements);
    const table = elements.find((e) => e.type === "Table");
    const chart = elements.find((e) => e.type === "BarChart");
    let rows: (string | number)[][] = [];
    if (table?.props) {
        rows = [table.props.columns, ...table.props.rows];
    } else if (chart?.props) {
        rows = [["Label", "Value"], ...chart.props.labels.map((label: string, i: number) => [label, chart.props!.values[i]])];
    }
    return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

// Builds a table spec from the report's rows, so the CSV view shows the same styled table.
function csvTableSpec(spec: Spec) {
    const elements = Object.values(spec.elements);
    const table = elements.find((e) => e.type === "Table");
    const chart = elements.find((e) => e.type === "BarChart");
    const columns = table?.props ? table.props.columns : ["Label", "Value"];
    const rows = table?.props
        ? table.props.rows
        : chart?.props
          ? chart.props.labels.map((label: string, i: number) => [label, chart.props!.values[i]])
          : [];
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

// Side panel. Shows a report with a Chart / CSV switch, or an HTML document in a sandboxed preview.
export default function ArtifactPanel({
    title,
    spec,
    html,
    onClose,
    width,
    onWidthChange,
}: {
    title: string;
    spec?: Spec;
    html?: string;
    onClose: () => void;
    width: number;
    onWidthChange: (w: number) => void;
}) {
    const [openedAt] = useState(() => new Date());
    const [view, setView] = useState<"chart" | "csv">("chart");

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    function downloadCsv() {
        if (!spec) return;
        const blob = new Blob([specToCsv(spec)], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
        link.click();
        URL.revokeObjectURL(url);
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
            <style>{`@media print { body * { visibility: hidden; } #artifact-panel, #artifact-panel * { visibility: visible; } #artifact-panel { position: absolute; left: 0; top: 0; width: 100%; border: 0; } #artifact-panel button, #artifact-panel footer { display: none; } }`}</style>

            <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
                    <p className="text-xs text-zinc-500">{html ? "Document" : "Report"}</p>
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
            ) : (
                <div className="flex-1 overflow-y-auto p-5">
                    {/* Switch between the chart and the CSV table of the same report. */}
                    <div className="mb-4 inline-flex rounded-lg border border-zinc-200 p-0.5 text-sm dark:border-zinc-800">
                        {(["chart", "csv"] as const).map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setView(v)}
                                className={`rounded-md px-3 py-1 transition ${
                                    view === v
                                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                        : "text-zinc-600 dark:text-zinc-400"
                                }`}
                            >
                                {v === "chart" ? "Chart" : "CSV"}
                            </button>
                        ))}
                    </div>
                    {view === "chart" && bodySpec ? (
                        <JSONUIProvider registry={registry}>
                            <Renderer spec={bodySpec as any} registry={registry} />
                        </JSONUIProvider>
                    ) : spec ? (
                        <JSONUIProvider registry={registry}>
                            <Renderer spec={csvTableSpec(spec) as any} registry={registry} />
                        </JSONUIProvider>
                    ) : null}
                </div>
            )}

            <footer className="flex items-center justify-between border-t border-zinc-200 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800">
                <span>Last edit: {openedAt.toLocaleTimeString()}</span>
                {spec && (
                    <button type="button" onClick={downloadCsv} aria-label="Download CSV" title="Download CSV" className={iconButton}>
                        <svg {...iconProps}>
                            <path d="M12 3v12" />
                            <path d="m7 10 5 5 5-5" />
                            <path d="M5 21h14" />
                        </svg>
                    </button>
                )}
            </footer>
        </aside>
    );
}