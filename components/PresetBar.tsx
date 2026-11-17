// Shared preset buttons. Each click adds the label and a loading bubble to the chat, then replaces the bubble with the sentence and chart.
"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { UIMessage } from "ai";
import { PRESETS } from "@/lib/presets/presets";

export default function PresetBar({
  setMessages,
}: {
  setMessages: Dispatch<SetStateAction<UIMessage[]>>;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Adds the label and a loading bubble, then swaps the bubble for the report.
  async function run(id: string, label: string) {
    const stamp = Date.now();
    const replyId = `a${stamp}`;
    setLoadingId(id);
    setMessages((prev) => [
      ...prev,
      { id: `u${stamp}`, role: "user", parts: [{ type: "text", text: label }] },
      { id: replyId, role: "assistant", parts: [{ type: "text", text: "Loading report…" }] },
    ]);
    try {
      const res = await fetch(`/api/presets/${id}`);
      if (!res.ok) throw new Error("Preset failed");
      const { text, spec } = (await res.json()) as { text?: string; spec: any };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === replyId
            ? {
                ...m,
                parts: [...(text ? [{ type: "text" as const, text }] : []), { type: "data-spec", data: spec } as any],
              }
            : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === replyId
            ? { ...m, parts: [{ type: "text" as const, text: "That report could not be loaded. Please try again." }] }
            : m,
        ),
      );
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => run(p.id, p.label)}
          disabled={loadingId !== null}
          className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}