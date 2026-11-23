// Woo analyst chat API route. Uses LiteLLM when its settings are present, otherwise OpenRouter. Normal chat uses the Woo report tools. When report text is sent, it answers only from that text (used by the editor's AI wand).
import { streamText, generateText, convertToModelMessages, stepCountIs, tool, jsonSchema, type UIMessage, type ToolSet } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { connectWooMcp, loadMcpTools, type WooMcpClient } from "@/lib/mcp/woo-client";
import { WOO_ANALYST_PROMPT } from "@/lib/agents/woo-analyst-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

// Picks the model: LiteLLM (the local Ollama model behind it) when LITELLM_BASE_URL is set, otherwise OpenRouter.
function chatModel() {
  const litellmUrl = process.env.LITELLM_BASE_URL;
  if (litellmUrl) {
    return createOpenAICompatible({
      name: "litellm",
      baseURL: litellmUrl,
      apiKey: process.env.LITELLM_API_KEY ?? "",
    })(process.env.LITELLM_MODEL ?? "my-ai");
  }
  return createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY ?? "" })(process.env.OPENROUTER_MODEL ?? "");
}

// Rules for answers that may use only the report text sent with the question.
const TABLE_ONLY_PROMPT = `You answer questions using only the report data in the message. Do not use outside knowledge and do not invent numbers. If the report data does not contain the answer, reply only: "This report does not have that information." Keep the answer to one or two sentences.`;

// Creates a full HTML document or dashboard for the user.
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

// Creates a spreadsheet for the user from CSV data.
const createSheetTool = tool({
  description:
    "Create a spreadsheet for the user from CSV data. The first row must be the column headers. Separate cells with commas and rows with new lines.",
  inputSchema: jsonSchema<{ title: string; csv: string }>({
    type: "object",
    properties: {
      title: { type: "string" },
      csv: { type: "string" },
    },
    required: ["title", "csv"],
  }),
  execute: async ({ title, csv }) => ({ title, csv }),
});

// Lets the model suggest follow-up questions. The browser shows them as buttons under the report card.
const suggestFollowupsTool = tool({
  description:
    "Suggest up to 3 short follow-up questions that the report you just showed can answer, using only the numbers in that report. Call this once after answering a data question with a report.",
  inputSchema: jsonSchema<{ suggestions: string[] }>({
    type: "object",
    properties: { suggestions: { type: "array", items: { type: "string" }, maxItems: 3 } },
    required: ["suggestions"],
  }),
  execute: async ({ suggestions }) => ({ suggestions: suggestions.slice(0, 3) }),
});

// Returns the text of the last user message.
function lastUserText(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  return last?.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n") ?? "";
}

export async function POST(request: Request) {
  // Checks the model and MCP settings. A model is needed from LiteLLM or from OpenRouter.
  const hasModel = Boolean(process.env.LITELLM_BASE_URL) || Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL);
  const mcpUrl = process.env.WOO_MCP_URL;
  const mcpToken = process.env.WOO_MCP_TOKEN;
  if (!hasModel || !mcpUrl || !mcpToken) {
    return Response.json(
      { error: "A model (LITELLM_BASE_URL, or OPENROUTER_API_KEY and OPENROUTER_MODEL), WOO_MCP_URL and WOO_MCP_TOKEN must be set" },
      { status: 500 },
    );
  }

  // The chat messages, and optionally the report text from the editor. A body that is not JSON, or has no messages list, is a 400.
  let body: { messages: UIMessage[]; reportData?: string };
  try {
    body = (await request.json()) as { messages: UIMessage[]; reportData?: string };
  } catch {
    return Response.json({ error: "The message could not be read." }, { status: 400 });
  }
  const { messages, reportData } = body;
  if (!Array.isArray(messages)) {
    return Response.json({ error: "The message could not be read." }, { status: 400 });
  }

  // Table-only mode: answers only from the report text, with no store tools.
  if (typeof reportData === "string") {
    try {
      const { text } = await generateText({
        model: chatModel(),
        system: TABLE_ONLY_PROMPT,
        prompt: `Question: ${lastUserText(messages)}\n\nReport data:\n${reportData}`,
      });
      return Response.json({ text: text.trim() });
    } catch (error) {
      console.error("Woo AI wand: answer failed:", error);
      return Response.json({ error: "The answer could not be created. Please try again." }, { status: 502 });
    }
  }

  // Connects to the Woo MCP server with its bearer token, and loads its report tools.
  // Both steps have a time limit, and a failure returns a JSON 502 instead of crashing the route.
  let mcp: WooMcpClient;
  try {
    mcp = await connectWooMcp(mcpUrl, mcpToken);
  } catch (error) {
    console.error("Woo AI chat: MCP connect failed:", error);
    return Response.json({ error: "The store report service is not reachable. Please try again." }, { status: 502 });
  }

  // Closes the MCP client once, whichever way the reply ends: finished, failed, or stopped by the user.
  let closed = false;
  const closeMcp = () => {
    if (closed) return;
    closed = true;
    mcp.close().catch(() => { });
  };

  try {
    const tools = {
      ...((await loadMcpTools(mcp)) as unknown as ToolSet),
      create_document: createDocumentTool,
      create_sheet: createSheetTool,
      suggest_followups: suggestFollowupsTool,
    } as ToolSet;

    const result = streamText({
      model: chatModel(),
      system: `${WOO_ANALYST_PROMPT}\n\nWhen the user asks for a dashboard, document or report page, call create_document with a title and a complete HTML page. When the user asks for a spreadsheet, sheet, table to download, or CSV, call create_sheet with a title and CSV data, and do not call any report tool for that request. Call each report tool only once per reply.\n\nAfter you answer any question about the store, call suggest_followups once with up to 3 short questions that the store reports can answer, such as "Which status has the most orders?". Do not call it for other replies.`,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(5),
      // Stops the reply when the user presses Stop or leaves the page, so onAbort runs and the MCP client is closed.
      abortSignal: request.signal,
      onFinish: closeMcp,
      onError: closeMcp,
      onAbort: closeMcp,
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Woo AI chat: setup failed:", error);
    closeMcp();
    return Response.json({ error: "The store report service is not reachable. Please try again." }, { status: 502 });
  }
}