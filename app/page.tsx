// app/page.tsx: Chat page. Holds the selected agent and model, picks the chat screen by agent transport, and passes the preset buttons to the Woo agents.
"use client";

import { useState, type ReactNode } from "react";
import agents from "@/lib/agents/agents.json";
import type { Agent } from "@/components/AgentSelector";
import { MODEL_OPTIONS } from "@/lib/agents/models";
import { PRESETS } from "@/lib/presets/presets";
import ChatToolbar from "@/components/ChatToolbar";
import WorkflowChat from "@/components/WorkflowChat";
import EveChat from "@/components/EveChat";
import EveNoAiSalesReview from "@/components/EveNoAiChat";
import EveAnalystChat from "@/components/EveAnalystChat";
import AgentChat from "@/components/AgentChat";
import { ArtifactProvider } from "@/components/ArtifactProvider";

// Preset buttons, shown only on the Woo agents.
const WOO_PRESETS = PRESETS.map(({ id, label }) => ({ id, label }));

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
  let screen: ReactNode;
  if (agent.transport === "eve-template") {
    const isWoo = agent.id.startsWith("woo");
    screen = (
      <AgentChat
        key={agent.id}
        agentId={agent.id}
        title={agent.name}
        subtitle={agent.description}
        toolbar={toolbar}
        welcome={agent.welcome}
        placeholder="Ask a question about the store"
        presets={isWoo ? WOO_PRESETS : []}
      />
    );
  } else if (agent.transport === "eve-analyst") {
    screen = <EveAnalystChat key={agent.id} toolbar={toolbar} welcome={agent.welcome} />;
  } else if (agent.transport === "eve") {
    screen = <EveChat key={agent.id} toolbar={toolbar} welcome={agent.welcome} />;
  } else if (agent.transport === "eve-workflow") {
    screen = <EveNoAiSalesReview key={agent.id} toolbar={toolbar} welcome={agent.welcome} />;
  } else {
    screen = <WorkflowChat key={agent.id} toolbar={toolbar} flow={agent.flow} />;
  }

  // The provider holds the open report, so the panel lives beside whichever screen is showing.
  return <ArtifactProvider key={agent.id}>{screen}</ArtifactProvider>;
}