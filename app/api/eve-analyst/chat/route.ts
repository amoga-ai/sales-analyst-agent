// Forwards chat questions and approval answers to the analyst, with Basic credentials.
import { isSafeId } from "@/lib/api/ids";
import { fetchWithConnectTimeout } from "@/lib/api/timeout";

export const runtime = "nodejs";

// Time limit for the analyst to start answering. The streamed reply itself is not limited.
const UPSTREAM_CONNECT_TIMEOUT_MS = 60_000;

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
  const id = body.id === undefined ? "default" : body.id;
  if (!isSafeId(id)) {
    return Response.json({ error: "Invalid chat id" }, { status: 400 });
  }
  const approval = body.approval as { requestId?: string; optionId?: string } | undefined;

  let upstream: Response;

  try {
    if (approval?.requestId && approval?.optionId) {
      // An Approve or Cancel click: answer the pending approval and stream the result.
      upstream = await fetchWithConnectTimeout(
        `${base}/chat-test/${encodeURIComponent(id)}/answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body: JSON.stringify({ requestId: approval.requestId, optionId: approval.optionId }),
          cache: "no-store",
        },
        UPSTREAM_CONNECT_TIMEOUT_MS,
      );
    } else {
      // A normal question: send the last user text and stream the reply.
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const last = [...messages].reverse().find((m: { role: string }) => m.role === "user");
      const text = (last?.parts ?? [])
        .filter((p: { type: string }) => p.type === "text")
        .map((p: { text: string }) => p.text)
        .join("")
        .trim();

      upstream = await fetchWithConnectTimeout(
        `${base}/chat-test/${encodeURIComponent(id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body: JSON.stringify({ message: text }),
          cache: "no-store",
        },
        UPSTREAM_CONNECT_TIMEOUT_MS,
      );
    }
  } catch (error) {
    // The analyst is down, refused the connection, or did not start answering in time.
    console.error("Eve analyst: request failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "The analyst is not reachable right now. Please try again." }, { status: 502 });
  }

  // Passes the analyst's stream and headers straight back to the chat.
  return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
}
