// Sends messages to our existing bot-action route and returns the reply in the stream format useChat reads.
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

export class BotChatTransport implements ChatTransport<UIMessage> {
  // Number of server messages already shown, so only new ones are streamed back.
  private seen = 0;

  constructor(
    private getSessionId: () => string | null,
    private takeOptionValue: () => string | undefined,
    private onUi: (ui: unknown) => void,
  ) {}

  async sendMessages({ messages, abortSignal }: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]) {
    const last = messages[messages.length - 1];
    const text = last
      ? last.parts.map((p) => (p.type === "text" ? p.text : "")).join("")
      : "";
    const optionValue = this.takeOptionValue();

    const res = await fetch("/api/bot-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: this.getSessionId(),
        ...(optionValue ? { optionValue } : { text }),
      }),
      signal: abortSignal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");

    this.onUi(data.ui);

    // The route returns the full history, so keep only messages we have not sent yet.
    // User messages are skipped because useChat already shows them.
    const fresh = data.messages.slice(this.seen).filter((m: any) => m.role !== "user");
    this.seen = data.messages.length;
    return toStream(fresh);
  }
  setSeen(count: number) {
    this.seen = count;
  }
  async reconnectToStream() {
    return null;
  }
}

// Turns our messages into UI message stream chunks: text replies and json-render specs.
function toStream(messages: any[]): ReadableStream<UIMessageChunk> {
  const chunks: UIMessageChunk[] = [{ type: "start" }];
  messages.forEach((m, i) => {
    if ("spec" in m) {
      chunks.push({ type: "data-spec", data: m.spec } as UIMessageChunk);
    } else {
      const id = `msg-${i}-${Date.now()}`;
      chunks.push(
        { type: "text-start", id },
        { type: "text-delta", id, delta: m.text },
        { type: "text-end", id },
      );
    }
  });
  chunks.push({ type: "finish" });

  return new ReadableStream({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(c));
      controller.close();
    },
  });
}