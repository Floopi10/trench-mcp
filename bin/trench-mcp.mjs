#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { buildServer } from "../src/server.mjs";

const handle = serveStdio(buildServer, {
  onerror: (error) => console.error(`[trench-mcp] ${error.message}`)
});

process.on("SIGINT", async () => {
  await handle.close();
  process.exit(0);
});
