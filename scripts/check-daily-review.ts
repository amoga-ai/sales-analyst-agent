// scripts/check-daily-review.ts: Generates the daily review in all five formats and writes them to tmp-check-daily/ so the numbers can be compared with the chat card.
import { mkdirSync, writeFileSync } from "node:fs";
import { generateDocument, type DocumentFormat } from "../lib/export/generate-document";

// Runs the check: one daily-review file per format, written to tmp-check-daily/.
async function main() {
  // Replace these sample values with the figures shown on the chat card.
  const review = {
    title: "Daily Sales Review 2026-06-29",
    kpis: [
      { label: "Total orders", value: 9 },
      { label: "Paid sales (MYR)", value: "1,448.99" },
      { label: "Failed orders", value: 1 },
    ],
    columns: ["Product", "Units sold", "Sales (MYR)"],
    rows: [["Sample product", 3, "450.00"]],
  };

  const formats: DocumentFormat[] = ["csv", "excel", "word", "ppt", "pdf"];
  mkdirSync("tmp-check-daily", { recursive: true });

  for (const format of formats) {
    const doc = await generateDocument({ table: review, format, template: "daily-review" });
    writeFileSync(`tmp-check-daily/${doc.fileName}`, doc.bytes);
    console.log(format, doc.fileName, doc.bytes.byteLength, "bytes");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});