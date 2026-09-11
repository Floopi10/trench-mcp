# Architecture

## System objective

TRENCH gives an MCP host a small, auditable tool surface for answering size-aware market questions on Robinhood Chain. The design separates transport, orchestration, external observations and deterministic modeling.

## Components

### MCP transport

`bin/trench-mcp.mjs` starts the official TypeScript SDK stdio transport. It writes no application logs to stdout because that stream belongs exclusively to MCP protocol frames.

### Tool registry

`src/server.mjs` owns public tool names, descriptions, Zod schemas and read-only annotations. Tool errors become MCP error results instead of unhandled process crashes.

### Tool logic

`src/tools.mjs` shapes compact reports, creates comparison ladders and generates evidence-first explanations. Dependencies can be injected, which keeps unit tests deterministic.

### Pressure engine

`src/slip-engine.mjs` validates addresses and sizes, reads the public RPC and discovers pools through DexScreener. It selects the strongest pool by USD liquidity and applies the documented constant-product proxy.

## Data flow

```text
callTool request
  → Zod validation
  → tool orchestration
  → RPC and market requests in parallel
  → pool normalization and selection
  → deterministic pressure calculation
  → structuredContent + human-readable text
```

## Failure behavior

- Invalid address or size: rejected before network access.
- RPC HTTP or JSON-RPC error: returned as an explicit tool error.
- Market provider error: returned with provider status.
- No liquid pool: no grade is fabricated.
- Client disconnect: stdio handle closes cleanly.

## Extension policy

New tools should remain narrow and composable. A tool must have a real data source, strict schema, bounded runtime, tests and an explicit safety boundary before being exposed.
