# Model and decision walls

## Purpose

The pressure model answers a deliberately limited question: how large is a proposed USD exit relative to the quote-side depth implied by the strongest currently observed pool?

## Inputs

- Requested position size in USD.
- Total primary-pool liquidity in USD.
- Primary-pool 24-hour volume.
- A default 100 basis-point fee assumption.

## Outputs

- Estimated quote-side depth.
- Position-to-depth percentage.
- Modeled receive value after fee and pressure.
- Modeled impact percentage.
- Suggested number of chunks using a 2% depth target.
- A deterministic grade and reason.

## Assumptions

The model treats half of reported pool liquidity as quote-side depth and uses a constant-product curve. This is useful as a consistent pressure proxy, but it does not reconstruct concentrated liquidity positions, hooks, routing, taxes, transfer restrictions or MEV conditions.

## Failure modes

1. **Stale observation:** market data may lag the chain.
2. **Missing pool:** a venue may not be indexed.
3. **Concentrated liquidity:** total USD liquidity may not be available near the current tick.
4. **Transfer mechanics:** token taxes, pauses, allowlists or honeypot behavior are outside the model.
5. **Route fragmentation:** the best executable route may cross multiple pools.
6. **Volatility:** the market can move between observation and execution.

## Correct interpretation

`DEEP` means the requested size is small relative to observed depth under configured walls. It does not mean safe. `THIN` means one caution wall was crossed. `CRITICAL` means visible depth is severely constrained for the requested size or absolutely small.

The result is decision support, not financial advice and not an executable quote.
