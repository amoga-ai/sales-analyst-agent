// lib/export/word-docx.ts: Builds a styled Word (.docx) file with the docx library: title, key figures, each table under its heading, then each chart picture.
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ExportTable } from "./officeparser-export";

const LINE = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const BORDERS = {
  top: LINE,
  bottom: LINE,
  left: LINE,
  right: LINE,
  insideHorizontal: LINE,
  insideVertical: LINE,
};
const HEADER_FILL = "1F4E79";
const LABEL_FILL = "F2F2F2";
const ALT_FILL = "F7F9FC";

// Builds one table cell with padding, an optional fill, and optional bold or coloured text.
function cell(
  value: string | number,
  opts: { fill?: string; bold?: boolean; color?: string; right?: boolean } = {}
): TableCell {
  return new TableCell({
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text: String(value), bold: opts.bold, color: opts.color })],
      }),
    ],
  });
}

// Builds the two-column Key figures table: label on the left, value on the right.
function keyFiguresTable(items: { label: string; value: string | number }[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    rows: items.map(
      (item) =>
        new TableRow({
          children: [cell(item.label, { fill: LABEL_FILL, bold: true }), cell(item.value, { right: true })],
        })
    ),
  });
}

// Builds a report table: a dark header row with white bold text, then rows with alternating shading.
function reportTable(columns: string[], rows: (string | number)[][]): Table {
  const header = new TableRow({
    tableHeader: true,
    children: columns.map((c) => cell(c, { fill: HEADER_FILL, bold: true, color: "FFFFFF" })),
  });
  const body = rows.map(
    (row, i) =>
      new TableRow({
        children: row.map((v) => cell(v, { fill: i % 2 === 1 ? ALT_FILL : undefined })),
      })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    rows: [header, ...body],
  });
}

// Places each chart picture (a PNG data URL) in the document, one after another.
function chartParagraphs(charts: { title: string; png: string }[]): Paragraph[] {
  return charts.map(
    (c) =>
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: Buffer.from(c.png.split(",")[1], "base64"),
            transformation: { width: 560, height: 336 },
          }),
        ],
        spacing: { after: 240 },
      })
  );
}

// Builds the whole Word file and returns its bytes.
export async function buildWordDocx(
  table: ExportTable,
  charts: { title: string; png: string }[] = []
): Promise<Uint8Array> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: table.title, heading: HeadingLevel.TITLE, spacing: { after: 240 } }),
  ];

  if (table.summary && table.summary.length) {
    children.push(
      new Paragraph({ text: "Key figures", heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }),
      keyFiguresTable(table.summary),
      new Paragraph({ text: "", spacing: { after: 240 } })
    );
  }

  const sections =
    table.sections && table.sections.length
      ? table.sections
      : [{ heading: "", columns: table.columns, rows: table.rows }];

  for (const s of sections) {
    if (s.heading) {
      children.push(new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }));
    }
    children.push(reportTable(s.columns, s.rows), new Paragraph({ text: "", spacing: { after: 240 } }));
  }

  children.push(...chartParagraphs(charts));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children }],
  });
  return new Uint8Array(await Packer.toBuffer(doc));
}