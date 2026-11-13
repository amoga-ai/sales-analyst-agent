// Forwards chat questions and approval answers to the analyst, with Basic credentials.
export const runtime = "nodejs";

export async function POST(request: Request) {
  // Reads the analyst address and credentials from the environment.
  const base = process.env.ANALYST_URL;
  const user = process.env.ANALYST_USER;
  const password = process.env.ANALYST_PASSWORD;
  if (!base || !user || !password) {
    return Response.json({ error: "ANALYST_URL, ANALYST_USER, or ANALYST_PASSWORD is not set" }, { status: 500 });
  }
  const authHeader = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

  // Reads the chat body sent by the browser.
  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : "default";
  const approval = body.approval as { requestId?: string; optionId?: string } | undefined;

  let upstream: Response;

  if (approval?.requestId && approval?.optionId) {
    // An Approve or Cancel click: answer the pending approval and stream the result.
    upstream = await fetch(`${base}/chat-test/${id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
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
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ message: text }),
      cache: "no-store",
    });
  }

  // Passes the analyst's stream and headers straight back to the chat.
  return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
}