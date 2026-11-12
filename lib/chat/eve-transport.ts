// lib/chat/eve-transport.ts: Sends each chat message to our /api/eve route and returns the reply to useChat.
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

export class EveChatTransport implements ChatTransport<UIMessage> {
  private sessionId: string | null = null;

  async sendMessages({ messages, abortSignal }: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]) {
    const last = messages[messages.length - 1];
    const text = last ? last.parts.map((p) => (p.type === "text" ? p.text : "")).join("") : "";

    const res = await fetch("/api/eve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: this.sessionId, text }),
      signal: abortSignal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");

    this.sessionId = data.sessionId;
    return toStream(data.messages);
  }

  async reconnectToStream() {
    return null;
  }
}

// Turns the replies into UI message stream chunks: text replies and json-render cards.
function toStream(messages: any[]): ReadableStream<UIMessageChunk> {
  const chunks: UIMessageChunk[] = [{ type: "start" }];
  messages.forEach((m, i) => {
    if ("spec" in m) {
      chunks.push({ type: "data-spec", data: m.spec } as UIMessageChunk);
    } else {
      const id = `eve-${i}-${Date.now()}`;
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