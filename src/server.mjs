import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { createToolLogic } from "./tools.mjs";

const tokenSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Expected a 0x-prefixed EVM address");
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

function result(data, headline) {
  return {
    content: [{ type: "text", text: `${headline}\n\n${JSON.stringify(data, null, 2)}` }],
    structuredContent: data
  };
}

function wrap(handler, headline) {
  return async (args) => {
    try {
      return result(await handler(args), headline);
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `TRENCH error: ${error instanceof Error ? error.message : String(error)}` }]
      };
    }
  };
}

export function buildServer(dependencies = {}) {
  const logic = createToolLogic(dependencies);
  const server = new McpServer(
    { name: "trench-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.registerTool("inspect_token", {
    title: "Inspect a Robinhood Chain token",
    description: "Read current pools, liquidity, volume, price and a small-position exit grade.",
    inputSchema: z.object({ token: tokenSchema }),
    annotations: readOnly
  }, wrap(logic.inspectToken, "Token inspection complete."));

  server.registerTool("simulate_exit", {
    title: "Simulate token exit pressure",
    description: "Estimate exit pressure for a USD position using current Robinhood Chain market data. This is a proxy, not an executable quote.",
    inputSchema: z.object({
      token: tokenSchema,
      sizeUsd: z.number().positive().max(10_000_000)
    }),
    annotations: readOnly
  }, wrap(logic.simulateExit, "Exit simulation complete."));

  server.registerTool("compare_exit_sizes", {
    title: "Compare exit sizes",
    description: "Compare 1 to 8 USD exit sizes against the same observed primary pool.",
    inputSchema: z.object({
      token: tokenSchema,
      sizesUsd: z.array(z.number().positive().max(10_000_000)).min(1).max(8)
    }),
    annotations: readOnly
  }, wrap(logic.compareExitSizes, "Exit-size comparison complete."));

  server.registerTool("chain_health", {
    title: "Check Robinhood Chain health",
    description: "Read chain ID, latest block and RPC latency without connecting a wallet.",
    inputSchema: z.object({}),
    annotations: readOnly
  }, wrap(logic.chainHealth, "Chain health check complete."));

  server.registerTool("explain_exit_signal", {
    title: "Explain an exit signal",
    description: "Turn the deterministic DEEP, THIN or CRITICAL signal into evidence and next checks an AI agent can explain.",
    inputSchema: z.object({
      token: tokenSchema,
      sizeUsd: z.number().positive().max(10_000_000)
    }),
    annotations: readOnly
  }, wrap(logic.explainExitSignal, "Signal explanation complete."));

  return server;
}
