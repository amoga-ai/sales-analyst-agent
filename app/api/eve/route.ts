// app/api/eve/route.ts: Sends chat messages to Eve, turns its results into text or cards, and answers approvals with yes or no.
import { NextRequest } from "next/server";
import * as cards from "@/lib/daily/cards";

const EVE_URL = process.env.EVE_URL!;
const AUTH = "Basic " + Buffer.from(`${process.env.EVE_USERNAME}:${process.env.EVE_PASSWORD}`).toString("base64");
const pending = new Map<string, string>(); // sessionId -> interactionId of the approval waiting for an answer

type Msg = { role: "assistant"; text: string } | { spec: unknown };

function fail(message: string, status: number) {
    return Response.json({ error: message, messages: [] }, { status });
}

// Builds a card from a tool output. Returns null for outputs that have no card, so raw JSON is never shown.
function cardFor(out: any): unknown | null {
    if (out?.today && out?.dayBefore && out?.lastWeek) {
        return cards.kpiReport(out.today, out.dayBefore, out.lastWeek);
    }
    if (Array.isArray(out) && out.every((x) => x && "group" in x && "text" in x)) {
        return cards.findingsReport(out);
    }
    if (Array.isArray(out?.recommendations)) {
        return cards.recommendationsReport(out as any);
    }
    return null;
}

export async function POST(req: NextRequest) {
    let sessionId: string | undefined;
    let text = "";
    try {
        ({ sessionId, text } = await req.json());
    } catch {
        return fail("The message could not be read.", 400);
    }

    const headers = { Authorization: AUTH, "Content-Type": "application/json" };
    const waitingOn = sessionId ? pending.get(sessionId) : undefined;

    // While an approval is waiting, "yes" or "no" answers it. Plain text would cancel it.
    let body: Record<string, unknown> = { message: text };
    if (waitingOn && /^(yes|approve)$/i.test(text.trim())) {
        body = { answers: [{ interactionId: waitingOn, optionId: "approve" }] };
    } else if (waitingOn && /^(no|deny)$/i.test(text.trim())) {
        body = { answers: [{ interactionId: waitingOn, optionId: "deny" }] };
    }

    const url = sessionId ? `${EVE_URL}/eve/v1/session/${sessionId}` : `${EVE_URL}/eve/v1/session`;

    let sent: Response;
    try {
        sent = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    } catch (err) {
        console.log("[eve] send failed:", String(err));
        return fail("Eve is not reachable right now. Please try again in a moment.", 503);
    }
    console.log("[eve] send", Object.keys(body)[0], "status", sent.status);
    if (!sent.ok) return fail("Eve did not accept the message.", 502);

    const data = await sent.json().catch(() => null);
    const deliveryId = data?.deliveryId;
    const id = sessionId ?? sent.headers.get("x-eve-session-id");
    if (!deliveryId || !id) return fail("Eve sent an unexpected reply.", 502);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    const messages: Msg[] = [];
    let mine = false;
    let streamFailed = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    try {
        const stream = await fetch(`${EVE_URL}/eve/v1/session/${id}/stream`, { headers, signal: controller.signal });
        reader = stream.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;

        while (!done) {
            const { value, done: ended } = await reader.read();
            if (ended) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (!line.trim()) continue;
                let record: any;
                try {
                    record = JSON.parse(line);
                } catch {
                    continue; // skip a malformed line and keep reading
                }

                for (const fact of record.facts ?? []) {
                    if (fact.type === "delivery.admitted" && fact.data?.deliveryId === deliveryId) mine = true;
                    if (!mine) continue;

                    if (fact.type === "content.completed" && fact.data?.kind === "text" && fact.data?.phase === "reply") {
                        messages.push({ role: "assistant", text: fact.data.value });
                    }
                    if (fact.type === "call.settled" && fact.data?.output) {
                        const card = cardFor(fact.data.output);
                        if (card) messages.push({ spec: card });
                    }
                    if (fact.type === "interaction.opened" && fact.data?.interactionId) {
                        pending.set(id, fact.data.interactionId);
                        messages.push({ role: "assistant", text: `${fact.data.request?.title ?? "Approval needed"}. Reply "yes" to approve or "no" to deny.` });
                    }
                    if (fact.type === "interaction.settled") pending.delete(id);
                    if (fact.type === "turn.paused" || (fact.type === "delivery.settled" && fact.data?.deliveryId === deliveryId)) {
                        done = true;
                    }
                }
            }
        }
    } catch (err) {
        streamFailed = true;
        console.log("[eve] stream stopped:", String(err));
    } finally {
        clearTimeout(timer);
        await reader?.cancel().catch(() => {});
    }

    if (streamFailed && messages.length === 0) {
        return fail("Eve stopped responding. Please try again.", 504);
    }
    return Response.json({ sessionId: id, messages });
}