// Server proxy: starts the Eve daily sales workflow and reads its status. No model is called.
const EVE_URL =
  process.env.AGENT4_URL ?? "https://mfjoazbxo9wcfpvgljvns8ma.72.60.234.126.sslip.io";

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(`${EVE_URL}/agent4/daily-sales`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: body.date }),
  });
  return Response.json(await res.json(), { status: res.status });
}

export async function GET(request: Request) {
  const runId = new URL(request.url).searchParams.get("runId");
  if (!runId) return Response.json({ error: "runId required" }, { status: 400 });
  const res = await fetch(`${EVE_URL}/agent4/daily-sales/${runId}`);
  return Response.json(await res.json(), { status: res.status });
}