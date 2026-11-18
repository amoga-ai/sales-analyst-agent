// app/api/export/route.ts: Server route that turns a table into the requested file with officeparser. Not yet called by the UI.
import { exportTable, type ExportFormat, type ExportTable } from "@/lib/export/officeparser-export";

export const runtime = "nodejs";

const FORMATS: ExportFormat[] = ["csv", "xlsx", "docx", "pptx", "pdf"];

export async function POST(request: Request) {
  const body = await request.json();
  const format = body.format as ExportFormat;
  if (!FORMATS.includes(format)) return Response.json({ error: "Unknown format" }, { status: 400 });
  if (!Array.isArray(body.columns) || !Array.isArray(body.rows)) {
    return Response.json({ error: "columns and rows are required" }, { status: 400 });
  }

  const table: ExportTable = {
    title: typeof body.title === "string" ? body.title : "Report",
    columns: body.columns.map(String),
    rows: body.rows,
  };
  const { bytes, mime } = await exportTable(table, format);
  const payload = new Uint8Array(bytes);
  const name = table.title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-") || "report";

  return new Response(payload, {
    headers: {
      "content-type": mime,
      "content-disposition": `attachment; filename="${name}.${format}"`,
    },
  });
}