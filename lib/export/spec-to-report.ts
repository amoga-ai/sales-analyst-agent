// lib/export/spec-to-report.ts: Reads a report card and returns its title, KPI values, and every table. Each bar or donut chart becomes a table of its labels and values, headed by the chart's title or the card's title.
import type { ReportInput } from "./generate-document";

type Section = { heading: string; columns: string[]; rows: (string | number)[][] };

// Walks the card's blocks in order: metric cards become KPIs, each table becomes a section, and each chart becomes a section of its labels and values.
export function specToReport(spec: any): ReportInput {
  const elements: Record<string, any> = spec?.elements ?? {};
  const card = elements.card;
  const title: string = card?.props?.title ?? "Report";
  const kpis: { label: string; value: string | number }[] = [];
  const sections: Section[] = [];

  for (const id of card?.children ?? []) {
    const el = elements[id];
    if (!el) continue;
    if (el.type === "Grid") {
      for (const metricId of el.children ?? []) {
        const metric = elements[metricId];
        if (metric?.type === "MetricCard") kpis.push({ label: metric.props.label, value: metric.props.value });
      }
    }
    if (el.type === "Table") {
      sections.push({ heading: el.props.title ?? "", columns: el.props.columns ?? [], rows: el.props.rows ?? [] });
    }
    if (el.type === "BarChart" || el.type === "DonutChart") {
      const labels: string[] = el.props.labels ?? [];
      const values: number[] = el.props.values ?? [];
      sections.push({
        heading: el.props.title || title,
        columns: ["Label", "Value"],
        rows: labels.map((label, i) => [label, values[i] ?? 0]),
      });
    }
  }

  return { title, kpis, sections };
}