// A bounded search sample, not a launch index or a transaction stream.
export const MARKET_SOURCE = 'https://api.dexscreener.com/latest/dex/search?q=robinhood%20WETH';
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const clean = (value, max) => String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').slice(0, max);
export function normalizeMarkets(pairs) {
  if (!Array.isArray(pairs)) throw new Error('Invalid provider response');
  const tokens = new Map();
  for (const pair of pairs.slice(0, 100)) {
    if (pair?.chainId !== 'robinhood' || !ADDRESS.test(pair.baseToken?.address ?? '')) continue;
    const liquidity = pair.liquidity?.usd;
    if (typeof liquidity !== 'number' || !Number.isFinite(liquidity) || liquidity <= 0) continue;
    const address = pair.baseToken.address.toLowerCase();
    const item = { address, symbol: clean(pair.baseToken.symbol, 24) || '?', name: clean(pair.baseToken.name, 80) || 'Unknown', liquidityUsd: liquidity };
    if (!tokens.has(address) || tokens.get(address).liquidityUsd < liquidity) tokens.set(address, item);
  }
  return [...tokens.values()].sort((a, b) => b.liquidityUsd - a.liquidityUsd).slice(0, 24);
}
export function createMarketFeed(fetchImpl = fetch, now = Date.now) {
  let cached, pending, retryAt = 0;
  const stale = () => cached && now() - cached.fetchedAt < 300_000 ? { ...cached.body, stale: true } : null;
  return async function readMarkets() {
    if (cached && now() - cached.fetchedAt < 30_000) return cached.body;
    if (pending) return pending;
    if (now() < retryAt) { if (stale()) return stale(); throw new Error('Provider cooldown'); }
    pending = (async () => {
      try {
        const response = await fetchImpl(MARKET_SOURCE, { signal: AbortSignal.timeout(8000), cf: { cacheTtl: 30, cacheEverything: true } });
        if (!response.ok) throw new Error('Market provider unavailable');
        const raw = await response.json();
        const body = { source: 'DexScreener search: robinhood WETH', scope: 'Sample of matching Robinhood pools. Not all tokens, new launches or a safety ranking.', observedAt: new Date(now()).toISOString(), refreshSeconds: 30, tokens: normalizeMarkets(raw?.pairs) };
        cached = { body, fetchedAt: now() }; retryAt = 0;
        return body;
      } catch (error) { retryAt = now() + 15_000; if (stale()) return stale(); throw error; }
      finally { pending = null; }
    })();
    return pending;
  };
}
export const readMarkets = createMarketFeed();
