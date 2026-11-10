"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "@/lib/json-render/registry";
import uiConfig from "@/bot-configs/sales-analyst/ui.json";
import UserBar from "@/components/UserBar";

type Msg = { role: "user" | "assistant"; text: string } | { spec: any };
type Ui =
  | { type: "text" }
  | { type: "choice"; options: { label: string; value: string }[] };

export default function Page() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [ui, setUi] = useState<Ui>({ type: "text" });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/bot-session", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        setSessionId(data.sessionId);
        setMessages(data.messages);
        setUi(data.ui);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(body: { text?: string; optionValue?: string }) {
    if (!sessionId || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/bot-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages(data.messages);
      setUi(data.ui);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function askQuickQuestion(actionId: string, label: string) {
    if (busy) return;
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", text: label }]);
    try {
      const res = await fetch("/api/ui-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages((prev) => [...prev, { spec: data.spec }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Could not load that answer. Please try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    send({ text });
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <UserBar />
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-base font-semibold">Sales Analyst</h1>
        <p className="text-xs text-zinc-500">Answer the questions to run a review</p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {messages.map((m, i) =>
            "spec" in m ? (
              <div key={i} className="w-full">
                <JSONUIProvider registry={registry}>
                  <Renderer spec={m.spec} registry={registry} />
                </JSONUIProvider>
              </div>
            ) : (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            )
          )}

          {ui.type === "choice" && !busy && (
            <div className="flex flex-wrap gap-2">
              {ui.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => send({ optionValue: option.value })}
                  className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {busy && <p className="text-xs text-zinc-500">Working…</p>}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {uiConfig.questions.map((q) => (
              <button
                key={q.actionId}
                onClick={() => askQuickQuestion(q.actionId, q.label)}
                disabled={busy}
                className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs hover:border-zinc-500 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950"
              >
                {q.label}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy || ui.type === "choice"}
              placeholder={ui.type === "choice" ? "Tap an option above" : "Type your answer"}
              className="flex-1 rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
            />
            <button
              type="submit"
              disabled={busy || !input.trim() || ui.type === "choice"}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Send
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}