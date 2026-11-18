// app/api/agents/[id]/chat/route.ts: Forwards chat questions and approval answers to the agent named in the URL, using its address from agents.json and its login from env.
export const runtime = "nodejs";

import agents from "@/lib/agents/agents.json";
import { isSafeId } from "@/lib/api/ids";
import { fetchWithConnectTimeout } from "@/lib/api/timeout";

// Time limit for the agent to start answering. The streamed reply itself is not limited.
const UPSTREAM_CONNECT_TIMEOUT_MS = 60_000;

type AgentEntry = { id: string; url: string };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Finds the agent by id in agents.json. Next 16 passes params as a Promise, so it is awaited.
  const { id } = await params;
  const agent = (agents as AgentEntry[]).find((a) => a.id === id);
  if (!agent?.url) {
    return Response.json({ error: `Agent ${id} has no url in agents.json` }, { status: 404 });
  }

  // Builds the env names from the id, so woo-analyst reads WOO_ANALYST_USER and WOO_ANALYST_PASSWORD.
  const prefix = id.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const user = process.env[`${prefix}_USER`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!user || !password) {
    return Response.json({ error: `${prefix}_USER or ${prefix}_PASSWORD is not set` }, { status: 500 });
  }
  const authHeader = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

  // Reads the chat body sent by the browser.
  const body = await request.json();
  const chatId = body.id === undefined ? "default" : body.id;
  if (!isSafeId(chatId)) {
    return Response.json({ error: "Invalid chat id" }, { status: 400 });
  }
  const approval = body.approval as { requestId?: string; optionId?: string } | undefined;

  let upstream: Response;

  try {
    if (approval?.requestId && approval?.optionId) {
      // An Approve or Cancel click: answer the pending approval and stream the result.
      upstream = await fetchWithConnectTimeout(`${agent.url}/chat-test/${encodeURIComponent(chatId)}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ requestId: approval.requestId, optionId: approval.optionId }),
        cache: "no-store",
      }, UPSTREAM_CONNECT_TIMEOUT_MS);
    } else {
      // A normal question: send the last user text and stream the reply.
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const last = [...messages].reverse().find((m: { role: string }) => m.role === "user");
      const text = (last?.parts ?? [])
        .filter((p: { type: string }) => p.type === "text")
        .map((p: { text: string }) => p.text)
        .join("")
        .trim();

      upstream = await fetchWithConnectTimeout(`${agent.url}/chat-test/${encodeURIComponent(chatId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ message: text }),
        cache: "no-store",
      }, UPSTREAM_CONNECT_TIMEOUT_MS);
    }
  } catch (error) {
    // The agent is down, refused the connection, or did not start answering in time.
    console.error(`Agent ${id}: request failed:`, error instanceof Error ? error.message : error);
    return Response.json({ error: `Agent ${id} is not reachable right now. Please try again.` }, { status: 502 });
  }

  // Passes the agent's stream and headers straight back to the chat.
  return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
}