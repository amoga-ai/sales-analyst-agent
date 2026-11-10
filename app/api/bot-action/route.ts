import { salesKpis } from "@/lib/sales/kpis";
import { buildResultSpec } from "@/lib/json-render/result-layout";
import { rangeFor } from "@/lib/bot/periods";
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

  if (reply.runAction === "sales_summary") {
    try {
      const range = rangeFor(session.vars.review_period);
      if (!range) throw new Error("Unknown period");
      const kpis = await salesKpis(range.from, range.to);
      session.messages.push({ spec: buildResultSpec(kpis, range) });
      session.messages.push(...continueAfterApi(session));
    } catch {
      session.messages.push({
        role: "assistant",
        text: "Sorry, the review could not be completed.",
      });
      reset(session);
      session.messages.push(...openingMessages());
    }
  }

  return Response.json({ messages: session.messages, ui: uiFor(session) });
}