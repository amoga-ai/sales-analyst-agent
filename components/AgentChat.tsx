// components/AgentChat.tsx: Shared chat screen for template agents. Adds optional preset buttons that run fixed report queries without a model.
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import ApprovalCard, { type ApprovalData } from "@/components/ApprovalCard";
import { reportSpec, toolPartSpec, combineSpecs } from "@/lib/json-render/report-layout";
import { DefaultChatTransport } from "ai";
import UserBar from "@/components/UserBar";
import ChatShell, { Bubble, ChatInput } from "@/components/ChatShell";
import { ReportCard } from "@/components/ArtifactProvider";
import ReportFormats from "@/components/ReportFormats";
import { specHasData } from "@/components/FormatButtons";
import PresetBar from "@/components/PresetBar";

// Turns a report result from a dynamic-tool part or a data-report part into a spec, or null if the part isn't a report.
function reportSpecOf(part: any): any | null {
    if (part.type === "dynamic-tool" && part.state === "output-available") return toolPartSpec(part.toolName, part.output);
    if (part.type === "data-report") return reportSpec(part.data.tool, part.data.output);
    return null;
}

function CardWithFormats({ spec }: { spec: any }) {
    return (
        <div className="flex w-full flex-col gap-2">
            <ReportCard spec={spec} />
            {specHasData(spec) && <ReportFormats spec={spec} />}
        </div>
    );
}

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
                                    <CardWithFormats spec={(part as any).data} />
                                </div>
                            );
                        }
                        // All report results in one message (tool parts or data-report parts) become one card with its buttons, drawn where the first one is.
                        if (reportSpecOf(part)) {
                            const reports = m.parts.filter((p) => reportSpecOf(p));
                            if (reports[0] !== part) return null;
                            const spec = combineSpecs(reports.map(reportSpecOf), "Store report");
                            return (
                                <div key={i} className="flex w-full flex-col gap-2">
                                    <ReportCard spec={spec} />
                                    {specHasData(spec) && <ReportFormats spec={spec} />}
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
                        return null;
                    })}
                </div>
            ))}
            {busy && <p className="text-xs text-zinc-500">Working…</p>}
            {error && <p className="text-xs text-red-600">Something went wrong. Please try again.</p>}
        </ChatShell>
    );
}