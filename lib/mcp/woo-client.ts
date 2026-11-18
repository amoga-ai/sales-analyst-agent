// lib/mcp/woo-client.ts: Connects to the Woo MCP server with its bearer token, with a time limit on connecting and on loading the tools.
import { createMCPClient } from "@ai-sdk/mcp";
import { withTimeout } from "@/lib/api/timeout";

export const MCP_CONNECT_TIMEOUT_MS = 15_000;
export const MCP_TOOL_TIMEOUT_MS = 30_000;

export type WooMcpClient = Awaited<ReturnType<typeof createMCPClient>>;

// Connects to the MCP server. A client that connects only after the time limit is closed straight away.
export function connectWooMcp(url: string, token: string): Promise<WooMcpClient> {
  return withTimeout(
    createMCPClient({ transport: { type: "http", url, headers: { Authorization: `Bearer ${token}` } } }),
    MCP_CONNECT_TIMEOUT_MS,
    "Connecting to the Woo MCP server",
    (late) => void late.close().catch(() => {}),
  );
}

// Loads the MCP server's tools, with a time limit.
export function loadMcpTools(mcp: WooMcpClient) {
  return withTimeout(mcp.tools(), MCP_TOOL_TIMEOUT_MS, "Loading the Woo MCP tools");
}
