// app/page.tsx: Chat page with an agent selector. The chosen agent decides which chat component runs and which model is shown.
"use client";

import { useState } from "react";
import agents from "@/lib/agents/agents.json";
import AgentSelector, { type Agent } from "@/components/AgentSelector";
import WorkflowChat from "@/components/WorkflowChat";
import EveChat from "@/components/EveChat";

export default function Page() {
  const list = agents as Agent[];
  const [agentId, setAgentId] = useState(list[0].id);
  const agent = list.find((a) => a.id === agentId) ?? list[0];
  const selector = <AgentSelector value={agent.id} onChange={setAgentId} />;

  // The key starts a fresh chat when the agent changes, so messages from different agents don't mix.
  return agent.transport === "eve" ? (
    <EveChat key={agent.id} agentSelector={selector} model={agent.model} />
  ) : (
    <WorkflowChat key={agent.id} agentSelector={selector} model={agent.model} />
  );
}