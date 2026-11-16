// app/api/agents/[id]/chat/route.ts: Forwards chat questions and approval answers to the agent named in the URL, using its address from agents.json and its login from env.
export const runtime = "nodejs";

import agents from "@/lib/agents/agents.json";

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
  const chatId = typeof body.id === "string" ? body.id : "default";
  const approval = body.approval as { requestId?: string; optionId?: string } | undefined;

  let upstream: Response;

  if (approval?.requestId && approval?.optionId) {
    // An Approve or Cancel click: answer the pending approval and stream the result.
    upstream = await fetch(`${agent.url}/chat-test/${chatId}/answer`, {
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

    upstream = await fetch(`${agent.url}/chat-test/${chatId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ message: text }),
      cache: "no-store",
    });
  }

  // Passes the agent's stream and headers straight back to the chat.
  return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
}