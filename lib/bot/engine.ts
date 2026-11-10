import { nodes, startNode, fill, type FlowNode } from "./conversation";
import type { Msg, Session } from "./session-store";

export type Ui =
  | { type: "text" }
  | { type: "choice"; options: { label: string; value: string }[] };

export type Reply = {
  messages: Msg[];
  runWorkflow?: string;
  runPeriod?: string;
};

const messageOf = (node: FlowNode) => ("message" in node ? node.message : "");

export function openingMessages(): Msg[] {
  return [{ role: "assistant", text: fill(messageOf(nodes[startNode]), {}) }];
}

export function uiFor(session: Session): Ui {
  const node = nodes[session.nodeId];
  if (node.type === "choice") {
    return {
      type: "choice",
      options: node.options.map((o) => ({ label: o.label, value: o.value })),
    };
  }
  return { type: "text" };
}

export function handle(
  session: Session,
  input: { text?: string; optionValue?: string }
): Reply {
  const node = nodes[session.nodeId];
  const text = (input.text ?? "").trim();

  if (node.type === "question") {
    const min = node.input.minLength ?? 0;
    const max = node.input.maxLength ?? Infinity;
    if (text.length < min || text.length > max) {
      return {
        messages: [
          { role: "user", text },
          { role: "assistant", text: `Please enter between ${min} and ${max} characters.` },
        ],
      };
    }
    session.vars[node.input.variable] = text;
    return enter(session, node.next, [{ role: "user", text }]);
  }

  if (node.type === "choice") {
    const option =
      node.options.find((o) => o.value === input.optionValue) ??
      node.options.find((o) => o.label.toLowerCase() === text.toLowerCase());
    if (!option) {
      return {
        messages: [
          ...(text ? [{ role: "user" as const, text }] : []),
          { role: "assistant", text: "Please choose one of the options." },
        ],
      };
    }
    session.vars[node.variable ?? session.nodeId] = option.value;
    return enter(session, option.next, [{ role: "user", text: option.label }]);
  }

  return { messages: [] };
}

function enter(session: Session, nextId: string, prefix: Msg[]): Reply {
  session.nodeId = nextId;
  const next = nodes[nextId];
  if (next.type === "workflow") {
    return {
      messages: prefix,
      runWorkflow: session.vars.select_review,
      runPeriod: session.vars.review_period,
    };
  }
  return {
    messages: [
      ...prefix,
      { role: "assistant", text: fill(messageOf(next), session.vars) },
    ],
  };
}

export function reset(session: Session) {
  session.nodeId = startNode;
  session.vars = {};
}