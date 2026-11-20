"use client";

// components/SavedFilePanel.tsx: Side panel for one saved file. PDF shows inline, Word, Excel, and PowerPoint as their HTML view, CSV as text. One Download button saves the same file.
import { useEffect, useState } from "react";

const MIN_PANEL = 320;
const MIN_CHAT = 320;
const LABELS: Record<string, string> = { csv: "CSV", xlsx: "Excel", docx: "Word", pptx: "PPT", pdf: "PDF" };

export default function SavedFilePanel({
  id,
  fileName,
  onClose,
  width,
  onWidthChange,
}: {
  id: string;
  fileName: string;
  onClose: () => void;
  width: number;
  onWidthChange: (w: number) => void;
}) {
  const ext = id.split(".").pop() ?? "";
  const label = LABELS[ext] ?? ext.toUpperCase();
  const [view, setView] = useState<{ html?: string; text?: string; error?: string }>({});

  // Loads the view for this file. PDF is shown directly by the iframe, so it needs no load here.
  useEffect(() => {
    let cancelled = false;
    setView({});
    const load = async () => {
      if (ext === "pdf") return;
      const url = ext === "csv" ? `/api/documents/${id}?inline=1` : `/api/documents/${id}/preview`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Could not load the file (${res.status})`);
      const body = await res.text();
      if (!cancelled) setView(ext === "csv" ? { text: body } : { html: body });
    };
    load().catch((e) => {
      if (!cancelled) setView({ error: e.message });
    });
    return () => {
      cancelled = true;
    };
  }, [id, ext]);

  // Resizes the panel by dragging its left edge.
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
    <div className="relative flex h-screen flex-col border-l border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950" style={{ width }}>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        onPointerDown={startResize}
        className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize hover:bg-zinc-400/40 md:block"
      />
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fileName}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{label} file</p>
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

      <div className="min-h-0 flex-1 p-4">
        {view.error && <p className="text-sm text-red-600">{view.error}</p>}
        {!view.error && ext !== "pdf" && !view.html && !view.text && (
          <p className="text-sm text-zinc-500">Loading the {label} file…</p>
        )}
        {ext === "pdf" && (
          <iframe src={`/api/documents/${id}?inline=1`} title="PDF preview" className="h-full w-full rounded-md border border-zinc-200" />
        )}
        {view.text !== undefined && (
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
        <a
          href={`/api/documents/${id}`}
          download={fileName}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Download {label}
        </a>
      </div>
    </div>
  );
}