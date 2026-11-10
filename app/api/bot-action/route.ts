import { runDailyAction } from "@/lib/daily/actions";
import { getSession } from "@/lib/bot/session-store";
import {
  continueAfterApi,
  handle,
  openingMessages,
  reset,
  uiFor,
} from "@/lib/bot/engine";

export async function POST(req: Request) {
  const body = await req.json();
  const session = getSession(body.sessionId);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const reply = handle(session, { text: body.text, optionValue: body.optionValue });
  session.messages.push(...reply.messages);

  if (reply.runAction) {
    try {
      const result = await runDailyAction(reply.runAction, session.id);
      if (result.vars) Object.assign(session.vars, result.vars);
      if (result.spec) session.messages.push({ spec: result.spec });
      if (result.text) session.messages.push({ role: "assistant", text: result.text });
      session.messages.push(...continueAfterApi(session));
    } catch {
      session.messages.push({
        role: "assistant",
        text: "Sorry, this step could not be completed. Please check the store connection and try again.",
      });
      reset(session);
      session.messages.push(...openingMessages());
    }
  }

  return Response.json({ messages: session.messages, ui: uiFor(session) });
}