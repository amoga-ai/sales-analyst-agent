// Server proxy: starts the Eve daily sales workflow and reads its status. No model is called.
import { isSafeId } from "@/lib/api/ids";

const EVE_URL =
  process.env.AGENT4_URL ?? "https://mfjoazbxo9wcfpvgljvns8ma.72.60.234.126.sslip.io";

// Time limit for each call to the workflow. Starting a run and reading its status are both quick calls.
const UPSTREAM_TIMEOUT_MS = 15_000;

// Calls the workflow and passes its JSON reply and status back. A network error, a timeout or a reply that is not JSON becomes a 502.
async function forward(url: string, init: RequestInit = {}) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    const data = await res.json().catch(() => null);
    if (data === null) {
      return Response.json({ error: "The workflow sent a reply that could not be read." }, { status: 502 });
    }
    return Response.json(data, { status: res.status });
  } catch (error) {
    console.error("Eve No AI: request failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "The workflow is not reachable right now. Please try again." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  return forward(`${EVE_URL}/agent4/daily-sales`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: body.date }),
  });
}

export async function GET(request: Request) {
  const runId = new URL(request.url).searchParams.get("runId");
  if (!runId) return Response.json({ error: "runId required" }, { status: 400 });
  if (!isSafeId(runId)) return Response.json({ error: "Invalid runId" }, { status: 400 });
  return forward(`${EVE_URL}/agent4/daily-sales/${encodeURIComponent(runId)}`);
}
