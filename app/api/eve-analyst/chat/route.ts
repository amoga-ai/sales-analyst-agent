// Forwards chat questions to the analyst, or approval answers to its answer route.
export const runtime = "nodejs";

export async function POST(request: Request) {
  // Reads the analyst address set in .env.local.
  const base = process.env.ANALYST_URL;
  if (!base) {
    return Response.json({ error: "ANALYST_URL is not set" }, { status: 500 });
  }

  // Reads the chat body sent by the browser.
  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : "default";
  const approval = body.approval as { requestId?: string; optionId?: string } | undefined;

  let upstream: Response;

  if (approval?.requestId && approval?.optionId) {
    // An Approve or Cancel click: answer the pending approval and stream the result.
    upstream = await fetch(`${base}/chat-test/${id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: approval.requestId, optionId: approval.optionId }),
      cache: "no-store",
    });
  } else {
    // A normal question: send the last user text and stream the reply.
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const last = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    const text = (last?.parts ?? [])
      .filter((p: { type: string }) => p.type === "text")
      .map((p: { text: string }) => p.text)
      .join("")
      .trim();

    upstream = await fetch(`${base}/chat-test/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
      cache: "no-store",
    });
  }

  // Passes the analyst's stream and headers straight back to the chat.
  return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
}