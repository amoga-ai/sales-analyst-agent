"use client";

// components/ReportFormats.tsx: Format buttons for a report card. Each click sends the report and its chart pictures to /api/documents, then opens the saved file in the side panel.
import { useState } from "react";
import FormatButtons, { type FormatId } from "@/components/FormatButtons";
import { useOpenArtifact } from "@/components/ArtifactProvider";
import { specToReport } from "@/lib/export/spec-to-report";
import { chartToPng, type ChartJson } from "@/lib/chart/chart-to-png";

const LABELS: Record<FormatId, string> = { csv: "CSV", excel: "Excel", word: "Doc", ppt: "PPT", pdf: "PDF" };

// Draws each bar or donut chart in the card to a PNG, in the order the card shows them.
function chartImages(spec: any): { title: string; png: string }[] {
  const elements: Record<string, any> = spec?.elements ?? {};
  const ids: string[] = elements.card?.children ?? [];
  return ids.flatMap((id) => {
    const el = elements[id];
    if (el?.type !== "BarChart" && el?.type !== "DonutChart") return [];
    const chart = {
      type: el.type,
      title: el.props?.title || elements.card?.props?.title || "",
      labels: el.props?.labels ?? [],
      values: el.props?.values ?? [],
    } as ChartJson;
    return [{ title: chart.title ?? "", png: chartToPng(chart) }];
  });
}

export default function ReportFormats({ spec }: { spec: any }) {
  const [busy, setBusy] = useState<FormatId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = useOpenArtifact();

  // Sends the report and its chart pictures, creates the file, then opens it in the side panel.
  async function create(format: FormatId) {
    setBusy(format);
    setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          format,
          template: "daily-review",
          ...specToReport(spec),
          charts: chartImages(spec),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the file");
      open?.({ title: data.fileName, kind: "saved", saved: { id: data.id, fileName: data.fileName } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the file");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <FormatButtons busy={busy !== null} onSelect={create} />
      {busy && <p className="text-xs text-zinc-500">Creating the {LABELS[busy]} file…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}