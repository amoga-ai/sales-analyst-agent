import { start } from "workflow/api";
import { salesReviewWorkflow } from "@/workflows/sales-review";
import { buildResultSpec } from "@/lib/json-render/result-layout";
import { rangeFor } from "@/lib/bot/periods";

export async function GET(req: Request) {
  const period = new URL(req.url).searchParams.get("period") ?? "last_month";
  const range = rangeFor(period);
  if (!range) {
    return Response.json({ error: "Unknown period" }, { status: 400 });
  }

  try {
    const run = await start(salesReviewWorkflow, [range]);
    const kpis = await run.returnValue;
    return Response.json({ spec: buildResultSpec(kpis, range) });
  } catch {
    return Response.json(
      { error: "Could not load sales summary" },
      { status: 500 }
    );
  }
}