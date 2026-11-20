// lib/export/pdf-charts.ts: Adds one page per chart picture to the end of a generated PDF, using pdf-lib. No AI.
import { PDFDocument } from "pdf-lib";

// Returns the PDF with a page for each chart picture (a PNG data URL) added after the report pages.
export async function addChartPages(pdfBytes: Uint8Array, charts: { title: string; png: string }[]): Promise<Uint8Array> {
  if (!charts.length) return pdfBytes;
  const doc = await PDFDocument.load(pdfBytes);
  for (const c of charts) {
    const image = await doc.embedPng(Buffer.from(c.png.split(",")[1], "base64"));
    const page = doc.addPage([595, 842]);
    const width = 480;
    const height = (image.height / image.width) * width;
    page.drawImage(image, { x: 57, y: 842 - 100 - height, width, height });
  }
  return doc.save();
}