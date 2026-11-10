import { nodes, startNode, fill, type FlowNode } from "./conversation";
import type { Msg, Session } from "./session-store";

export type Ui =
  | { type: "text" }
  | { type: "choice"; options: { label: string; value: string }[] };

export type Reply = {
  messages: Msg[];
  runAction?: string; // set when the flow reached an api step
};

const messageOf = (node: FlowNode) => ("message" in node ? node.message : "");

export function openingMessages(): Msg[] {
  return [{ role: "assistant", text: fill(messageOf(nodes[startNode]), {}) }];
}

export function uiFor(session: Session): Ui {
  const node = nodes[session.nodeId];
  if (node.type === "choice" || node.type === "approval") {
    return {
      type: "choice",
      options: node.options.map((o) => ({ label: o.label, value: o.value })),
    };
  }
  return { type: "text" };
}

function evaluate(
  rule: { field: string; op: string; value: string | number },
  vars: Record<string, string>
): boolean {
  const left = vars[rule.field] ?? "";
  const a = Number(left);
  const b = Number(rule.value);
  const numeric = left !== "" && !isNaN(a) && !isNaN(b);
  const l: any = numeric ? a : left;
  const r: any = numeric ? b : String(rule.value);
  switch (rule.op) {
    case "==": return l === r;
    case "!=": return l !== r;
    case ">": return l > r;
    case "<": return l < r;
    case ">=": return l >= r;
    case "<=": return l <= r;
    default: return false;
  }
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

  if (node.type === "choice" || node.type === "approval") {
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
    const key = node.type === "choice" && node.variable ? node.variable : session.nodeId;
    session.vars[key] = option.value;
    session.vars[`${key}_label`] = option.label;
    return enter(session, option.next, [{ role: "user", text: option.label }]);
  }

  return { messages: [] };
}

// Called by the route after it has run an api step successfully.
export function continueAfterApi(session: Session): Msg[] {
  const node = nodes[session.nodeId];
  if (node.type !== "api") return [];
  return enter(session, node.next, []).messages;
}

function enter(session: Session, nextId: string, prefix: Msg[]): Reply {
  const next = nodes[nextId];
  if (!next) {
    // Reset before throwing so the session never points at a missing step,
    // whichever caller (handle or continueAfterApi) hit it.
    reset(session);
    throw new Error(`Unknown flow step: ${nextId}`);
  }
  session.nodeId = nextId;
  if (next.type === "rule") {
    const target = evaluate(next, session.vars) ? next.then : next.else;
    return enter(session, target, prefix);
  }

  if (next.type === "api") {
    return { messages: prefix, runAction: next.action };
  }

  if (next.type === "message") {
    // Terminal step: show the message, then restart the bot.
    const text = fill(next.message, session.vars);
    reset(session);
    return {
      messages: [...prefix, { role: "assistant", text }, ...openingMessages()],
    };
  }

  return {
    messages: [...prefix, { role: "assistant", text: fill(messageOf(next), session.vars) }],
  };
}

export function reset(session: Session) {
  session.nodeId = startNode;
  session.vars = {};
}