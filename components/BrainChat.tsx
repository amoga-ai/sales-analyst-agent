// Eve combrain chat screen. Keeps one brain session per chat, and draws any cards the brain sends with json-render.
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "@/lib/json-render/registry";
import ChatShell, { Bubble, ChatInput } from "@/components/ChatShell";
import UserBar from "@/components/UserBar";

type Line = { role: "user" | "assistant"; text?: string; spec?: unknown };

export default function BrainChat({ toolbar, welcome, title, subtitle }: { toolbar: ReactNode; welcome: string; title: string; subtitle: string }) {
    const [lines, setLines] = useState<Line[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    // The brain session for this chat. Empty until the first answer comes back.
    const [sessionId, setSessionId] = useState<string | undefined>(undefined);

    // Sends a typed question with the current session, then adds the reply and any cards.
    async function submit(e: FormEvent) {
        e.preventDefault();
        const text = input.trim();
        if (!text || busy) return;
        setInput("");
        setLines((prev) => [...prev, { role: "user", text }]);
        setBusy(true);
        try {
            const res = await fetch("/api/brain/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, sessionId }),
            });
            const data = await res.json();
            if (res.ok && data.sessionId) setSessionId(data.sessionId);
            if (!res.ok) {
                setLines((prev) => [...prev, { role: "assistant", text: data.error || "No reply." }]);
                return;
            }
            const added: Line[] = [{ role: "assistant", text: data.reply || "No reply." }];
            for (const spec of data.specs ?? []) added.push({ role: "assistant", spec });
            setLines((prev) => [...prev, ...added]);
        } catch {
            setLines((prev) => [...prev, { role: "assistant", text: "The company brain could not be reached." }]);
        } finally {
            setBusy(false);
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
                    placeholder="Ask the company brain"
                    toolbar={toolbar}
                />
            }
        >
            {lines.length === 0 && <Bubble role="assistant">{welcome}</Bubble>}
            {lines.map((line, i) =>
                line.spec ? (
                    <JSONUIProvider key={i} registry={registry}>
                        <Renderer spec={line.spec as any} registry={registry} />
                    </JSONUIProvider>
                ) : (
                    <Bubble key={i} role={line.role}>
                        {line.text}
                    </Bubble>
                ),
            )}
            {busy && <Bubble role="assistant">Thinking...</Bubble>}
        </ChatShell>
    );
}