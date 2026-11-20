"use client";

// components/ExportPanel.tsx: Right panel for the non-AI Eve agent. PDF shows in the viewer, CSV as text, and Word, Excel, and PowerPoint as the HTML that officeparser builds from each file. Each tab has a download button for its file.
import { useEffect, useState } from "react";

const MIN_PANEL = 320;
const MIN_CHAT = 320;

const FORMATS = [
    { id: "csv", label: "CSV" },
    { id: "xlsx", label: "Excel" },
    { id: "docx", label: "Word" },
    { id: "pptx", label: "PPT" },
    { id: "pdf", label: "PDF" },
] as const;
type FormatId = (typeof FORMATS)[number]["id"];
const HTML_PREVIEW: FormatId[] = ["xlsx", "docx", "pptx"];

// Sends a JSON request to one of our routes and fails on an error reply.
async function postJson(path: string, body: unknown): Promise<Response> {
    const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res;
}

export default function ExportPanel({
    title,
    spec,
    onClose,
    width,
    onWidthChange
}: {
    title: string;
    spec: any;
    onClose: () => void;
    width: number;
    onWidthChange: (w: number) => void;
}) {
    const [format, setFormat] = useState<FormatId>("csv");
    const [view, setView] = useState<{ html?: string; url?: string; text?: string; error?: string }>({});
    const table: any = Object.values(spec?.elements ?? {}).find((e: any) => e.type === "Table");
    const columns: string[] = table?.props?.columns ?? [];
    const rows: (string | number)[][] = table?.props?.rows ?? [];
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    const label = FORMATS.find((f) => f.id === format)?.label ?? format;

    // Loads the view for the chosen tab, and frees the old file's URL when the tab changes.
    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | undefined;
        setView({});
        const load = async () => {
            if (HTML_PREVIEW.includes(format)) {
                const res = await postJson("/api/export/preview", { format, title, columns, rows });
                const html = await res.text();
                if (!cancelled) setView({ html });
                return;
            }
            const res = await postJson("/api/export", { format, title, columns, rows });
            const blob = await res.blob();
            objectUrl = URL.createObjectURL(blob);
            const text = format === "csv" ? await blob.text() : undefined;
            if (!cancelled) setView({ url: objectUrl, text });
        };
        load().catch((e) => {
            if (!cancelled) setView({ error: e.message });
        });
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [format, title, spec]);

    // Downloads the file for the chosen tab.
    async function saveFile() {
        const res = await postJson("/api/export", { format, title, columns, rows });
        const url = URL.createObjectURL(await res.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = `${slug}.${format}`;
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

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col border-l border-zinc-300 bg-white md:relative md:inset-auto md:z-auto md:h-screen dark:border-zinc-700 dark:bg-zinc-950"
            style={typeof window !== "undefined" && window.innerWidth >= 768 ? { width } : undefined}>
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize panel"
                onPointerDown={startResize}
                className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize hover:bg-zinc-400/40 md:block"
            />
            <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
                <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Report</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                    ✕
                </button>
            </div>

            <div className="flex flex-wrap gap-1 border-b border-zinc-200 p-2 dark:border-zinc-800">
                {FORMATS.map((f) => (
                    <button
                        key={f.id}
                        type="button"
                        onClick={() => setFormat(f.id)}
                        className={`rounded-md px-3 py-1 text-sm ${format === f.id
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="min-h-0 flex-1 p-4">
                {view.error && <p className="text-sm text-red-600">{view.error}</p>}
                {!view.error && !view.html && !view.url && (
                    <p className="text-sm text-zinc-500">Building the {label} file…</p>
                )}
                {view.url && format === "pdf" && (
                    <iframe src={view.url} title="PDF preview" className="h-full w-full rounded-md border border-zinc-200" />
                )}
                {view.url && format === "csv" && (
                    <pre className="whitespace-pre-wrap text-xs text-zinc-800 dark:text-zinc-200">{view.text}</pre>
                )}
                {view.html && (
                    <iframe
                        srcDoc={view.html}
                        sandbox="allow-scripts"
                        title={`${label} preview`}
                        className="h-full w-full rounded-md border border-zinc-200 bg-white"
                    />
                )}
            </div>

            <div className="flex justify-end border-t border-zinc-200 p-3 dark:border-zinc-800">
                <button
                    type="button"
                    onClick={saveFile}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                    Download {label}
                </button>
            </div>
        </div>
    );
}