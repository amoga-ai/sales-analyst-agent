// components/ChatToolbar.tsx: Model and agent menus under the chat input. Planned agents are greyed out. Agents come from agents.json, models from NEXT_PUBLIC_AI_MODELS.
"use client";

import agents from "@/lib/agents/agents.json";
import { MODEL_OPTIONS } from "@/lib/agents/models";
import PopupMenu from "@/components/PopupMenu";
import type { Agent } from "@/components/AgentSelector";

export default function ChatToolbar({
  agentId,
  onAgentChange,
  model,
  onModelChange,
  modelDisabled,
}: {
  agentId: string;
  onAgentChange: (id: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  modelDisabled?: boolean;
}) {
  const agentOptions = (agents as Agent[]).map((a) => ({
    value: a.id,
    label: a.name,
    disabled: a.status !== "ready",
  }));
  return (
    <div className="flex flex-wrap items-center gap-1">
      <PopupMenu prefix="Model" value={model} options={MODEL_OPTIONS} onChange={onModelChange} disabled={modelDisabled} />
      <PopupMenu prefix="Agent" value={agentId} options={agentOptions} onChange={onAgentChange} />
    </div>
  );
}