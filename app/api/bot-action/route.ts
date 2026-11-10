import { start } from "workflow/api";
import { salesReviewWorkflow } from "@/workflows/sales-review";
import { buildResultSpec } from "@/lib/json-render/result-layout";
import { rangeFor } from "@/lib/bot/periods";
import { getSession } from "@/lib/bot/session-store";
import { handle, openingMessages, reset, uiFor } from "@/lib/bot/engine";

export async function POST(req: Request) {
  const body = await req.json();
  const session = getSession(body.sessionId);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const reply = handle(session, { text: body.text, optionValue: body.optionValue });
  session.messages.push(...reply.messages);

  if (reply.runPeriod) {
    if (reply.runWorkflow === "sales_team_review") {
      session.messages.push({
        role: "assistant",
        text: "Sales Team Review is not available yet.",
      });
    } else {
      session.messages.push({ role: "assistant", text: "Running your review…" });
      try {
        const range = rangeFor(reply.runPeriod);
        if (!range) throw new Error("Unknown period");
        const run = await start(salesReviewWorkflow, [range]);
        const kpis = await run.returnValue;
        session.messages.push({ spec: buildResultSpec(kpis, range) });
      } catch {
        session.messages.push({
          role: "assistant",
          text: "Sorry, the review could not be completed.",
        });
      }
    }
    reset(session);
    session.messages.push(...openingMessages());
  }

  return Response.json({ messages: session.messages, ui: uiFor(session) });
}