// app/page.tsx: Chat page. Holds the selected agent and model, and passes the menus under the chat input to the chat screen.
"use client";

import { useState } from "react";
import agents from "@/lib/agents/agents.json";
import type { Agent } from "@/components/AgentSelector";
import { MODEL_OPTIONS } from "@/lib/agents/models";
import ChatToolbar from "@/components/ChatToolbar";
import WorkflowChat from "@/components/WorkflowChat";
import EveChat from "@/components/EveChat";

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
  return agent.transport === "eve" ? (
    <EveChat key={agent.id} toolbar={toolbar} welcome={agent.welcome}/>
  ) : (
    <WorkflowChat key={agent.id} toolbar={toolbar} flow={agent.flow} />  
  );
}