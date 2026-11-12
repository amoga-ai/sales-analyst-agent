// components/EveChat.tsx: Eve agent chat. Shows the agent's welcome message first, then the conversation.
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "@/lib/json-render/registry";
import { EveChatTransport } from "@/lib/chat/eve-transport";
import UserBar from "@/components/UserBar";
import ChatShell, { Bubble, ChatInput } from "@/components/ChatShell";

export default function EveChat({ toolbar, welcome }: { toolbar: ReactNode; welcome: string }) {
  const [transport] = useState(() => new EveChatTransport());
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <ChatShell
      topBar={<UserBar />}
      title="Sales Analyst"
      subtitle="Eve agent"
      footer={
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={submit}
          disabled={busy}
          placeholder="Ask for a review, e.g. Run the daily review for 2026-06-29"
          chips={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => sendMessage({ text: "Run the daily review for 2026-06-29." })}
                disabled={busy}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
              >
                Run the daily review for 2026-06-29
              </button>
            </div>
          }
          toolbar={toolbar}
        />
      }
    >
      {messages.length === 0 && <Bubble role="assistant">{welcome}</Bubble>}

      {messages.map((m) => (
        <div key={m.id} className="flex flex-col gap-3">
          {m.parts.map((part, i) => {
            if (part.type === "text") {
              return (
                <Bubble key={i} role={m.role === "user" ? "user" : "assistant"}>
                  {part.text}
                </Bubble>
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

      {busy && <p className="text-xs text-zinc-500">Working…</p>}
      {error && <p className="text-xs text-red-600">Something went wrong. Please try again.</p>}
    </ChatShell>
  );
}