// components/WorkflowChat.tsx: Workflow agent chat. Same logic as before, now using the shared ChatShell layout.
"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "@/lib/json-render/registry";
import { BotChatTransport } from "@/lib/chat/bot-transport";
import uiConfig from "@/bot-configs/sales-analyst/ui.json";
import UserBar from "@/components/UserBar";
import ChatShell, { Bubble, ChatInput } from "@/components/ChatShell";

type Ui =
  | { type: "text" }
  | { type: "choice"; options: { label: string; value: string; loading?: string }[] };

// Converts a message from our bot session into the shape useChat stores.
function toUIMessage(m: any, i: number): UIMessage {
  if ("spec" in m) {
    return { id: `s${i}`, role: "assistant", parts: [{ type: "data-spec", data: m.spec } as any] };
  }
  return { id: `m${i}`, role: m.role, parts: [{ type: "text", text: m.text }] };
}

export default function WorkflowChat({ agentSelector, model }: { agentSelector: ReactNode; model: string | null }) {
  const sessionRef = useRef<string | null>(null);
  const pendingOptionRef = useRef<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [ui, setUi] = useState<Ui>({ type: "text" });
  const [input, setInput] = useState("");
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);

  const transport = useMemo(
    () =>
      new BotChatTransport(
        () => sessionRef.current,
        () => {
          const value = pendingOptionRef.current;
          pendingOptionRef.current = undefined;
          return value;
        },
        (next) => setUi(next as Ui),
      ),
    [],
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    fetch("/api/bot-session", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        sessionRef.current = data.sessionId;
        transport.setSeen(data.messages.length);
        setMessages(data.messages.map(toUIMessage));
        setUi(data.ui);
      });
  }, [transport, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!busy) setLoadingText(null);
  }, [busy]);

  // Sends a message. For a button click, optionValue goes to the flow instead of the typed text.
  function send(text: string, optionValue?: string, loading?: string) {
    if (busy || !sessionRef.current) return;
    pendingOptionRef.current = optionValue;
    setLoadingText(loading ?? null);
    sendMessage({ text });
  }

  async function askQuickQuestion(actionId: string, label: string) {
    if (busy || quickBusy) return;
    setQuickBusy(true);
    try {
      const res = await fetch("/api/ui-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const stamp = Date.now();
      setMessages((prev) => [
        ...prev,
        { id: `u${stamp}`, role: "user", parts: [{ type: "text", text: label }] },
        { id: `a${stamp}`, role: "assistant", parts: [{ type: "data-spec", data: data.spec } as any] },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e${Date.now()}`,
          role: "assistant",
          parts: [{ type: "text", text: "Could not load that answer. Please try again." }],
        },
      ]);
    } finally {
      setQuickBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    send(text);
  }

  return (
    <ChatShell
      topBar={<UserBar />}
      title="Sales Analyst"
      subtitle="Answer the questions to run a review"
      agentSelector={agentSelector}
      footer={
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={submit}
          disabled={busy || ui.type === "choice"}
          placeholder={ui.type === "choice" ? "Tap an option above" : "Type your answer"}
          hint={model ? `Model: ${model}` : "No AI model"}
          chips={
            <div className="flex flex-wrap gap-2">
              {uiConfig.questions.map((q) => (
                <button
                  key={q.actionId}
                  type="button"
                  onClick={() => askQuickQuestion(q.actionId, q.label)}
                  disabled={busy || quickBusy}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
                >
                  {q.label}
                </button>
              ))}
            </div>
          }
        />
      }
    >
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

      {ui.type === "choice" && !busy && (
        <div className="flex flex-wrap gap-2">
          {ui.options.map((option) => (
            <button
              key={option.value}
              onClick={() => send(option.label, option.value, option.loading)}
              className="rounded-full border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-700 dark:bg-zinc-900 dark:text-indigo-300"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {busy && <p className="text-xs text-zinc-500">{loadingText ?? "Working…"}</p>}
      {error && <p className="text-xs text-red-600">Something went wrong. Please try again.</p>}
      <div ref={bottomRef} />
    </ChatShell>
  );
}