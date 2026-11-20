// lib/export/saved-files.ts: Saves a generated file to a server folder and returns its ID and download link. Reads a saved file back by ID.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GeneratedDocument } from "./generate-document";

// The folder comes from DOCUMENT_DIR if set, otherwise generated-documents/ in the project.
const DIR = process.env.DOCUMENT_DIR || path.join(process.cwd(), "generated-documents");
const MIME_BY_EXT: Record<string, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
};

export type SavedDocument = { id: string; fileName: string; mime: string; url: string };

// Writes the file to the folder under a new random ID and returns the ID and its download link.
export async function saveDocument(doc: GeneratedDocument): Promise<SavedDocument> {
  const ext = path.extname(doc.fileName).slice(1).toLowerCase();
  if (!(ext in MIME_BY_EXT)) throw new Error(`Unsupported file type: ${ext}`);

  await mkdir(DIR, { recursive: true });
  const id = `${randomUUID()}.${ext}`;
  await writeFile(path.join(DIR, id), doc.bytes);
  return { id, fileName: doc.fileName, mime: doc.mime, url: `/api/documents/${id}` };
}

// Reads a saved file by its ID. IDs that do not match the saved pattern are refused, so no other path can be read.
export async function readDocument(id: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const match = /^[0-9a-f-]{36}\.(csv|xlsx|docx|pptx|pdf)$/.exec(id);
  if (!match) return null;
  try {
    const bytes = await readFile(path.join(DIR, id));
    return { bytes: new Uint8Array(bytes), mime: MIME_BY_EXT[match[1]] };
  } catch {
    return null;
  }
}