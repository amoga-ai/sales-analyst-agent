  import { streamText, convertToModelMessages, stepCountIs, tool, jsonSchema, type UIMessage, type ToolSet } from "ai";  import { createOpenRouter } from "@openrouter/ai-sdk-provider";
  import { createMCPClient } from "@ai-sdk/mcp";
  import { WOO_ANALYST_PROMPT } from "@/lib/agents/woo-analyst-prompt";

  export const runtime = "nodejs";
  export const maxDuration = 60;

  const createDocumentTool = tool({
  description:
    "Create a full HTML document or dashboard for the user. Use this when the user asks for a dashboard, report page or document layout. Pass a short title and a complete HTML page with inline CSS.",
  inputSchema: jsonSchema<{ title: string; html: string }>({
    type: "object",
    properties: { title: { type: "string" }, html: { type: "string" } },
    required: ["title", "html"],
  }),
  execute: async ({ title, html }) => ({ title, html }),
});

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
      const tools = { ...((await mcp.tools()) as unknown as ToolSet), create_document: createDocumentTool } as ToolSet;
      const result = streamText({
        model: createOpenRouter({ apiKey })(model),
        system: `${WOO_ANALYST_PROMPT}\n\nWhen the user asks for a dashboard, document or report page, call create_document with a title and a complete HTML page.`,
        messages: await convertToModelMessages(messages),
        tools,
        stopWhen: stepCountIs(5),
        onFinish: () => mcp.close(),
        onError: () => mcp.close(),
      });
      return result.toUIMessageStreamResponse();
    } catch (error) {
      await mcp.close();
      throw error;
    }
  }