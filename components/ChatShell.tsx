// components/ChatShell.tsx: Shared chat layout. Header with title and account menu, message column, and input footer with the menus under the input.
"use client";

import type { FormEvent, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatShell({
  topBar,
  title,
  subtitle,
  footer,
  children,
}: {
  topBar?: ReactNode;
  title: string;
  subtitle?: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">{title}</h1>
          {subtitle && <p className="truncate text-xs text-zinc-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">{topBar}</div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">{children}</div>
      </main>
      <footer className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl">{footer}</div>
      </footer>
    </div>
  );
}

// One chat message. User messages are dark, assistant messages are light gray.
export function Bubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  const mine = role === "user";
  // Assistant text is rendered as markdown, so tables and bold text display properly.
  const markdown = !mine && typeof children === "string";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          mine
            ? "whitespace-pre-wrap bg-indigo-600 text-white"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 [&_table]:my-2 [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_p]:my-2"
        }`}
      >
        {markdown ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown> : children}
      </div>
    </div>
  );
}

// The input bar. Optional chips sit above it, and the toolbar (model and agent menus) sits below it.
export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  chips,
  toolbar,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
  chips?: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {chips}
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white p-1.5 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
        >
          Send
        </button>
      </form>
      {toolbar}
    </div>
  );
}