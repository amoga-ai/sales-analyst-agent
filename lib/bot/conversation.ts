import flow from "@/bot-configs/sales-analyst/conversation.json";

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

export const startNode: string = flow.startNode;
export const nodes = flow.nodes as unknown as Record<string, FlowNode>;

export function fill(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}