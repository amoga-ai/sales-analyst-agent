// Eve data analyst chat: shows the welcome message, the conversation, and Approve/Cancel buttons for expensive queries.
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { ReportCard } from "@/components/ArtifactProvider";
import { DefaultChatTransport } from "ai";
import ApprovalCard, { type ApprovalData } from "@/components/ApprovalCard";
import UserBar from "@/components/UserBar";
import ChatShell, { Bubble, ChatInput } from "@/components/ChatShell";

export default function EveAnalystChat({ toolbar, welcome }: { toolbar: ReactNode; welcome: string }) {
    // Sends chat requests to the proxy route.
    const [transport] = useState(() => new DefaultChatTransport({ api: "/api/eve-analyst/chat" }));
    const { messages, sendMessage, status, error } = useChat({ transport });
    const [input, setInput] = useState("");
    // Remembers which approvals were answered, so their buttons can't be clicked twice.
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const busy = status === "submitted" || status === "streaming";

    // Sends a typed question.
    function submit(e: FormEvent) {
        e.preventDefault();
        if (!input.trim() || busy) return;
        sendMessage({ text: input });
        setInput("");
    }

    // Sends an Approve or Cancel click as an approval answer.
    function answer(requestId: string, optionId: string) {
        setAnswers((prev) => ({ ...prev, [requestId]: optionId }));
        sendMessage(
            { text: optionId === "approve" ? "Approved" : "Cancelled" },
            { body: { approval: { requestId, optionId } } },
        );
    }

    return (
        <ChatShell
            topBar={<UserBar />}
            title="Sales Analyst"
            subtitle="Eve data analyst"
            footer={
                <ChatInput
                    value={input}
                    onChange={setInput}
                    onSubmit={submit}
                    disabled={busy}
                    placeholder="How many paying customers do we have today?"
                    toolbar={toolbar}
                />
            }
        >
            {messages.length === 0 && <Bubble role="assistant">{welcome}</Bubble>}

            {messages.map((m) => (
                <div key={m.id} className="flex flex-col gap-3">
                    {m.parts.map((part, i) => {
                        // Chat text as a bubble.
                        if (part.type === "text") {
                            return (
                                <Bubble key={i} role={m.role === "user" ? "user" : "assistant"}>
                                    {part.text}
                                </Bubble>
                            );
                        }
                        // Query result as a json-render card.
                        if (part.type === "data-spec") {
                            return <ReportCard key={i} spec={(part as any).data} />;
                        }
                        // Approval request as buttons.
                        if (part.type === "data-approval") {
                            const data = (part as any).data as ApprovalData;
                            return (
                                <div key={i} className="w-full max-w-xl">
                                    <ApprovalCard
                                        data={data}
                                        answeredWith={answers[data.requestId]}
                                        disabled={busy || Boolean(answers[data.requestId])}
                                        onAnswer={answer}
                                    />
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