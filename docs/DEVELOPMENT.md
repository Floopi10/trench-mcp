# Development

## Requirements

- Node.js 22 or newer.
- npm with lockfile support.
- Network access for live chain checks; unit and registry tests remain deterministic.

## Commands

```bash
npm ci
npm run check
npm run inspect
npm pack --dry-run
npm run deploy   # deploy static docs/ site through Cloudflare Workers
```

## Adding a tool

1. Define pure orchestration in `src/tools.mjs`.
2. Add a strict Zod schema in `src/server.mjs`.
3. Add explicit MCP annotations.
4. Return both `content` and `structuredContent`.
5. Cover computation and tool registration with tests.
6. Document sources, limits and failure behavior.

## Pull-request gate

Every pull request must keep `npm run check` green. Do not add a capability to the README before its implementation and integration test exist.
