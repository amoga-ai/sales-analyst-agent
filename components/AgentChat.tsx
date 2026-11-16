// components/AgentChat.tsx: Shared chat screen for template agents. Takes the agent id, title, and welcome from agents.json through app/page.tsx.
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "@/lib/json-render/registry";
import { DefaultChatTransport } from "ai";
import UserBar from "@/components/UserBar";
import { reportSpec } from "@/lib/json-render/report-layout";
import ChatShell, { Bubble, ChatInput } from "@/components/ChatShell";

// The approval data sent by the agent channel as a data-approval part.
type ApprovalData = {
    requestId: string;
    prompt: string;
    purpose: string;
    options: { id: string; label: string }[];
};

// Shows the approval request with one button per option.
function ApprovalCard({
    data,
    answeredWith,
    disabled,
    onAnswer,
}: {
    data: ApprovalData;
    answeredWith?: string;
    disabled: boolean;
    onAnswer: (requestId: string, optionId: string) => void;
}) {
    return (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-700 dark:bg-amber-950">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">This query is expensive and needs your approval.</p>
            {data.purpose && <p className="mt-1 text-zinc-700 dark:text-zinc-300">{data.purpose}</p>}
            {answeredWith ? (
                <p className="mt-3 text-xs text-zinc-500">Answered: {answeredWith}</p>
            ) : (
                <div className="mt-3 flex gap-2">
                    {data.options.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => onAnswer(data.requestId, option.id)}
                            className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-zinc-800 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function reportRows(output: unknown): unknown {
    if (Array.isArray(output)) return output;
    if (typeof output === "string") {
        try { return JSON.parse(output); } catch { return output; }
    }
    const content = (output as { content?: { type: string; text?: string }[] })?.content;
    const text = content?.find((c) => c.type === "text")?.text;
    if (text) {
        try { return JSON.parse(text); } catch { return output; }
    }
    return output;
}

export default function AgentChat({
    agentId,
    title,
    subtitle,
    toolbar,
    welcome,
    placeholder,
}: {
    agentId: string;
    title: string;
    subtitle?: string;
    toolbar: ReactNode;
    welcome: string;
    placeholder?: string;
}) {
    // Sends chat requests to this agent's proxy route.
    const [transport] = useState(() => new DefaultChatTransport({ api: `/api/agents/${agentId}/chat` }));
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
            title={title}
            subtitle={subtitle}
            footer={
                <ChatInput
                    value={input}
                    onChange={setInput}
                    onSubmit={submit}
                    disabled={busy}
                    placeholder={placeholder}
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
                            return (
                                <div key={i} className="w-full">
                                    <JSONUIProvider registry={registry}>
                                        <Renderer spec={(part as any).data} registry={registry} />
                                    </JSONUIProvider>
                                </div>
                            );
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
                        if (part.type === "dynamic-tool" && (part as any).state === "output-available") {
                            const name = (part as any).toolName as string;
                            const tool = name.startsWith("woocommerce__") ? name : `woocommerce__${name}`;
                            return (
                                <div key={i} className="w-full">
                                    <JSONUIProvider registry={registry}>
                                        <Renderer spec={reportSpec(tool, reportRows((part as any).output))} registry={registry} />
                                    </JSONUIProvider>
                                </div>
                            );
                        }
                        if (part.type === "data-report") {
                            const report = (part as any).data as { tool: string; output: unknown };
                            return (
                                <div key={i} className="w-full">
                                    <JSONUIProvider registry={registry}>
                                        <Renderer spec={reportSpec(report.tool, report.output)} registry={registry} />
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