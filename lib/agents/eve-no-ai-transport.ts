// Chat transport for Eve No AI: accepts only a real YYYY-MM-DD date, starts the Eve workflow, and sends the summary back. No AI.
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

// Returns the date in the message if it is a real calendar date, otherwise null.
function parseDate(text: string): string | null {
  const match = text.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (!match) return null;
  const d = new Date(`${match}T00:00:00Z`);
  return d.toISOString().slice(0, 10) === match ? match : null;
}

export class EveNoAiTransport implements ChatTransport<UIMessage> {
  async sendMessages({
    messages,
    abortSignal,
  }: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]) {
    const last = messages[messages.length - 1];
    const text = last ? last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ") : "";
    const date = parseDate(text);

    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        // Writes one assistant text message into the chat.
        const say = (message: string) => {
          const id = crypto.randomUUID();
          controller.enqueue({ type: "text-start", id });
          controller.enqueue({ type: "text-delta", id, delta: message });
          controller.enqueue({ type: "text-end", id });
        };

        controller.enqueue({ type: "start" });

        // No valid date: ask for one and do not start a run.
        if (date === null) {
          say("Please type a real date, like 2026-06-29.");
          controller.enqueue({ type: "finish" });
          controller.close();
          return;
        }

        say(`Running the sales review for ${date}…`);

        try {
          const started = await fetch("/api/eve-no-ai/daily-sales", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ date }),
            signal: abortSignal,
          }).then((r) => r.json());

          let done = false;
          for (let i = 0; i < 60 && !done; i++) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const data = await fetch(`/api/eve-no-ai/daily-sales?runId=${started.runId}`, {
              signal: abortSignal,
            }).then((r) => r.json());

            if (data.status === "completed") {
              controller.enqueue({
                type: "data-summary",
                data: {
                  date: data.result.date,
                  total: data.result.summary.total,
                  orders: data.result.summary.orders,
                },
              } as UIMessageChunk);
              done = true;
            } else if (data.status === "failed" || data.status === "cancelled") {
              say(`The run ${data.status}.`);
              done = true;
            }
          }
          if (!done) say("Timed out waiting for the run.");
        } catch (e) {
          say(e instanceof Error ? `Something went wrong: ${e.message}` : "Something went wrong.");
        }

        controller.enqueue({ type: "finish" });
        controller.close();
      },
    });
  }

  // Runs are not resumed after a page reload, so there is no stream to reconnect to.
  async reconnectToStream() {
    return null;
  }
}