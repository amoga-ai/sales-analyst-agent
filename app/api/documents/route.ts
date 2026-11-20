// app/api/documents/route.ts: Creates a document from a report, saves it to the server folder, and returns its ID and download link. Checks the chart pictures sent with the report.
import { generateDocument, type DocumentFormat, type TemplateName } from "@/lib/export/generate-document";
import { saveDocument } from "@/lib/export/saved-files";

export const runtime = "nodejs";

const FORMATS: DocumentFormat[] = ["csv", "excel", "word", "ppt", "pdf"];
const TEMPLATES: TemplateName[] = ["plain-table", "daily-review"];
const MAX_CHARTS = 10;
const MAX_CHART_CHARS = 2_000_000;

// Returns a problem message when the chart pictures are not usable, or null when they are fine.
function checkCharts(charts: unknown): string | null {
  if (charts === undefined) return null;
  if (!Array.isArray(charts) || charts.length > MAX_CHARTS) return `charts must be a list of up to ${MAX_CHARTS}`;
  for (const c of charts) {
    if (typeof c?.png !== "string" || !c.png.startsWith("data:image/png;base64,")) return "each chart needs a PNG picture";
    if (c.png.length > MAX_CHART_CHARS) return "a chart picture is too large";
  }
  return null;
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!FORMATS.includes(body.format)) return Response.json({ error: "Unknown format" }, { status: 400 });
  const template: TemplateName = TEMPLATES.includes(body.template) ? body.template : "plain-table";

  const problem = checkCharts(body.charts);
  if (problem) return Response.json({ error: problem }, { status: 400 });
  const charts: { title: string; png: string }[] = body.charts ?? [];

  try {
    const doc = await generateDocument({
      table: {
        title: body.title,
        columns: body.columns,
        rows: body.rows,
        kpis: body.kpis,
        sections: body.sections,
        charts,
      },
      format: body.format,
      template,
    });
    const saved = await saveDocument(doc);
    return Response.json({ ...saved, charts: charts.length });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Could not create the file" },
      { status: 400 }
    );
  }
}