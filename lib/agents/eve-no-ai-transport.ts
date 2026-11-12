// Chat transport for Eve No AI: starts the Eve workflow, waits for it, and sends the summary back as a chat message. No AI.
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

const DEFAULT_DATE = "2026-06-29";

export class EveNoAiTransport implements ChatTransport<UIMessage> {
  async sendMessages({
    messages,
    abortSignal,
  }: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]) {
    // Use a YYYY-MM-DD date in the message if there is one, otherwise the default date.
    const last = messages[messages.length - 1];
    const text = last ? last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ") : "";
    const date = text.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? DEFAULT_DATE;

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