import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

test("stdio server exposes the complete TRENCH tool surface", async () => {
  const transport = new StdioClientTransport({ command: process.execPath, args: ["bin/trench-mcp.mjs"], cwd: process.cwd() });
  const client = new Client({ name: "trench-test", version: "0.1.0" });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [
      "chain_health", "compare_exit_sizes", "explain_exit_signal", "inspect_token", "simulate_exit"
    ]);
  } finally {
    await client.close();
  }
});
