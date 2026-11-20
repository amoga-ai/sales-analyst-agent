// lib/export/officeparser-export.ts: Turns a report into a CSV, Excel, Word, PowerPoint, or PDF file with officeparser. Key figures come first, then one or more tables, each under its own heading.
import { OfficeParser } from "officeparser";

export type ExportFormat = "csv" | "xlsx" | "docx" | "pptx" | "pdf";
export type ExportSection = { heading: string; columns: string[]; rows: (string | number)[][] };
export type ExportTable = {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  summary?: { label: string; value: string | number }[];
  sections?: ExportSection[];
};

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

// Builds one HTML table with a header row.
function tableHtml(columns: string[], rows: (string | number)[][]): string {
  const head = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><tr>${head}</tr>${body}</table>`;
}

// Builds the HTML page: title, key figures, then each table under its heading.
function tableToHtml(table: ExportTable): string {
  const summary =
    table.summary && table.summary.length
      ? `<h2>Key figures</h2><table>${table.summary
          .map((s) => `<tr><td>${escapeHtml(s.label)}</td><td>${escapeHtml(s.value)}</td></tr>`)
          .join("")}</table>`
      : "";
  const sections: ExportSection[] =
    table.sections && table.sections.length
      ? table.sections
      : [{ heading: "", columns: table.columns, rows: table.rows }];
  const body = sections
    .map((s) => `${s.heading ? `<h2>${escapeHtml(s.heading)}</h2>` : ""}${tableHtml(s.columns, s.rows)}`)
    .join("");
  return `<html><body><h1>${escapeHtml(table.title)}</h1>${summary}${body}</body></html>`;
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

// Returns the HTML view of a generated Word, Excel, or PowerPoint file.
export async function previewHtml(table: ExportTable, format: "xlsx" | "docx" | "pptx"): Promise<string> {
  const { bytes } = await exportTable(table, format);
  const ast = await OfficeParser.parseOffice(Buffer.from(bytes));
  return (await ast.to("html")).value as string;
}