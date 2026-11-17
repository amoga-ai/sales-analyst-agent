"use client";
// Eve No AI chat screen: uses useChat with the Eve workflow transport, so it looks and behaves like the other agent chats. No AI.
import { useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import ChatShell, { ChatInput } from "./ChatShell";
import { EveNoAiTransport } from "@/lib/agents/eve-no-ai-transport";
import { ReportCard } from "@/components/ArtifactProvider";
import { dailySummarySpec } from "@/lib/json-render/summary-layout";
import PresetBar from "@/components/PresetBar";

export default function EveNoAiChat({ toolbar, welcome }: { toolbar: ReactNode; welcome: string }) {
    const [transport] = useState(() => new EveNoAiTransport());
    const { messages, sendMessage, setMessages, status } = useChat({ transport });
    const [input, setInput] = useState("");
    const busy = status === "submitted" || status === "streaming";

    function submit(e?: { preventDefault: () => void }) {
        e?.preventDefault();
        const text = input.trim();
        if (!text || busy) return;
        sendMessage({ text });
        setInput("");
    }

    return (
        <ChatShell
            title="Eve No AI Sales Review"
            subtitle="Workflow with no model calls"
            footer={
                <ChatInput
                    value={input}
                    onChange={setInput}
                    onSubmit={submit}
                    disabled={busy}
                    placeholder="Type a date like 2026-06-29"
                    toolbar={toolbar}
                />
            }
        >
            <div className="mx-auto max-w-3xl space-y-4 p-4">
                {messages.length === 0 && (
                    <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-2xl bg-zinc-100 px-4 py-2 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                            {welcome}
                        </div>
                    </div>

                )}
                {messages.map((m) => (
                    <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex flex-col gap-3"}>
                        {m.parts.map((part, i) => {
                            if (part.type === "text") {
                                return (
                                    <div
                                        key={i}
                                        className={
                                            m.role === "user"
                                                ? "max-w-[80%] rounded-2xl bg-indigo-600 px-4 py-2 text-white"
                                                : "max-w-[80%] rounded-2xl bg-zinc-100 px-4 py-2 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                                        }
                                    >
                                        <p>{part.text}</p>
                                    </div>
                                );
                            }
                            if (part.type === "data-spec") {
                                return (
                                    <div key={i} className="w-full">
                                        <ReportCard spec={(part as any).data} />
                                    </div>
                                );
                            }
                            if (part.type === "data-summary") {
                                const d = part.data as { date: string; total: number; orders: number };
                                return (
                                    <div key={i} className="w-full">
                                        <ReportCard spec={dailySummarySpec(d)} />
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                ))}
                <PresetBar setMessages={setMessages} />
            </div>
        </ChatShell>
    );
}