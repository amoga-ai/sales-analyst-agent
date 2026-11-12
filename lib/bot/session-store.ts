// lib/bot/session-store.ts: Chat sessions. Each session remembers which flow it runs.
export type Msg = { role: "user" | "assistant"; text: string } | { spec: any };

export type Session = {
  id: string;
  flow: string;
  nodeId: string;
  vars: Record<string, string>;
  messages: Msg[];
};

const g = globalThis as unknown as { __botSessions?: Map<string, Session> };
const sessions = (g.__botSessions ??= new Map<string, Session>());

export function createSession(flow: string, nodeId: string, messages: Msg[]): Session {
  const session: Session = { id: crypto.randomUUID(), flow, nodeId, vars: {}, messages };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}