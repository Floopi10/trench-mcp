import test from "node:test";
import assert from "node:assert/strict";
import { compareSizesFromReport, createToolLogic, explainReport } from "../src/tools.mjs";

const fixture = {
  observedAt: "2026-09-11T00:00:00.000Z",
  chain: { name: "Robinhood Chain", chainId: 4663, blockNumber: 42 },
  token: { address: `0x${"a".repeat(40)}`, name: "Fixture", symbol: "FIX", priceUsd: 1 },
  market: {
    poolsFound: 1,
    aggregateLiquidityUsd: 100_000,
    primaryPool: { pairAddress: `0x${"b".repeat(40)}`, liquidityUsd: 100_000, volume24hUsd: 20_000, priceUsd: 1 }
  },
  grade: "DEEP",
  reason: "Position stays below the configured depth wall.",
  model: { positionToQuoteDepthPct: 1, estimatedImpactPct: 0.98 },
  boundaries: ["Read-only", "Proxy only"]
};

test("compares multiple exit sizes from one market observation", () => {
  const scenarios = compareSizesFromReport(fixture, [100, 1_500, 5_000]);
  assert.deepEqual(scenarios.map((item) => item.grade), ["DEEP", "THIN", "CRITICAL"]);
  assert.ok(scenarios[2].estimatedImpactPct > scenarios[0].estimatedImpactPct);
});

test("explains the signal with evidence and boundaries", () => {
  const explanation = explainReport(fixture);
  assert.equal(explanation.verdict, "DEEP");
  assert.match(explanation.summary, /FIX is DEEP/);
  assert.deepEqual(explanation.limitations, fixture.boundaries);
});

test("tool logic delegates to one deterministic engine", async () => {
  const calls = [];
  const logic = createToolLogic({ analyze: async (input) => { calls.push(input); return fixture; } });
  const result = await logic.simulateExit({ token: fixture.token.address, sizeUsd: 500 });
  assert.equal(result.grade, "DEEP");
  assert.deepEqual(calls, [{ token: fixture.token.address, sizeUsd: 500 }]);
});
