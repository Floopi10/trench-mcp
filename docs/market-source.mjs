export const DEX_SEARCH = 'https://api.dexscreener.com/latest/dex/search?q=solana%20SOL';
const PROXY = 'https://trench-mcp.mytodofloopi.workers.dev/api/markets';
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const clean = (value, max) => String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').slice(0, max);
export function normalizeDexPairs(pairs) {
 if (!Array.isArray(pairs)) throw new Error('Invalid DexScreener response');
 const tokens = new Map();
 for (const pair of pairs.slice(0, 100)) {
  if (pair?.chainId !== 'solana' || !SOLANA_ADDRESS.test(pair.baseToken?.address ?? '')) continue;
  const liquidityUsd = pair.liquidity?.usd;
  if (!Number.isFinite(liquidityUsd) || liquidityUsd <= 0) continue;
  const address = pair.baseToken.address;
  const token = { address, symbol: clean(pair.baseToken.symbol, 24) || '?', name: clean(pair.baseToken.name, 80) || 'Unknown', liquidityUsd };
  if (!tokens.has(address) || tokens.get(address).liquidityUsd < liquidityUsd) tokens.set(address, token);
 }
 return [...tokens.values()].sort((a, b) => b.liquidityUsd - a.liquidityUsd).slice(0, 24);
}
export async function readBrowserMarkets(signal, fetchImpl = fetch, now = Date.now) {
 async function request(url) { const timeout = new AbortController(), abort = () => timeout.abort(); if (signal.aborted) abort(); signal.addEventListener('abort', abort, { once: true }); const timer = setTimeout(abort, 5000); try { const response = await fetchImpl(url, { signal: timeout.signal, credentials: 'omit', cache: 'no-store' }); if (!response.ok) { const error = new Error(`Market provider HTTP ${response.status}`); if (response.status === 429) error.retryMs = 60000; throw error; } return await response.json(); } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); } }
 try { const raw = await request(DEX_SEARCH); return { source: 'DexScreener / direct', observedAt: new Date(now()).toISOString(), refreshSeconds: 30, tokens: normalizeDexPairs(raw?.pairs) }; }
 catch (error) { if (signal.aborted || error.retryMs) throw error; const cached = await request(PROXY); return { ...cached, source: 'DexScreener / server fallback' }; }
}
