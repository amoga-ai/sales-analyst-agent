// components/AgentSelector.tsx: Agent dropdown in the chat header, with a custom arrow. Lists the agents from lib/agents/agents.json.
"use client";

import agents from "@/lib/agents/agents.json";

// components/AgentSelector.tsx: Agent type now includes the model name (null when the agent uses no AI model).
export type Agent = { id: string; name: string; transport: string; model: string | null; description: string };
export default function AgentSelector({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs font-medium text-zinc-500">Agent</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-9 appearance-none rounded-lg border border-zinc-300 bg-white pl-3 pr-9 text-sm font-medium text-zinc-900 shadow-sm transition hover:border-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {(agents as Agent[]).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}