# Agent guide

## Fast workflow

1. Call `chain_health` to confirm the intended network is reachable.
2. Call `inspect_token` to identify current pools and basic market state.
3. Call `simulate_exit` with the user's actual position size.
4. Use `compare_exit_sizes` when the user is considering chunks or multiple scenarios.
5. Call `explain_exit_signal` for an evidence bundle suitable for a final answer.

## Recommended host prompt

```text
Use TRENCH tools for Robinhood Chain market observations. Always state the
observation time, block, position size, selected pool, liquidity and grade reason.
Call modeled impact a pressure proxy, never an executable quote. Do not provide
financial advice or claim a trade will succeed. If no pool is found, say so.
```

## Example questions

- What visible liquidity exists for this token right now?
- How does a `$500` exit compare with a `$5,000` exit?
- Why did this position receive a `THIN` grade?
- Is the RPC responding, and at which block was the observation made?
- What must still be checked before using an actual venue?

## Output discipline

Prefer the structured result for reasoning. The text block exists for clients that only render text. Never infer deployer history, contract safety, holder concentration or executable slippage from a TRENCH pressure result; those require separate verified tools.
