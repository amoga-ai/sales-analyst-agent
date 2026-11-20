// app/api/documents/[id]/route.ts: Saved document link. Downloads the file by default, or shows it inline when ?inline=1 is set.
import { readDocument } from "@/lib/export/saved-files";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await readDocument(id);
  if (!file) return Response.json({ error: "Not found" }, { status: 404 });

  const inline = new URL(request.url).searchParams.get("inline") === "1";
  // Copies the bytes into a fresh Uint8Array so TypeScript accepts them as the response body.
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "content-type": file.mime,
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${id}"`,
    },
  });
}