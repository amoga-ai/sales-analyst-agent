import { startNode } from "@/lib/bot/conversation";
import { openingMessages, uiFor } from "@/lib/bot/engine";
import { createSession } from "@/lib/bot/session-store";

export async function POST() {
  const session = createSession(startNode, openingMessages());
  return Response.json({
    sessionId: session.id,
    messages: session.messages,
    ui: uiFor(session),
  });
}