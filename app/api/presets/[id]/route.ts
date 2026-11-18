// Runs one preset's Woo report tool directly (no AI model) and returns a json-render spec. Returns the error text and the tool names found, to help debugging.
import { connectWooMcp, loadMcpTools, MCP_TOOL_TIMEOUT_MS, type WooMcpClient } from "@/lib/mcp/woo-client";
import { withTimeout } from "@/lib/api/timeout";
import { reportRows, reportSpec } from "@/lib/json-render/report-layout";
import { PRESETS } from "@/lib/presets/presets";

export const runtime = "nodejs";
export const maxDuration = 60;

// Reads the rows with reportRows, the same reader the chart uses. If the rows are not a list, there is no sentence and the chart still shows.
function pendingSentence(output: unknown): string | undefined {
    const rows = reportRows(output);
    if (!Array.isArray(rows)) return undefined;
    const pending = (rows as { slug?: string; total?: number }[]).find((r) => r?.slug === "pending")?.total ?? 0;
    return `There are ${pending} pending orders.`;
}

function presetSentence(id: string, spec: any, output: any): string | undefined {
  if (id === "pending-orders") return pendingSentence(output);
  if (id === "sales") {
    const orders = Number(spec.elements.orders.props.value);
    return orders === 0
      ? "There were no sales in this period."
      : `Total sales are ${spec.elements.sales.props.value} from ${orders} orders.`;
  }
  if (id === "products") {
    const { labels, values } = spec.elements.chart.props as { labels: string[]; values: number[] };
    const total = values.reduce((a, b) => a + b, 0);
    const detail = labels.map((l, i) => `${values[i]} ${l}`).join(", ");
    return `There are ${total} products: ${detail}.`;
  }
  return undefined;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return Response.json({ error: "Unknown preset" }, { status: 404 });

    const mcpUrl = process.env.WOO_MCP_URL;
    const mcpToken = process.env.WOO_MCP_TOKEN;
    if (!mcpUrl || !mcpToken) {
        return Response.json({ error: "WOO_MCP_URL or WOO_MCP_TOKEN is not set" }, { status: 500 });
    }

    // Connecting is inside the try, so an MCP server that is down or slow returns a JSON error instead of crashing the route.
    let mcp: WooMcpClient | undefined;
    try {
        try {
            mcp = await connectWooMcp(mcpUrl, mcpToken);
        } catch (error) {
            console.error("Preset: MCP connect failed:", error);
            return Response.json({ error: "The store report service is not reachable. Please try again." }, { status: 502 });
        }
        const tools = (await loadMcpTools(mcp)) as unknown as Record<string, { execute: (input: unknown, options: unknown) => Promise<unknown> }>;
        // The MCP client names tools without the woocommerce__ prefix, so strip it before looking up.
        const bareName = preset.tool.replace(/^woocommerce__/, "");
        const tool = tools[bareName];
        if (!tool) {
            return Response.json(
                { error: `Tool not found: ${bareName}`, available: Object.keys(tools) },
                { status: 404 },
            );
        }

        const output = await withTimeout(
            tool.execute(preset.args, { toolCallId: `preset-${id}`, messages: [] }),
            MCP_TOOL_TIMEOUT_MS,
            `Running ${bareName}`,
        );
        const spec = reportSpec(preset.tool, reportRows(output));
        return Response.json({ text: presetSentence(preset.id, spec, output), spec });
    } catch (error) {
        console.error("Preset failed:", error);
        return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    } finally {
        await mcp?.close().catch(() => {});
    }
}