// lib/export/generate-document.ts: Reusable server function that turns a report into a CSV, Excel, Word, PPT, or PDF file, using a named template. No AI is used here.
import { exportTable, type ExportFormat, type ExportSection, type ExportTable } from "./officeparser-export";
import { buildWordDocx } from "./word-docx";
import { addChartPages } from "./pdf-charts";
import { addChartSheet } from "./excel-charts";
import { buildPptx } from "./pptx-build";
export type DocumentFormat = "csv" | "excel" | "word" | "ppt" | "pdf";
export type TemplateName = "plain-table" | "daily-review";

// A report's title, optional key figures, and either one table (columns and rows) or several tables (sections).
export type ReportInput = {
  title: string;
  columns?: string[];
  rows?: (string | number)[][];
  kpis?: { label: string; value: string | number }[];
  sections?: ExportSection[];
  charts?: { title: string; png: string }[];
};

export type GenerateInput = {
  table: ReportInput;
  format: DocumentFormat;
  template: TemplateName;
};

export type GeneratedDocument = {
  bytes: Uint8Array;
  mime: string;
  fileName: string;
};

// Maps the UI format names to the format names officeparser-export expects. Word is built by the docx builder instead.
const FORMAT_MAP: Record<DocumentFormat, ExportFormat> = {
  csv: "csv",
  excel: "xlsx",
  word: "docx",
  ppt: "pptx",
  pdf: "pdf",
};

// File extension for each UI format.
const EXTENSION: Record<DocumentFormat, string> = {
  csv: "csv",
  excel: "xlsx",
  word: "docx",
  ppt: "pptx",
  pdf: "pdf",
};

const WORD_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

// Each template turns the incoming report into the table that gets exported.
const TEMPLATES: Record<TemplateName, (input: ReportInput) => ExportTable> = {
  // Exports one table only, with no key figures.
  "plain-table": (input) => ({
    title: input.title,
    columns: input.columns ?? [],
    rows: input.rows ?? [],
  }),
  // Exports the title, the KPI values, and every table under its heading.
  "daily-review": (input) => ({
    title: input.title,
    columns: input.columns ?? [],
    rows: input.rows ?? [],
    summary: input.kpis ?? [],
    sections: input.sections,
  }),
};

// Checks that the report has a title and at least one table before any file is built.
function validateReport(report: ReportInput): void {
  if (!report || typeof report.title !== "string") throw new Error("title is required");
  const hasSections = Array.isArray(report.sections) && report.sections.length > 0;
  const hasTable = Array.isArray(report.columns) && Array.isArray(report.rows);
  if (!hasSections && !hasTable) throw new Error("Give either columns and rows, or sections");
}

// Builds one file from a report, a format, and a template, and returns its bytes, content type, and name.
export async function generateDocument(input: GenerateInput): Promise<GeneratedDocument> {
  validateReport(input.table);

  const build = TEMPLATES[input.template];
  if (!build) throw new Error(`Unknown template: ${input.template}`);

  const format = FORMAT_MAP[input.format];
  if (!format) throw new Error(`Unknown format: ${input.format}`);

  const table = build(input.table);
  const base = table.title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-") || "report";
  const fileName = `${base}.${EXTENSION[input.format]}`;

  if (input.format === "word") {
    return { bytes: await buildWordDocx(table, input.table.charts ?? []), mime: WORD_MIME, fileName };
  }
  if (input.format === "ppt") {
    return { bytes: await buildPptx(table, input.table.charts ?? []), mime: PPTX_MIME, fileName };
  }
  const { bytes, mime } = await exportTable(table, format);
  if (input.format === "pdf") {
    return { bytes: await addChartPages(bytes, input.table.charts ?? []), mime, fileName };
  }
  if (input.format === "excel") {
    return { bytes: await addChartSheet(bytes, input.table.charts ?? []), mime, fileName };
  }
  return { bytes, mime, fileName };
  if (input.format === "pdf") {
    return { bytes: await addChartPages(bytes, input.table.charts ?? []), mime, fileName };
  }
  return { bytes, mime, fileName };
}