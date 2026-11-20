// scripts/check-save-document.ts: Generates a daily-review Excel file, saves it through the same functions the route uses, then checks the file is in the folder and can be read back.
import { existsSync } from "node:fs";
import path from "node:path";
import { generateDocument } from "../lib/export/generate-document";
import { readDocument, saveDocument } from "../lib/export/saved-files";

// Runs the check without going through the login-protected route.
async function main() {
  const folder = process.env.DOCUMENT_DIR || path.join(process.cwd(), "generated-documents");

  const doc = await generateDocument({
    table: {
      title: "Daily Sales Review 2026-06-29",
      kpis: [{ label: "Total orders", value: 9 }],
      columns: ["Product", "Units sold", "Sales (MYR)"],
      rows: [["Sample product", 3, "450.00"]],
    },
    format: "excel",
    template: "daily-review",
  });

  const saved = await saveDocument(doc);
  console.log("saved", saved);
  console.log("file in folder:", existsSync(path.join(folder, saved.id)));

  const read = await readDocument(saved.id);
  console.log("read back:", read ? `${read.bytes.byteLength} bytes, ${read.mime}` : "not found");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});