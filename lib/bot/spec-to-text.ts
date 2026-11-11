// Turns a json-render spec into plain text for chat apps that cannot draw our components.
export const WEB_URL = "https://cmcl9xvxqwoxu81zkjwpxm9g.72.60.234.126.sslip.io";

export function specToText(spec: any): string {
  const lines: string[] = [];
  for (const el of Object.values<any>(spec?.elements ?? {})) {
    const p = el.props ?? {};
    switch (el.type) {
      case "Card":
        if (p.title) lines.push(p.title);
        break;
      case "Text":
        if (p.content) lines.push(p.content);
        break;
      case "MetricCard":
        lines.push(`${p.label}: ${p.value}`);
        break;
      case "Table":
        if (p.title) lines.push(`\n${p.title}`);
        lines.push((p.columns ?? []).join(" | "));
        for (const row of p.rows ?? []) lines.push(row.join(" | "));
        break;
      case "BarChart":
      case "DonutChart":
        if (p.title) lines.push(`\n${p.title}`);
        (p.labels ?? []).forEach((label: string, i: number) => {
          lines.push(`${label}: ${p.values?.[i] ?? ""}`);
        });
        break;
      case "ScatterChart":
        if (p.title) lines.push(`\n${p.title}`);
        lines.push(`(chart with ${(p.points ?? []).length} points: see ${WEB_URL})`);
        break;
      case "StoryCard":
        if (p.title) lines.push(`\n${p.title}`);
        if (p.text) lines.push(p.text);
        break;
    }
  }
  const hasChart = Object.values<any>(spec?.elements ?? {}).some((el) =>
    ["BarChart", "DonutChart", "ScatterChart"].includes(el.type),
  );
  if (hasChart) lines.push(`\nCharts: ${WEB_URL}`);
  return lines.join("\n") || `(this section is shown in the web app: ${WEB_URL})`;
}