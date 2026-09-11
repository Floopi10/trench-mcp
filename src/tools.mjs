import { analyzeExit, gradeExit, modelExit } from "./slip-engine.mjs";

const DEFAULT_RPC = "https://rpc.mainnet.chain.robinhood.com";

function round(value, digits = 4) {
  return Number(Number(value).toFixed(digits));
}

export function compactReport(report) {
  return {
    observedAt: report.observedAt,
    chain: report.chain,
    token: report.token,
    grade: report.grade,
    reason: report.reason,
    market: {
      poolsFound: report.market.poolsFound,
      aggregateLiquidityUsd: report.market.aggregateLiquidityUsd,
      primaryPool: report.market.primaryPool
    },
    model: report.model,
    boundaries: report.boundaries
  };
}

export function compareSizesFromReport(report, sizesUsd) {
  const pool = report.market.primaryPool;
  return sizesUsd.map((sizeUsd) => {
    const model = modelExit({ sizeUsd, liquidityUsd: pool.liquidityUsd });
    const verdict = gradeExit({ model, liquidityUsd: pool.liquidityUsd, volume24hUsd: pool.volume24hUsd });
    return {
      sizeUsd,
      grade: verdict.grade,
      reason: verdict.reason,
      estimatedReceiveUsd: round(model.estimatedReceiveUsd, 2),
      estimatedImpactPct: round(model.estimatedImpactPct),
      positionToQuoteDepthPct: round(model.positionToQuoteDepthPct),
      suggestedChunks: model.suggestedChunks
    };
  });
}

export function explainReport(report) {
  const pool = report.market.primaryPool;
  return {
    verdict: report.grade,
    summary: `${report.token.symbol} is ${report.grade}: ${report.reason}`,
    evidence: [
      `Primary pool liquidity: $${round(pool.liquidityUsd, 2)}`,
      `24h volume: $${round(pool.volume24hUsd, 2)}`,
      `Position / estimated quote depth: ${round(report.model.positionToQuoteDepthPct)}%`,
      `Modeled price impact: ${round(report.model.estimatedImpactPct)}%`
    ],
    nextChecks: [
      "Verify the exact venue route and executable quote immediately before trading.",
      "Check whether liquidity, sells, or price changed since this observation.",
      "Treat this as market intelligence, not financial advice."
    ],
    limitations: report.boundaries
  };
}

export async function getChainHealth({ fetchImpl = fetch, rpcUrl = process.env.RH_RPC_URL || DEFAULT_RPC } = {}) {
  async function call(method) {
    const response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: method, method, params: [] }),
      signal: AbortSignal.timeout(8_000)
    });
    if (!response.ok) throw new Error(`RPC ${method} returned HTTP ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || `RPC ${method} failed`);
    return data.result;
  }
  const startedAt = performance.now();
  const [chainIdHex, blockHex] = await Promise.all([call("eth_chainId"), call("eth_blockNumber")]);
  return {
    ok: true,
    chain: "Robinhood Chain",
    chainId: Number.parseInt(chainIdHex, 16),
    blockNumber: Number.parseInt(blockHex, 16),
    rpcUrl,
    latencyMs: Math.round(performance.now() - startedAt),
    observedAt: new Date().toISOString()
  };
}

export function createToolLogic({ analyze = analyzeExit, chainHealth = getChainHealth } = {}) {
  return {
    async inspectToken({ token }) {
      return compactReport(await analyze({ token, sizeUsd: 100 }));
    },
    async simulateExit({ token, sizeUsd }) {
      return compactReport(await analyze({ token, sizeUsd }));
    },
    async compareExitSizes({ token, sizesUsd }) {
      const report = await analyze({ token, sizeUsd: sizesUsd[0] });
      return {
        observedAt: report.observedAt,
        token: report.token,
        primaryPool: report.market.primaryPool,
        scenarios: compareSizesFromReport(report, sizesUsd),
        boundaries: report.boundaries
      };
    },
    async chainHealth() {
      return chainHealth();
    },
    async explainExitSignal({ token, sizeUsd }) {
      return explainReport(await analyze({ token, sizeUsd }));
    }
  };
}
