"use client";
// components/EveNoAiChat.tsx: Eve No AI chat screen. Uses the same card, format buttons, and saved-file panel as the AI chat. No AI.
import { useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import ChatShell, { ChatInput } from "./ChatShell";
import { EveNoAiTransport } from "@/lib/agents/eve-no-ai-transport";
import { ReportCard } from "@/components/ArtifactProvider";
import { dailySummarySpec } from "@/lib/json-render/summary-layout";
import PresetBar from "@/components/PresetBar";
import UserBar from "@/components/UserBar";

export default function EveNoAiChat({
    toolbar,
    welcome,
    title,
    subtitle,
}: {
    toolbar: ReactNode;
    welcome: string;
    title: string;
    subtitle?: string;
}) {
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
            topBar={<UserBar />}
            title={title}
            subtitle={subtitle}
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
            <div className="w-full space-y-4 p-4">
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
                                const spec = (part as any).data;
                                return (
                                    <div key={i} className="w-full">
                                        <ReportCard spec={spec} editable />
                                    </div>
                                );
                            }
                            if (part.type === "data-summary") {
                                const d = part.data as { date: string; total: number; orders: number; topOrders?: any[] };
                                const spec = dailySummarySpec(d);
                                return (
                                    <div key={i} className="w-full">
                                        <ReportCard spec={spec} editable />
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