// app/page.tsx: Chat page. Holds the selected agent and model, picks the chat screen by agent transport, and passes the preset buttons to the Woo agents.
"use client";

import { useState, type ReactNode } from "react";
import agents from "@/lib/agents/agents.json";
import type { Agent } from "@/components/AgentSelector";
import { MODEL_OPTIONS, LOCAL_MODEL_OPTIONS } from "@/lib/agents/models";
import { PRESETS } from "@/lib/presets/presets";
import ChatToolbar from "@/components/ChatToolbar";
import WorkflowChat from "@/components/WorkflowChat";
import EveChat from "@/components/EveChat";
import EveNoAiSalesReview from "@/components/EveNoAiChat";
import EveAnalystChat from "@/components/EveAnalystChat";
import AgentChat from "@/components/AgentChat";
import { ArtifactProvider } from "@/components/ArtifactProvider";
import WooAnalystAIChat from "@/components/WooAnalystAIChat";
import BrainChat from "@/components/BrainChat";
// Preset buttons, shown only on the Woo agents.
const WOO_PRESETS = PRESETS.map(({ id, label }) => ({ id, label }));

export default function Page() {
  const list = agents as Agent[];
  const [agentId, setAgentId] = useState(list[0].id);
  const [model, setModel] = useState(MODEL_OPTIONS[0]?.value ?? "");
  const agent = list.find((a) => a.id === agentId) ?? list[0];

  const isLocal = agent.id === "local-woo-analyst";
  const localModel = LOCAL_MODEL_OPTIONS.some((m) => m.value === model) ? model : (LOCAL_MODEL_OPTIONS[0]?.value ?? "");
  const toolbar = (
    <ChatToolbar
      agentId={agent.id}
      onAgentChange={setAgentId}
      model={isLocal ? localModel : model}
      onModelChange={setModel}
      modelOptions={isLocal ? LOCAL_MODEL_OPTIONS : undefined}
      modelDisabled={agent.transport !== "eve" && !isLocal}
    />
  );

  let screen: ReactNode;
  if (agent.id === "woo-analyst-ai") {
    screen = <WooAnalystAIChat key={agent.id} toolbar={toolbar} title={agent.name} subtitle={agent.description} />;
  } else if (agent.id === "local-woo-analyst") {
    screen = <WooAnalystAIChat key={agent.id} toolbar={toolbar} title={agent.name} subtitle={agent.description} api="/api/agents/local-woo-analyst/chat" model={localModel} />;
  } else if (agent.transport === "eve-template") {
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
    screen = <EveNoAiSalesReview key={agent.id} toolbar={toolbar} welcome={agent.welcome} title={agent.name} subtitle={agent.description} />;
  } else if (agent.transport === "eve-brain") {
    screen = <BrainChat key={agent.id} toolbar={toolbar} welcome={agent.welcome} title={agent.name} subtitle={agent.description} />;
  }
  else {
    screen = <WorkflowChat key={agent.id} toolbar={toolbar} flow={agent.flow} />;
  }

  // The provider holds the open report, so the panel lives beside whichever screen is showing.
  return <ArtifactProvider key={agent.id}>{screen}</ArtifactProvider>;
}