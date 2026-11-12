// Telegram webhook: receives messages and button taps, runs them through the bot flow, and replies in the chat.
import { DEFAULT_FLOW, startOf } from "@/lib/bot/conversation";import { handle, openingMessages, uiFor } from "@/lib/bot/engine";
import { createSession, getSession } from "@/lib/bot/session-store";
import { followSteps } from "@/lib/bot/run-steps";

const g = globalThis as unknown as { __telegramChats?: Map<number, string> };
const chats = (g.__telegramChats ??= new Map<number, string>());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
const WEB_URL = "https://cmcl9xvxqwoxu81zkjwpxm9g.72.60.234.126.sslip.io";

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
        switch (el.type) {
            case "Card":
                if (p.title) lines.push(p.title);
                break;
            case "Text":
                if (p.content) lines.push(p.content);
                break;
            case "MetricCard":
                lines.push(`${p.label}: ${p.value}`);
                break;
            case "Table":
                if (p.title) lines.push(`\n${p.title}`);
                lines.push((p.columns ?? []).join(" | "));
                for (const row of p.rows ?? []) lines.push(row.join(" | "));
                break;
            case "BarChart":
            case "DonutChart":
                if (p.title) lines.push(`\n${p.title}`);
                (p.labels ?? []).forEach((label: string, i: number) => {
                    lines.push(`${label}: ${p.values?.[i] ?? ""}`);
                });
                break;
            case "ScatterChart":
                if (p.title) lines.push(`\n${p.title}`);
                lines.push(`(chart with ${(p.points ?? []).length} points: see ${WEB_URL})`);
                break;
            case "StoryCard":
                if (p.title) lines.push(`\n${p.title}`);
                if (p.text) lines.push(p.text);
                break;
        }
    }
    // Add a link to the web app wherever the section has a chart.
    const hasChart = Object.values<any>(spec?.elements ?? {}).some((el) =>
        ["BarChart", "DonutChart", "ScatterChart"].includes(el.type),
    );
    if (hasChart) lines.push(`\nCharts: ${WEB_URL}`);
    return lines.join("\n") || `(this section is shown in the web app: ${WEB_URL})`;
}

export async function POST(req: Request) {
    if (req.headers.get("x-telegram-bot-api-secret-token") !== SECRET) {
        return new Response("Unauthorized", { status: 401 });
    }

    const update = await req.json();
    const chatId: number | undefined =
        update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
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
            session = createSession(DEFAULT_FLOW, startOf(DEFAULT_FLOW), []);
            session.messages.push(...openingMessages(session));
            chats.set(chatId, session.id);
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
                await telegram("sendMessage", {
                    chat_id: chatId,
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