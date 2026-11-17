// Test page: runs the Woo AI agent through useChat and shows the assistant-ui Thread. Report tool results show as cards in the chat, and the created dashboard opens in the right panel.
"use client";

import { useState, type PropsWithChildren } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AssistantRuntimeProvider, type ToolCallMessagePartComponent } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/thread.aui";
import { ArtifactProvider, ReportCard, useOpenArtifact } from "@/components/ArtifactProvider";
import { toolPartSpec } from "@/lib/json-render/report-layout";

// Shows each tool result in the chat. Report tools show a report card, and create_document shows a card that opens the HTML in the right panel.
const ChatToolFallback: ToolCallMessagePartComponent = ({ toolName, result }) => {
  const open = useOpenArtifact();
  if (!result) return null;
  if (toolName === "create_document") {
    const doc = result as { title: string; html: string };
    return (
      <button
        type="button"
        onClick={() => open?.({ title: doc.title, html: doc.html })}
        className="flex w-full max-w-md items-center gap-3 rounded-xl border border-zinc-300 bg-white p-3 text-left shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-zinc-900">{doc.title}</span>
          <span className="block text-xs text-zinc-500">Document · HTML · Opens in panel</span>
        </span>
      </button>
    );
  }
  return <ReportCard spec={toolPartSpec(toolName, result)} />;
};

// Shows the tool results one after another, without the "N tool calls" box that hides them.
const PlainToolGroup = ({ children }: PropsWithChildren) => (
  <div className="flex flex-col gap-3 pb-4">{children}</div>
);

export default function TestAssistantUI() {
  // Same agent route the Woo AI chat uses, so the answers come from the same backend.
  const [transport] = useState(() => new DefaultChatTransport({ api: "/api/agents/woo-analyst-ai/chat" }));
  const chat = useChat({ transport });
  const runtime = useAISDKRuntime(chat);

  return (
    <ArtifactProvider>
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="h-screen">
          <Thread components={{ ToolFallback: ChatToolFallback, ToolGroup: PlainToolGroup }} />
        </div>
      </AssistantRuntimeProvider>
    </ArtifactProvider>
  );
}