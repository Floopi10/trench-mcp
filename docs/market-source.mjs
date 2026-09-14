export const DEX_SEARCH = 'https://api.dexscreener.com/latest/dex/search?q=robinhood%20WETH';
const PROXY = 'https://trench-mcp.mytodofloopi.workers.dev/api/markets';
const clean = (value, max) => String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').slice(0, max);

export function normalizeDexPairs(pairs) {
 if (!Array.isArray(pairs)) throw new Error('Invalid DexScreener response');
 const tokens = new Map();
 for (const pair of pairs.slice(0, 100)) {
  if (pair?.chainId !== 'robinhood' || !/^0x[a-fA-F0-9]{40}$/.test(pair.baseToken?.address ?? '')) continue;
  const liquidityUsd = pair.liquidity?.usd;
  if (!Number.isFinite(liquidityUsd) || liquidityUsd <= 0) continue;
  const address = pair.baseToken.address.toLowerCase();
  const token = { address, symbol: clean(pair.baseToken.symbol, 24) || '?', name: clean(pair.baseToken.name, 80) || 'Unknown', liquidityUsd };
  if (!tokens.has(address) || tokens.get(address).liquidityUsd < liquidityUsd) tokens.set(address, token);
 }
 return [...tokens.values()].sort((a, b) => b.liquidityUsd - a.liquidityUsd).slice(0, 24);
}

// Public CORS endpoint first. No key, cookies, wallet or paid API required.
export async function readBrowserMarkets(signal, fetchImpl = fetch, now = Date.now) {
 async function request(url) {
  const timeout = new AbortController();
  const abort = () => timeout.abort();
  if (signal.aborted) abort();
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 5000);
  try {
   const response = await fetchImpl(url, { signal: timeout.signal, credentials: 'omit', cache: 'no-store' });
   if (!response.ok) {
    const error = new Error(`Market provider HTTP ${response.status}`);
    if (response.status === 429) error.retryMs = 60000;
    throw error;
   }
   return await response.json();
  } finally {
   clearTimeout(timer);signal.removeEventListener('abort', abort);
  }
 }
 try {
  const raw = await request(DEX_SEARCH);
  return { source: 'DexScreener / direct', observedAt: new Date(now()).toISOString(), refreshSeconds: 30, tokens: normalizeDexPairs(raw?.pairs) };
 } catch (error) {
  // Do not route around an explicit rate limit or a user cancellation.
  if (signal.aborted || error.retryMs) throw error;
  const cached = await request(PROXY);
  return { ...cached, source: 'DexScreener / server fallback' };
 }
}
