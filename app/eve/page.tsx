// app/eve/page.tsx: Test chat page for the Eve agent. Shows text replies and json-render cards.
"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "@/lib/json-render/registry";
import { EveChatTransport } from "@/lib/chat/eve-transport";

export default function EvePage() {
  const [transport] = useState(() => new EveChatTransport());
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Eve agent (test)</h1>
      <div className="mb-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id}>
            <p className="text-xs uppercase text-zinc-500">{m.role}</p>
            {m.parts.map((part, i) => {
              if (part.type === "text") {
                return (
                  <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                );
              }
              if (part.type === "data-spec") {
                return (
                  <div key={i} className="w-full">
                    <JSONUIProvider registry={registry}>
                      <Renderer spec={(part as any).data} registry={registry} />
                    </JSONUIProvider>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>
      {error && <p className="mb-2 text-red-600">{error.message}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || busy) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="flex gap-2"
      >
        <input
          className="flex-1 rounded border p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Run the daily review for 2026-06-29."
          disabled={busy}
        />
        <button className="rounded bg-black px-4 py-2 text-white disabled:opacity-40" disabled={busy}>
          Send
        </button>
      </form>
    </main>
  );
}