// app/api/export/preview/route.ts: Returns the HTML view of a generated Word, Excel, or PowerPoint file, built with officeparser.
import { previewHtml, type ExportTable } from "@/lib/export/officeparser-export";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  if (!["xlsx", "docx", "pptx"].includes(body.format)) {
    return Response.json({ error: "Unknown format" }, { status: 400 });
  }
  if (!Array.isArray(body.columns) || !Array.isArray(body.rows)) {
    return Response.json({ error: "columns and rows are required" }, { status: 400 });
  }
  const table: ExportTable = {
    title: typeof body.title === "string" ? body.title : "Report",
    columns: body.columns.map(String),
    rows: body.rows,
  };
  const html = (await previewHtml(table, body.format)).replace("<head>", '<head><base href="about:srcdoc">');
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}