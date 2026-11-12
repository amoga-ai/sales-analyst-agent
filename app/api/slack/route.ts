// Slack endpoint: verifies Slack requests, runs messages and button clicks through the bot flow, and replies in the chat.
import { createHmac, timingSafeEqual } from "crypto";
import { after } from "next/server";
import { DEFAULT_FLOW, startOf } from "@/lib/bot/conversation";import { handle, openingMessages, uiFor } from "@/lib/bot/engine";
import { createSession, getSession } from "@/lib/bot/session-store";
import { followSteps } from "@/lib/bot/run-steps";
import { specToText } from "@/lib/bot/spec-to-text";

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? "";
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN ?? "";

const g = globalThis as unknown as { __slackChats?: Map<string, string> };
const chats = (g.__slackChats ??= new Map<string, string>());

// Checks that the request really came from Slack, using the signing secret.
function isFromSlack(raw: string, timestamp: string | null, signature: string | null) {
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5) return false;
  const expected = "v0=" + createHmac("sha256", SIGNING_SECRET).update(`v0:${timestamp}:${raw}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Calls a Slack Web API method.
async function slack(method: string, payload: unknown) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${BOT_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) console.error("Slack", method, data.error);
}

// Runs one message or button tap through the flow and posts the new replies to the chat.
async function runTurn(channel: string, userId: string, text: string | undefined, tapValue: string | undefined) {
  let session = chats.has(userId) ? getSession(chats.get(userId)!) : undefined;
  const isNew = !session || text?.toLowerCase() === "start";
  if (isNew) {
    session = createSession(DEFAULT_FLOW, startOf(DEFAULT_FLOW), []);
    session.messages.push(...openingMessages(session));
    chats.set(userId, session.id);
  }

  const before = isNew ? 0 : session!.messages.length;
  const prevUi: any = uiFor(session!);

  if (!isNew && (text || tapValue)) {
    const reply = handle(session!, tapValue ? { optionValue: tapValue } : { text });
    session!.messages.push(...reply.messages);

    // Tell the user the bot is busy before a slow API or AI step runs.
    if (reply.runAction || reply.runAi) {
      const loading = tapValue
        ? prevUi.options?.find((o: any) => o.value === tapValue)?.loading
        : undefined;
      await slack("chat.postMessage", {
        channel,
        text: loading ?? "Working on it… this can take up to a minute.",
      });
    }

    await followSteps(session!, reply);
  }

  // Send only the new replies, skipping user messages.
  const fresh = session!.messages
    .slice(before)
    .filter((m) => !("role" in m && m.role === "user"));
  const ui: any = uiFor(session!);
  const buttons =
    ui.type === "choice"
      ? ui.options.slice(0, 5).map((o: any, i: number) => ({
          type: "button",
          text: { type: "plain_text", text: o.label },
          action_id: `flow_${i}`,
          value: o.value,
        }))
      : undefined;

  for (let i = 0; i < fresh.length; i++) {
    const m: any = fresh[i];
    const body: string = ("spec" in m ? specToText(m.spec) : m.text).slice(0, 2900);
    const last = i === fresh.length - 1;
    await slack("chat.postMessage", {
      channel,
      text: body,
      ...(last && buttons
        ? {
            blocks: [
              { type: "section", text: { type: "mrkdwn", text: body } },
              { type: "actions", elements: buttons },
            ],
          }
        : {}),
    });
  }

  if (fresh.length === 0 && buttons) {
    await slack("chat.postMessage", {
      channel,
      text: "Choose an option:",
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: "Choose an option:" } },
        { type: "actions", elements: buttons },
      ],
    });
  }
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!isFromSlack(raw, req.headers.get("x-slack-request-timestamp"), req.headers.get("x-slack-signature"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Button clicks arrive as form data with a JSON payload.
  if ((req.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded")) {
    const payload = JSON.parse(new URLSearchParams(raw).get("payload") ?? "{}");
    const action = payload.actions?.[0];
    if (payload.type === "block_actions" && action) {
      const channel = payload.channel.id;
      const userId = payload.user.id;
      after(() =>
        runTurn(channel, userId, undefined, action.value).catch((err) =>
          console.error("Slack flow error", err),
        ),
      );
    }
    return new Response("", { status: 200 });
  }

  const body = JSON.parse(raw);

  // Slack's setup check when you save the Request URL.
  if (body.type === "url_verification") {
    return Response.json({ challenge: body.challenge });
  }

  const event = body.event;
  if (event && !event.bot_id && (event.type === "app_mention" || (event.type === "message" && event.channel_type === "im"))) {
    const text: string = (event.text ?? "").replace(/<@[^>]+>/g, "").trim();
    after(() =>
      runTurn(event.channel, event.user, text, undefined).catch((err) =>
        console.error("Slack flow error", err),
      ),
    );
  }

  // Answer quickly, because Slack retries if it waits too long.
  return new Response("", { status: 200 });
}