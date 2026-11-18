// components/WooAnalystAIChat.tsx: Woo AI chat on the standard chat screen. Uses the AI SDK chat, fixed preset buttons, and cards for reports, sheets, and documents.
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ChatShell, { Bubble, ChatInput } from "@/components/ChatShell";
import UserBar from "@/components/UserBar";
import { ReportCard, useOpenArtifact } from "@/components/ArtifactProvider";
import { toolPartSpec } from "@/lib/json-render/report-layout";
import { PRESETS } from "@/lib/presets/presets";

type Props = { toolbar: ReactNode; title: string; subtitle?: string };

// Shared settings for the eye icon on file cards.
const iconButton = "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100";
const eyeIcon = (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7-10z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// A file card with an eye icon. Clicking the title or the eye opens the file in the right panel.
function FileCard({ title, meta, onOpen }: { title: string; meta: string; onOpen: () => void }) {
  return (
    <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <span className="block truncate text-sm font-medium text-zinc-900">{title}</span>
        <span className="block text-xs text-zinc-500">{meta}</span>
      </button>
      <button type="button" onClick={onOpen} aria-label="View" title="View" className={iconButton}>
        {eyeIcon}
      </button>
    </div>
  );
}

// Draws one message part: a sheet or document card, or a report card. Text is handled by the caller.
function renderPart(part: any, key: number, open: ((artifact: any) => void) | null) {
  if (part.state !== "output-available") return null;
  if (part.type === "tool-create_sheet") {
    const sheet = part.output as { title: string; csv: string };
    return <FileCard key={key} title={sheet.title} meta="Sheet · CSV" onOpen={() => open?.({ title: sheet.title, csv: sheet.csv })} />;
  }
  if (part.type === "tool-create_document") {
    const doc = part.output as { title: string; html: string };
    return <FileCard key={key} title={doc.title} meta="Document · HTML" onOpen={() => open?.({ title: doc.title, html: doc.html })} />;
  }
  if (part.type === "dynamic-tool" && part.toolName === "preset_report") {
    return <ReportCard key={key} spec={part.output.spec} />;
  }
  if (part.type === "dynamic-tool") {
    return <ReportCard key={key} spec={toolPartSpec(part.toolName, part.output)} />;
  }
  return null;
}

export default function WooAnalystAIChat({ toolbar, title, subtitle }: Props) {
  // Same agent route as before, so the answers come from the same backend.
  const [transport] = useState(() => new DefaultChatTransport({ api: "/api/agents/woo-analyst-ai/chat" }));
  const { messages, sendMessage, setMessages, status, error } = useChat({ transport });
  const open = useOpenArtifact();
  const [input, setInput] = useState("");
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
  const busy = status === "submitted" || status === "streaming";

  // Sends a typed question.
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    sendMessage({ text: input });
    setInput("");
  }

  // Runs a fixed preset report without the model, and adds the question and its card to the chat.
  async function runPreset(id: string, label: string) {
    if (loadingPreset) return;
    setLoadingPreset(id);
    const stamp = Date.now();
    setMessages((prev) => [...prev, { id: `u${stamp}`, role: "user", parts: [{ type: "text", text: label }] } as any]);
    try {
      const res = await fetch(`/api/presets/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Preset failed");
      setMessages((prev) => [
        ...prev,
        {
          id: `a${stamp}`,
          role: "assistant",
          parts: [
            ...(data.text ? [{ type: "text", text: data.text }] : []),
            { type: "dynamic-tool", toolName: "preset_report", toolCallId: `preset-${stamp}`, state: "output-available", input: {}, output: { spec: data.spec } },
          ],
        } as any,
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e${stamp}`, role: "assistant", parts: [{ type: "text", text: "That report could not be loaded. Please try again." }] } as any,
      ]);
    } finally {
      setLoadingPreset(null);
    }
  }

  return (
    <ChatShell
      topBar={<UserBar />}
      title={title}
      subtitle={subtitle}
      footer={
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={submit}
          disabled={busy}
          placeholder="Ask a question about the store"
          toolbar={toolbar}
        />
      }
    >
      {messages.length === 0 && (
        <div className="flex flex-col items-center gap-6 py-10">
          <Bubble role="assistant">Hi, I'm the Woo Analyst AI Chat. Ask me about sales, orders, products, customers, or coupons.</Bubble>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={loadingPreset !== null}
                onClick={() => runPreset(p.id, p.label)}
                className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {messages.map((m) => (
        <div key={m.id} className="flex flex-col gap-3">
          {m.parts.map((part: any, i: number) =>
            part.type === "text" ? (
              <Bubble key={i} role={m.role === "user" ? "user" : "assistant"}>
                {part.text}
              </Bubble>
            ) : (
              renderPart(part, i, open)
            ),
          )}
        </div>
      ))}
      {busy && <p className="text-xs text-zinc-500">Working…</p>}
      {error && <p className="text-xs text-red-600">Something went wrong. Please try again.</p>}
    </ChatShell>
  );
}