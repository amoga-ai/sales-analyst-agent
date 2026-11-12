// app/api/bot-session/route.ts: Starts a new chat session. The page can send a flow name; without one, the sales review workflow starts.
import { openingMessages, uiFor } from "@/lib/bot/engine";
import { createSession } from "@/lib/bot/session-store";
import { flowFor, startOf } from "@/lib/bot/conversation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const flow = flowFor(body.flow);
  const session = createSession(flow, startOf(flow), []);
  session.messages.push(...openingMessages(session));
  return Response.json({
    sessionId: session.id,
    messages: session.messages,
    ui: uiFor(session),
  });
}