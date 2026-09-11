const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const DEFAULT_RPC = "https://rpc.mainnet.chain.robinhood.com";
const DEX_API = "https://api.dexscreener.com/token-pairs/v1/robinhood";

export function validateInput(token, sizeUsd) {
  if (!ADDRESS.test(String(token || ""))) throw new Error("Token must be a 0x-prefixed EVM address.");
  if (!Number.isFinite(sizeUsd) || sizeUsd <= 0 || sizeUsd > 10_000_000) throw new Error("Size must be between $0 and $10,000,000.");
}

async function rpc(method, rpcUrl, fetchImpl) {
  const response = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
    signal: AbortSignal.timeout(8_000)
  });
  if (!response.ok) throw new Error(`RPC ${method} returned HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || `RPC ${method} failed`);
  return body.result;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function poolView(pair) {
  return {
    pairAddress: pair.pairAddress,
    dex: pair.dexId,
    venue: pair.labels?.join("+") || "unknown",
    url: pair.url,
    quoteSymbol: pair.quoteToken?.symbol || "?",
    liquidityUsd: number(pair.liquidity?.usd),
    volume24hUsd: number(pair.volume?.h24),
    buys24h: number(pair.txns?.h24?.buys),
    sells24h: number(pair.txns?.h24?.sells),
    priceUsd: number(pair.priceUsd),
    priceChange24hPct: number(pair.priceChange?.h24)
  };
}

export function modelExit({ sizeUsd, liquidityUsd, feeBps = 100 }) {
  const quoteDepthUsd = Math.max(liquidityUsd / 2, 0.01);
  const feeRate = feeBps / 10_000;
  const afterFee = sizeUsd * (1 - feeRate);
  const estimatedReceiveUsd = quoteDepthUsd * afterFee / (quoteDepthUsd + afterFee);
  const estimatedImpactPct = Math.max(0, (1 - estimatedReceiveUsd / afterFee) * 100);
  const positionToQuoteDepthPct = sizeUsd / quoteDepthUsd * 100;
  const suggestedChunks = Math.max(1, Math.ceil(sizeUsd / Math.max(quoteDepthUsd * 0.02, 1)));
  return {
    method: "constant-product pressure proxy",
    feeBps,
    quoteDepthUsd,
    positionToQuoteDepthPct,
    estimatedReceiveUsd,
    estimatedImpactPct,
    suggestedChunks,
    chunkSizeUsd: sizeUsd / suggestedChunks
  };
}

export function gradeExit({ model, liquidityUsd, volume24hUsd }) {
  const turnover = liquidityUsd > 0 ? volume24hUsd / liquidityUsd : 0;
  if (liquidityUsd < 10_000) return { grade: "CRITICAL", reason: "Primary pool liquidity is below $10K." };
  if (model.positionToQuoteDepthPct > 8) return { grade: "CRITICAL", reason: "Position exceeds 8% of estimated quote-side depth." };
  if (model.positionToQuoteDepthPct > 2) return { grade: "THIN", reason: "Position exceeds 2% of estimated quote-side depth." };
  if (turnover < 0.05) return { grade: "THIN", reason: "24h turnover is below 5% of pool liquidity." };
  return { grade: "DEEP", reason: "Position stays below the configured depth wall." };
}

export async function analyzeExit({ token, sizeUsd = 1000, fetchImpl = fetch, rpcUrl = globalThis.process?.env?.RH_RPC_URL || DEFAULT_RPC }) {
  validateInput(token, sizeUsd);
  const normalized = token.toLowerCase();
  const [pairResponse, chainIdHex, blockHex] = await Promise.all([
    fetchImpl(`${DEX_API}/${normalized}`, { headers: { "user-agent": "SLIP/0.1" }, signal: AbortSignal.timeout(8_000) }),
    rpc("eth_chainId", rpcUrl, fetchImpl),
    rpc("eth_blockNumber", rpcUrl, fetchImpl)
  ]);
  if (!pairResponse.ok) throw new Error(`Market provider returned HTTP ${pairResponse.status}`);
  const rawPairs = await pairResponse.json();
  const pairs = (Array.isArray(rawPairs) ? rawPairs : [])
    .filter((pair) => pair.chainId === "robinhood" && number(pair.liquidity?.usd) > 0)
    .map(poolView)
    .sort((a, b) => b.liquidityUsd - a.liquidityUsd);
  if (!pairs.length) throw new Error("No liquid Robinhood Chain pool was found for this token.");
  const primaryPool = pairs[0];
  const pairRaw = rawPairs.find((pair) => pair.pairAddress === primaryPool.pairAddress) || rawPairs[0];
  const tokenSide = pairRaw.baseToken?.address?.toLowerCase() === normalized ? pairRaw.baseToken : pairRaw.quoteToken;
  const model = modelExit({ sizeUsd, liquidityUsd: primaryPool.liquidityUsd });
  const verdict = gradeExit({ model, liquidityUsd: primaryPool.liquidityUsd, volume24hUsd: primaryPool.volume24hUsd });
  const ladderSizes = [...new Set([sizeUsd / 4, sizeUsd / 2, sizeUsd, sizeUsd * 2, sizeUsd * 5].map((v) => Math.max(1, Math.round(v))))];
  return {
    version: "0.1.0",
    observedAt: new Date().toISOString(),
    input: { token, sizeUsd },
    chain: { name: "Robinhood Chain", chainId: Number.parseInt(chainIdHex, 16), blockNumber: Number.parseInt(blockHex, 16), rpcUrl },
    token: { address: token, name: tokenSide?.name || "Unknown", symbol: tokenSide?.symbol || "?", priceUsd: primaryPool.priceUsd },
    market: {
      poolsFound: pairs.length,
      aggregateLiquidityUsd: pairs.reduce((sum, pool) => sum + pool.liquidityUsd, 0),
      primaryPool,
      pools: pairs.slice(0, 8)
    },
    grade: verdict.grade,
    reason: verdict.reason,
    model,
    ladder: ladderSizes.map((notionalUsd) => ({ notionalUsd, ...modelExit({ sizeUsd: notionalUsd, liquidityUsd: primaryPool.liquidityUsd }) })),
    boundaries: [
      "Read-only: SLIP never connects a wallet or submits a transaction.",
      "The receive and impact fields are a constant-product pressure proxy, not an executable Uniswap V4 quote.",
      "DEX market data can lag or omit pools; verify execution in the venue before trading."
    ]
  };
}

export const formatUsd = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 10 ? 2 : 0 }).format(value);
export const formatPct = (value) => `${Number(value).toFixed(value < 10 ? 2 : 1)}%`;
