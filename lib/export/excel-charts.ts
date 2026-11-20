// lib/export/excel-charts.ts: Adds a Charts sheet to a generated Excel file, with each chart's title and picture, using exceljs. No AI.
import ExcelJS from "exceljs";

// Returns the workbook with a Charts sheet holding each chart picture, one below another.
export async function addChartSheet(xlsxBytes: Uint8Array, charts: { title: string; png: string }[]): Promise<Uint8Array> {
  if (!charts.length) return xlsxBytes;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(xlsxBytes) as any);
  const sheet = wb.addWorksheet("Charts");
  charts.forEach((c, i) => {
    const top = i * 20;
    sheet.getCell(`A${top + 1}`).value = c.title;
    const data = Buffer.from(c.png.split(",")[1], "base64") as any;
    const imageId = wb.addImage({ buffer: data, extension: "png" });
    sheet.addImage(imageId, { tl: { col: 0, row: top + 1 }, ext: { width: 560, height: 336 } });
  });
  return new Uint8Array(await wb.xlsx.writeBuffer());
}