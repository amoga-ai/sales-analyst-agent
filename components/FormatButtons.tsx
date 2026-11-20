"use client";

// components/FormatButtons.tsx: Five format buttons (CSV, Excel, Doc, PPT, PDF) shown under a chat answer that has a table. Clicking calls onSelect with the chosen format.
export type FormatId = "csv" | "excel" | "word" | "ppt" | "pdf";

const FORMATS: { id: FormatId; label: string }[] = [
  { id: "csv", label: "CSV" },
  { id: "excel", label: "Excel" },
  { id: "word", label: "Doc" },
  { id: "ppt", label: "PPT" },
  { id: "pdf", label: "PDF" },
];

// Returns true when the card's spec contains a table, so buttons are only shown for table answers.
export function specHasData(spec: any): boolean {
  return Object.values(spec?.elements ?? {}).some(
    (e: any) => e?.type === "Table" || e?.type === "BarChart" || e?.type === "DonutChart"
  );
}

// Renders the five format buttons. Disabled while a file is being created.
export default function FormatButtons({
  onSelect,
  busy = false,
}: {
  onSelect: (format: FormatId) => void;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FORMATS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onSelect(f.id)}
          disabled={busy}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}