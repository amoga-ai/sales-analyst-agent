// scripts/check-generate-document.ts: Generates one file per format from a sample table and writes them to tmp-check/ so each can be opened.
import { mkdirSync, writeFileSync } from "node:fs";
import { generateDocument, type DocumentFormat } from "../lib/export/generate-document";

// Runs the check: one file per format, written to tmp-check/.
async function main() {
  const sample = {
    title: "Daily Sales Review 2026-06-29",
    columns: ["Metric", "Value"],
    rows: [
      ["Orders", 9],
      ["Revenue", "$1,448.99"],
    ],
  };

  const formats: DocumentFormat[] = ["csv", "excel", "word", "ppt", "pdf"];
  mkdirSync("tmp-check", { recursive: true });

  for (const format of formats) {
    const doc = await generateDocument({ table: sample, format, template: "plain-table" });
    writeFileSync(`tmp-check/${doc.fileName}`, doc.bytes);
    console.log(format, doc.fileName, doc.bytes.byteLength, "bytes", doc.mime);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});