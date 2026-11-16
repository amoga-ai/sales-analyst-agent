// app/api/woo-analyst-ai/chat/route.ts: Pure AI chat for the WooCommerce analyst. Sends the chat to the model with the Woo MCP tools and streams the answer back.
import { streamText, convertToModelMessages, stepCountIs, type UIMessage, type ToolSet } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createMCPClient } from "@ai-sdk/mcp";
import { WOO_ANALYST_PROMPT } from "@/lib/agents/woo-analyst-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  // Reads the model and MCP settings from the environment.
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  const mcpUrl = process.env.WOO_MCP_URL;
  const mcpToken = process.env.WOO_MCP_TOKEN;
  if (!apiKey || !model || !mcpUrl || !mcpToken) {
    return Response.json(
      { error: "OPENROUTER_API_KEY, OPENROUTER_MODEL, WOO_MCP_URL or WOO_MCP_TOKEN is not set" },
      { status: 500 },
    );
  }

  // The chat messages sent by the browser.
  const { messages } = (await request.json()) as { messages: UIMessage[] };

  // Connects to the Woo MCP server with its bearer token, and loads its report tools.
  const mcp = await createMCPClient({
    transport: { type: "http", url: mcpUrl, headers: { Authorization: `Bearer ${mcpToken}` } },
  });

  try {
    const tools = (await mcp.tools()) as unknown as ToolSet;
    const result = streamText({
      model: createOpenRouter({ apiKey })(model),
      system: WOO_ANALYST_PROMPT,
      messages: await convertToModelMessages(messages),
      tools,
      // Lets the model call a report tool, read the result, and answer, up to 5 steps.
      stopWhen: stepCountIs(5),
      // Closes the MCP connection when the answer finishes or fails.
      onFinish: () => mcp.close(),
      onError: () => mcp.close(),
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    await mcp.close();
    throw error;
  }
}