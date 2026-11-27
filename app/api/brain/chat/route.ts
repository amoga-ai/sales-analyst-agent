// Forwards a chat question to the company brain for the signed-in user. Returns the reply text and any cards the brain built.
import { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { getSession } from "@/lib/auth/session";

const SAFE_ID = /^[A-Za-z0-9_-]{1,100}$/;

export async function POST(req: NextRequest) {
  // Reads the brain address, login, and shared secret from the environment.
  const base = process.env.BRAIN_URL;
  const user = process.env.BRAIN_USER;
  const password = process.env.BRAIN_PASSWORD;
  const secret = process.env.BRAIN_SHARED_SECRET;
  if (!base || !user || !password || !secret) {
    return Response.json({ error: "BRAIN settings are not set" }, { status: 500 });
  }

  // Uses the user from the sales app's own login check, never a value from the browser.
  const me = await getSession();
  if (!me) return Response.json({ error: "Please log in." }, { status: 401 });
  const userId = me.id;
  const sig = createHmac("sha256", secret).update(userId).digest("base64url");

  const headers = {
    Authorization: "Basic " + Buffer.from(`${user}:${password}`).toString("base64"),
    "Content-Type": "application/json",
    "X-App-User-Id": userId,
    "X-App-User-Sig": sig,
  };
  const { text, sessionId } = await req.json();

  // A missing sessionId starts a new session; any other value must be a safe id.
  if (sessionId != null && !SAFE_ID.test(sessionId)) {
    return Response.json({ error: "Invalid session id." }, { status: 400 });
  }

  // Sends the question to the existing session, or to a new one.
  const url = sessionId ? `${base}/eve/v1/session/${encodeURIComponent(sessionId)}` : `${base}/eve/v1/session`;
  const started = await fetch(url, { method: "POST", headers, body: JSON.stringify({ message: text }) });
  if (!started.ok) return Response.json({ error: "The company brain did not accept the message." }, { status: 502 });
  const sent = await started.json().catch(() => null);
  const deliveryId = sent?.deliveryId;
  const id = started.headers.get("x-eve-session-id") ?? sessionId;
  if (!deliveryId || !id) return Response.json({ error: "The company brain sent an unexpected reply." }, { status: 502 });

  // Reads the streamed records and keeps only the reply and cards for this message.
  const stream = await fetch(`${base}/eve/v1/session/${encodeURIComponent(id)}/stream`, { headers });
  const raw = await stream.text();
  let mine = false;
  let reply = "";
  const specs: unknown[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let record: any;
    try {
      record = JSON.parse(line);
    } catch {
      continue; // skips lines that are not JSON, such as heartbeats
    }
    for (const fact of record.facts ?? []) {
      if (fact.type === "delivery.admitted" && fact.data?.deliveryId === deliveryId) mine = true;
      if (!mine) continue;
      if (fact.type === "content.completed" && fact.data?.kind === "text" && fact.data?.phase === "reply") {
        reply = fact.data.value;
      }
      // A card comes from the show_card tool's output.
      if (fact.type === "call.settled" && fact.data?.output?.spec) {
        specs.push(fact.data.output.spec);
      }
    }
  }
  return Response.json({ sessionId: id, reply, specs });
}