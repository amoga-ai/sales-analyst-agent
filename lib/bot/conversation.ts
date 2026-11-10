import flow from "@/bot-configs/sales-analyst/conversation.json";

export type Option = { label: string; value: string; actionId?: string; next: string };

export type FlowNode =
  | {
      type: "question";
      message: string;
      input: { variable: string; minLength?: number; maxLength?: number };
      next: string;
    }
  | { type: "choice"; message: string; variable?: string; options: Option[] }
  | { type: "workflow"; workflowVariable: string };

export const startNode: string = flow.startNode;
export const nodes = flow.nodes as unknown as Record<string, FlowNode>;

export function fill(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}