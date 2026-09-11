# Security model

## Trust boundary

TRENCH accepts public token addresses and numeric scenario sizes. It reads public endpoints and returns observations. There is no privileged state.

## Threats addressed

- Malformed token input: strict 40-byte hexadecimal address schema.
- Resource abuse: size limits, scenario-count limits and request timeouts.
- MCP stream corruption: diagnostics are restricted to stderr.
- Secret exposure: tools do not define secret, wallet or key fields.
- Accidental trading: no signing or transaction-sending dependency exists.
- Misleading certainty: limitations travel with every market result.

## Out of scope

Upstream provider integrity, RPC censorship, token-contract exploits, route simulation, MEV and client-host prompt injection are not solved by this server. Clients should treat token metadata and external URLs as untrusted data.

## Reporting

Open a private security advisory on GitHub for vulnerabilities. Do not include active private keys, seed phrases or sensitive RPC credentials in a report.
