// components/AgentChat.tsx: Shared chat screen for template agents. Adds optional preset buttons that run fixed report queries without a model.
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import ApprovalCard, { type ApprovalData } from "@/components/ApprovalCard";
import { registry } from "@/lib/json-render/registry";
import { reportSpec, toolPartSpec } from "@/lib/json-render/report-layout";
import { DefaultChatTransport } from "ai";
import UserBar from "@/components/UserBar";
import ChatShell, { Bubble, ChatInput } from "@/components/ChatShell";
import { ReportCard } from "@/components/ArtifactProvider";
import PresetBar from "@/components/PresetBar";

export default function AgentChat({
    agentId,
    title,
    subtitle,
    toolbar,
    welcome,
    placeholder,
    presets = [],
}: {
    agentId: string;
    title: string;
    subtitle?: string;
    toolbar: ReactNode;
    welcome: string;
    placeholder?: string;
    presets?: { id: string; label: string }[];
}) {
    // Sends chat requests to this agent's proxy route.
    const [transport] = useState(() => new DefaultChatTransport({ api: `/api/agents/${agentId}/chat` }));
    const { messages, sendMessage, setMessages, status, error } = useChat({ transport });
    const [input, setInput] = useState("");
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [presetCards, setPresetCards] = useState<{ id: string; spec: any }[]>([]);
    const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
    const [presetError, setPresetError] = useState<string | null>(null);
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
            {presets.length > 0 && <PresetBar setMessages={setMessages} />}
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
                                    <ReportCard spec={(part as any).data} />
                                </div>
                            );
                        }
                        // MCP report tool results (dynamic tools), drawn as a table or chart.
                        if (part.type === "dynamic-tool" && (part as any).state === "output-available") {
                            return <ReportCard key={i} spec={toolPartSpec((part as any).toolName, (part as any).output)} />;
                        }
                        // WooCommerce report results, drawn as a bar chart.
                        if (part.type === "data-report") {
                            const report = (part as any).data as { tool: string; output: unknown };
                            return <ReportCard key={i} spec={reportSpec(report.tool, report.output)} />;
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