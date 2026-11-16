// components/ArtifactPanel.tsx: Side panel with one report. The header has the title and PDF and close icons. The footer has the last edit time and the CSV download icon.
"use client";

import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "@/lib/json-render/registry";
import { useEffect, useState } from "react";
type Spec = { root: string; elements: Record<string, { type: string; props?: Record<string, any> }> };

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

// Side panel with the report, icon buttons in the header and footer, and the last edit time.
export default function ArtifactPanel({ title, spec, onClose }: { title: string; spec: Spec; onClose: () => void }) {
    // The time the panel was opened, shown as the last edit.
    const [openedAt] = useState(() => new Date());
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);
    // Downloads the report rows as a CSV file.
    function downloadCsv() {
        const blob = new Blob([specToCsv(spec)], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    const iconButton =
        "flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:ring-offset-zinc-950";
    const bodySpec = {
        ...spec,
        elements: {
            ...spec.elements,
            card: { ...spec.elements.card, props: { ...spec.elements.card?.props, title: undefined } },
        },
    };
    return (
        <aside
            id="artifact-panel"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-zinc-200 bg-white md:static md:z-auto md:w-[460px] md:max-w-none md:shrink-0 dark:border-zinc-800 dark:bg-zinc-950"        >
            {/* When printing, show only the panel, so the PDF icon prints the report. */}
            <style>{`@media print { body * { visibility: hidden; } #artifact-panel, #artifact-panel * { visibility: visible; } #artifact-panel { position: absolute; left: 0; top: 0; width: 100%; border: 0; } #artifact-panel button, #artifact-panel footer { display: none; } }`}</style>

            <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
                    <p className="text-xs text-zinc-500">Report</p>
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

            <div className="flex-1 overflow-y-auto p-5">
                <JSONUIProvider registry={registry}>
                    <Renderer spec={bodySpec as any} registry={registry} />
                </JSONUIProvider>
            </div>

            <footer className="flex items-center justify-between border-t border-zinc-200 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800">
                <span>Last edit: {openedAt.toLocaleTimeString()}</span>
                <button type="button" onClick={downloadCsv} aria-label="Download CSV" title="Download CSV" className={iconButton}>
                    <svg {...iconProps}>
                        <path d="M12 3v12" />
                        <path d="m7 10 5 5 5-5" />
                        <path d="M5 21h14" />
                    </svg>
                </button>
            </footer>
        </aside>
    );
}