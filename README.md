# TRENCH MCP

**Robinhood Chain market intelligence for AI agents.**

TRENCH is a real MCP server that gives Claude, Codex and other MCP clients read-only tools for inspecting token liquidity and modeling exit pressure. It never asks for a seed phrase, connects a wallet, signs a transaction or claims that a pressure model is an executable quote.

## Why

AI agents can read contracts and posts, but they still struggle with one practical question: **what does the market look like right now, and how hard would this position be to exit?** TRENCH turns live chain and pool observations into structured context an agent can reason about.

## Tools

| Tool | What it does |
| --- | --- |
| `inspect_token` | Reads pools, liquidity, volume, price and a small-position grade |
| `simulate_exit` | Models `DEEP`, `THIN` or `CRITICAL` exit pressure for a USD size |
| `compare_exit_sizes` | Compares up to eight sizes from one market observation |
| `chain_health` | Reads chain ID, latest block and RPC latency |
| `explain_exit_signal` | Returns evidence, limitations and next checks for an AI explanation |

## Run now

Requirements: Node.js 22+.

```bash
git clone https://github.com/Floopi10/trench-mcp.git
cd trench-mcp
npm ci
npm start
```

Local MCP client configuration:

```json
{
  "mcpServers": {
    "trench": {
      "command": "node",
      "args": ["/absolute/path/to/trench-mcp/bin/trench-mcp.mjs"]
    }
  }
}
```

The server uses stdio: protocol messages go to stdout; diagnostics go to stderr.

## Example call

Ask your MCP client:

> Use `simulate_exit` for token `0x…` with a position of 2500 USD. Explain the evidence and limitations before giving any conclusion.

## Data and model

- Chain identity and latest block: Robinhood Chain public JSON-RPC.
- Pool discovery and market observations: DexScreener public API.
- Exit pressure: constant-product depth proxy against the highest-liquidity observed pool.
- No wallet, private key, transaction, swap, custody or autonomous trading.

The modeled receive and impact values are **not executable Uniswap V4 quotes**. Market data may lag or omit pools. Verify the exact venue route immediately before any trade.

## Development

```bash
npm run check
npm run inspect
```

`npm run inspect` launches the official MCP Inspector against the stdio server.

## Architecture

```text
MCP client
   │ stdio
   ▼
TRENCH tool registry
   ├── chain health ──► Robinhood Chain RPC
   └── market tools ──► DexScreener ──► SLIP pressure engine
                                  └── structured MCP result
```

## Security

- Read-only tool annotations on every capability.
- Strict EVM-address and USD-size validation.
- Eight-second network timeouts.
- No secrets accepted or persisted.
- No stdout logs that can corrupt MCP framing.

## License

MIT
