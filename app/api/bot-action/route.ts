import { runDailyAction } from "@/lib/daily/actions";
import { runAiStep } from "@/lib/ai/step";
import { getSession, type Session } from "@/lib/bot/session-store";
import {
  continueAfterAi,
  continueAfterApi,
  handle,
  openingMessages,
  reset,
  uiFor,
  type Reply,
} from "@/lib/bot/engine";

async function followSteps(session: Session, first: Reply) {
  let reply = first;
  while (reply.runAction || reply.runAi) {
    try {
      if (reply.runAction) {
        const result = await runDailyAction(reply.runAction, session.id);
        if (result.vars) Object.assign(session.vars, result.vars);
        if (result.spec) session.messages.push({ spec: result.spec });
        if (result.text) session.messages.push({ role: "assistant", text: result.text });
        reply = continueAfterApi(session);
      } else if (reply.runAi) {
        const result = await runAiStep(reply.runAi, session.id);
        session.vars[reply.runAi.output] = result.text;
        session.messages.push({ spec: result.spec });
        reply = continueAfterAi(session);
      }
      session.messages.push(...reply.messages);
    } catch {
      session.messages.push({
        role: "assistant",
        text: "Sorry, this step could not be completed. Please check the store connection and try again.",
      });
      reset(session);
      session.messages.push(...openingMessages());
      return;
    }
  }
}

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