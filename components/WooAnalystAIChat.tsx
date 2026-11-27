// components/WooAnalystAIChat.tsx: Woo AI chat on the standard chat screen. Uses the AI SDK chat, AI-suggested follow-up buttons, and cards for reports, sheets, and documents.
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ChatShell, { Bubble, ChatInput } from "@/components/ChatShell";
import UserBar from "@/components/UserBar";
import { useOpenArtifact } from "@/components/ArtifactProvider";
import { ReportBlock } from "@/components/reports/ReportBlock";
import { toolPartSpec } from "@/lib/json-render/report-layout";

type Props = { toolbar: ReactNode; title: string; subtitle?: string; api?: string; model?: string };

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

// Shows the AI's follow-up questions as buttons. Clicking one sends it as the next question.
function SuggestionButtons({ suggestions, disabled, onPick }: { suggestions: string[]; disabled: boolean; onPick: (q: string) => void }) {
  if (suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onPick(q)}
          className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-50"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

// Draws one message part: a sheet or document card, or a report card. Text is handled by the caller.
function renderPart(part: any, key: number, open: ((artifact: any) => void) | null, replyText: string, suggestions: string[]) {
  if (part.state !== "output-available") return null;
  if (part.type === "tool-create_sheet") {
    const sheet = part.output as { title: string; csv: string };
    return <FileCard key={key} title={sheet.title} meta="Sheet · CSV" onOpen={() => open?.({ title: sheet.title, csv: sheet.csv })} />;
  }
  if (part.type === "tool-create_document") {
    const doc = part.output as { title: string; html: string };
    return <FileCard key={key} title={doc.title} meta="Document · HTML" onOpen={() => open?.({ title: doc.title, html: doc.html })} />;
  }
  if (part.type === "dynamic-tool") {
    return <ReportBlock key={key} spec={toolPartSpec(part.toolName, part.output)} text={replyText} suggestions={suggestions} />;
  }
  return null;
}

export default function WooAnalystAIChat({ toolbar, title, subtitle, api = "/api/agents/woo-analyst-ai/chat", model }: Props) {  
  const [transport] = useState(() => new DefaultChatTransport({ api }));
  const { messages, sendMessage, status, error } = useChat({ transport });
  const open = useOpenArtifact();
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  // Sends a typed question.
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    sendMessage({ text: input });
    setInput("");
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
        </div>
      )}
            {messages.map((m) => {
        // Shows only the last text block of a reply, so the answer is not repeated. The editor panel gets that same text.
        const textParts = m.parts.filter((p: any) => p.type === "text");
        const lastText: any = textParts[textParts.length - 1];
        const replyText: string = lastText?.text ?? "";
        // Only the last set of suggestions in a reply. They are drawn below the answer text.
        const suggestionParts = m.parts.filter((p: any) => p.type === "tool-suggest_followups" && p.state === "output-available");
        const lastSuggestion: any = suggestionParts[suggestionParts.length - 1];
        const suggestions: string[] = lastSuggestion?.output?.suggestions ?? [];
        return (
          <div key={m.id} className="flex flex-col gap-3">
            {m.parts.map((part: any, i: number) => {
              if (part.type === "text") {
                if (part !== lastText) return null;
                return (
                  <Bubble key={i} role={m.role === "user" ? "user" : "assistant"}>
                    {part.text}
                  </Bubble>
                );
              }
              // Suggestion parts are drawn after the loop, below the answer.
              if (part.type === "tool-suggest_followups") return null;
              return renderPart(part, i, open, replyText, suggestions);
            })}
            {lastSuggestion && suggestions.length > 0 && (
              <SuggestionButtons suggestions={suggestions} disabled={busy} onPick={(q) => sendMessage({ text: q })} />
            )}
          </div>
        );
      })}
      {busy && <p className="text-xs text-zinc-500">Working…</p>}
      {error && <p className="text-xs text-red-600">Something went wrong. Please try again.</p>}
    </ChatShell>
  );
}