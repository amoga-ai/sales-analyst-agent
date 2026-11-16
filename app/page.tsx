// app/page.tsx: Chat page. Holds the selected agent and model, and picks the chat screen by agent transport.
"use client";

import { useState } from "react";
import agents from "@/lib/agents/agents.json";
import type { Agent } from "@/components/AgentSelector";
import { MODEL_OPTIONS } from "@/lib/agents/models";
import ChatToolbar from "@/components/ChatToolbar";
import WorkflowChat from "@/components/WorkflowChat";
import EveChat from "@/components/EveChat";
import EveNoAiSalesReview from "@/components/EveNoAiChat";
import EveAnalystChat from "@/components/EveAnalystChat";
import AgentChat from "@/components/AgentChat";

export default function Page() {
  const list = agents as Agent[];
  const [agentId, setAgentId] = useState(list[0].id);
  const [model, setModel] = useState(MODEL_OPTIONS[0]?.value ?? "");
  const agent = list.find((a) => a.id === agentId) ?? list[0];

  const toolbar = (
    <ChatToolbar
      agentId={agent.id}
      onAgentChange={setAgentId}
      model={model}
      onModelChange={setModel}
      modelDisabled={agent.transport !== "eve"}
    />
  );

  // The key starts a fresh chat when the agent changes, so messages from different agents don't mix.
  // Template agents (eve-template) share one chat screen and are configured only in agents.json.
  if (agent.transport === "eve-template") {
    return (
      <AgentChat
        key={agent.id}
        agentId={agent.id}
        title={agent.name}
        subtitle={agent.description}
        toolbar={toolbar}
        welcome={agent.welcome}
        placeholder="Ask a question about the store"
      />
    );
  }

  return agent.transport === "eve-analyst" ? (
    <EveAnalystChat key={agent.id} toolbar={toolbar} welcome={agent.welcome} />
  ) : agent.transport === "eve" ? (
    <EveChat key={agent.id} toolbar={toolbar} welcome={agent.welcome} />
  ) : agent.transport === "eve-workflow" ? (
    <EveNoAiSalesReview key={agent.id} toolbar={toolbar} welcome={agent.welcome} />
  ) : (
    <WorkflowChat key={agent.id} toolbar={toolbar} flow={agent.flow} />
  );
}