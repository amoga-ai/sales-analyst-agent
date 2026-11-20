// app/api/documents/[id]/preview/route.ts: HTML view of a saved Word, Excel, or PowerPoint file. Removes officeparser's script so the CSS sheet tabs work inside the preview frame.
import { OfficeParser } from "officeparser";
import { readDocument } from "@/lib/export/saved-files";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/\.(xlsx|docx|pptx)$/.test(id)) return Response.json({ error: "No HTML view for this file" }, { status: 400 });

  const file = await readDocument(id);
  if (!file) return Response.json({ error: "Not found" }, { status: 404 });

  const ast = await OfficeParser.parseOffice(Buffer.from(file.bytes), { extractAttachments: true });
  let html = (await ast.to("html")).value as string;
  // Removes the script, so the CSS tabs are used, and sets a base address so tab links stay in the preview.
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>/i, (tag) => `${tag}<base href="about:srcdoc">`);

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}