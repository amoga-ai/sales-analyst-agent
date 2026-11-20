// lib/export/pptx-build.ts: Builds a PowerPoint deck with pptxgenjs: a title slide, key figures, one slide per table, and one slide per chart picture. No AI.
import PptxGenJS from "pptxgenjs";
import type { ExportSection, ExportTable } from "./officeparser-export";

type Cell = string | number;

// Adds a slide with a heading and a table, with a dark header row. Long tables continue on more slides.
function addTableSlide(pptx: PptxGenJS, heading: string, columns: string[], rows: Cell[][]) {
  const slide = pptx.addSlide();
  slide.addText(heading, { x: 0.5, y: 0.3, w: 12.3, h: 0.7, fontSize: 24, bold: true });
  const header: any[] = columns.map((c) => ({
    text: c,
    options: { bold: true, color: "FFFFFF", fill: { color: "1F4E79" } },
  }));
  const body: any[][] = rows.map((r) => r.map((v) => ({ text: String(v) })));
  slide.addTable([header, ...body], {
    x: 0.5,
    y: 1.2,
    w: 12.3,
    fontSize: 12,
    autoPage: true,
    border: { type: "solid", color: "BFBFBF", pt: 1 },
  });
}

// Returns the deck as bytes. Each chart picture is a PNG data URL, placed on its own slide.
export async function buildPptx(table: ExportTable, charts: { title: string; png: string }[] = []): Promise<Uint8Array> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const cover = pptx.addSlide();
  cover.addText(table.title, { x: 0.5, y: 2.6, w: 12.3, h: 1.5, fontSize: 36, bold: true, align: "center" });

  if (table.summary && table.summary.length) {
    addTableSlide(
      pptx,
      "Key figures",
      ["Measure", "Value"],
      table.summary.map((s) => [s.label, s.value])
    );
  }

  const sections: ExportSection[] =
    table.sections && table.sections.length
      ? table.sections
      : [{ heading: table.title, columns: table.columns, rows: table.rows }];
  for (const s of sections) {
    addTableSlide(pptx, s.heading || table.title, s.columns, s.rows);
  }

  for (const c of charts) {
    const slide = pptx.addSlide();
    slide.addText(c.title, { x: 0.5, y: 0.3, w: 12.3, h: 0.7, fontSize: 24, bold: true });
    slide.addImage({ data: c.png, x: 1.5, y: 1.2, w: 10, h: 6 });
  }

  const data = await pptx.write({ outputType: "uint8array" });
  return data as Uint8Array;
}