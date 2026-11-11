// Telegram webhook: receives messages and button taps, runs them through the bot flow, and replies in the chat.
import { startNode } from "@/lib/bot/conversation";
import { handle, openingMessages, uiFor } from "@/lib/bot/engine";
import { createSession, getSession } from "@/lib/bot/session-store";
import { followSteps } from "@/lib/bot/run-steps";

const g = globalThis as unknown as { __telegramChats?: Map<number, string> };
const chats = (g.__telegramChats ??= new Map<number, string>());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";

// Calls a Telegram Bot API method.
async function telegram(method: string, payload: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error("Telegram", method, await res.text());
}

// Turns a json-render spec into plain text, since Telegram cannot draw our components.
function specToText(spec: any): string {
  const lines: string[] = [];
  for (const el of Object.values<any>(spec?.elements ?? {})) {
    const p = el.props ?? {};
    if (p.title) lines.push(p.title);
    if (p.text) lines.push(p.text);
    if (p.label && p.value !== undefined) lines.push(`${p.label}: ${p.value}`);
    if (Array.isArray(p.headers) && Array.isArray(p.rows)) {
      lines.push(p.headers.join(" | "));
      for (const row of p.rows) lines.push(row.join(" | "));
    }
  }
  return lines.join("\n") || "(this section is shown in the web app)";
}

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = await req.json();
  const chatId: number | undefined = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
  if (!chatId) return Response.json({ ok: true });

  const text: string = update.message?.text?.trim() ?? "";
  const tapValue: string | undefined = update.callback_query?.data;
  if (update.callback_query) {
    await telegram("answerCallbackQuery", { callback_query_id: update.callback_query.id });
  }

  try {
    let session = chats.has(chatId) ? getSession(chats.get(chatId)!) : undefined;
    const isNew = !session || text === "/start";
    if (isNew) {
      session = createSession(startNode, openingMessages());
      chats.set(chatId, session.id);
    }

    const before = isNew ? 0 : session!.messages.length;
    if (!isNew && (text || tapValue)) {
      const reply = handle(session!, tapValue ? { optionValue: tapValue } : { text });
      session!.messages.push(...reply.messages);
      await followSteps(session!, reply);
    }

    // Send only the new replies, skipping user messages.
    const fresh = session!.messages
      .slice(before)
      .filter((m) => !("role" in m && m.role === "user"));
    const ui: any = uiFor(session!);
    const keyboard =
      ui.type === "choice"
        ? { inline_keyboard: ui.options.map((o: any) => [{ text: o.label, callback_data: o.value }]) }
        : undefined;

    for (let i = 0; i < fresh.length; i++) {
      const m: any = fresh[i];
      const body = "spec" in m ? specToText(m.spec) : m.text;
      const last = i === fresh.length - 1;
      await telegram("sendMessage", {
        chat_id: chatId,
        text: body,
        ...(last && keyboard ? { reply_markup: keyboard } : {}),
      });
    }
    if (fresh.length === 0 && keyboard) {
      await telegram("sendMessage", { chat_id: chatId, text: "Choose an option:", reply_markup: keyboard });
    }
  } catch (err) {
    console.error("Telegram flow error", err);
  }

  // Always answer 200 so Telegram does not resend the same update.
  return Response.json({ ok: true });
}