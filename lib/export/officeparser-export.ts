// lib/export/officeparser-export.ts: Turns a table into a CSV, Excel, Word, PowerPoint, or PDF file with officeparser. Not yet connected to the UI.
import { OfficeParser } from "officeparser";

export type ExportFormat = "csv" | "xlsx" | "docx" | "pptx" | "pdf";
export type ExportTable = { title: string; columns: string[]; rows: (string | number)[][] };

const MIME: Record<ExportFormat, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
};

// Escapes text so it can sit safely inside the HTML page.
function escapeHtml(value: string | number): string {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Builds a small HTML page with the title and the table, which officeparser reads as input.
function tableToHtml(table: ExportTable): string {
  const head = table.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
  const body = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<html><body><h1>${escapeHtml(table.title)}</h1><table><tr>${head}</tr>${body}</table></body></html>`;
}

// Returns the file bytes and content type for one format.
export async function exportTable(table: ExportTable, format: ExportFormat): Promise<{ bytes: Uint8Array; mime: string }> {
  const ast = await OfficeParser.parseOffice(Buffer.from(tableToHtml(table)), { fileType: "html" });
  const result =
    format === "pdf"
      ? await ast.to("pdf", { pdfConfig: { engine: "native" } })
      : await ast.to(format as "csv" | "xlsx" | "docx" | "pptx");
  const bytes = typeof result.value === "string" ? new TextEncoder().encode(result.value) : (result.value as Uint8Array);
  return { bytes, mime: MIME[format] };
}

export async function previewHtml(table: ExportTable, format: "xlsx" | "docx" | "pptx"): Promise<string> {
  const { bytes } = await exportTable(table, format);
  const ast = await OfficeParser.parseOffice(Buffer.from(bytes));
  return (await ast.to("html")).value as string;
}