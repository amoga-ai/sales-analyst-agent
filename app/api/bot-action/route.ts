// Web chat endpoint: applies a typed answer or button tap to the flow, then runs any steps that follow.
import { getSession } from "@/lib/bot/session-store";
import { followSteps } from "@/lib/bot/run-steps";
import { handle, uiFor } from "@/lib/bot/engine";

export async function POST(req: Request) {
  const body = await req.json();
  const session = getSession(body.sessionId);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const reply = handle(session, { text: body.text, optionValue: body.optionValue });
  session.messages.push(...reply.messages);
  await followSteps(session, reply);

  return Response.json({ messages: session.messages, ui: uiFor(session) });
}