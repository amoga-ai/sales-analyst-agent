// lib/bot/conversation.ts: Loads the flows by name. The sales review workflow is the default. The pure workflow has no AI step.
import salesFlow from "@/bot-configs/sales-analyst/conversation.json";
import pureFlow from "@/bot-configs/sales-review-pure/conversation.json";

export type Option = {
  label: string;
  value: string;
  actionId?: string;
  next: string;
  loading?: string;
};

export type FlowNode =
  | {
      type: "question";
      message: string;
      input: { variable: string; minLength?: number; maxLength?: number };
      next: string;
    }
  | { type: "choice"; message: string; variable?: string; options: Option[] }
  | { type: "approval"; message: string; options: Option[] }
  | { type: "api"; action: string; next: string }
  | { type: "message"; message: string }
  | { type: "rule"; field: string; op: string; value: string | number; then: string; else: string }
  | { type: "ai"; prompt: string; source: string; output: string; next: string };

type FlowDef = { startNode: string; nodes: Record<string, FlowNode> };

const flows: Record<string, FlowDef> = {
  "sales-review-workflow": {
    startNode: salesFlow.startNode,
    nodes: salesFlow.nodes as unknown as Record<string, FlowNode>,
  },
  "pure-workflow": {
    startNode: pureFlow.startNode,
    nodes: pureFlow.nodes as unknown as Record<string, FlowNode>,
  },
};

export const DEFAULT_FLOW = "sales-review-workflow";

// Returns a flow id that exists. Unknown or missing ids fall back to the default.
export function flowFor(id: string | undefined): string {
  return id && id in flows ? id : DEFAULT_FLOW;
}

export function startOf(flow: string): string {
  return flows[flow].startNode;
}

export function nodesOf(flow: string): Record<string, FlowNode> {
  return flows[flow].nodes;
}

export function fill(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}