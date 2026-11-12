// lib/bot/run-steps.ts: Runs flow steps (API actions and AI steps) until the flow needs the user's answer. Logs the real error before showing a generic message.
import { runDailyAction } from "@/lib/daily/actions";
import { runAiStep } from "@/lib/ai/step";
import type { Session } from "@/lib/bot/session-store";
import {
  continueAfterAi,
  continueAfterApi,
  openingMessages,
  reset,
  type Reply,
} from "@/lib/bot/engine";

export async function followSteps(session: Session, first: Reply) {
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
    } catch (err) {
      // The real reason is printed in the terminal. The chat only shows the generic message.
      console.error("[bot] step failed:", err);
      session.messages.push({
        role: "assistant",
        text: "Sorry, this step could not be completed. Please check the store connection and try again.",
      });
      reset(session);
      session.messages.push(...openingMessages(session));
      return;
    }
  }
}