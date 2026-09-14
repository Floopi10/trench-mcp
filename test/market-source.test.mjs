import test from 'node:test';
import assert from 'node:assert/strict';
import { readBrowserMarkets, normalizeDexPairs, DEX_SEARCH } from '../docs/market-source.mjs';
import { normalizeMarkets } from '../src/market-feed.mjs';
const pair={chainId:'robinhood',baseToken:{address:'0x'+'1'.repeat(40),symbol:'TEST',name:'Test'},liquidity:{usd:1200}};
const signal=()=>new AbortController().signal;
test('direct market normalization matches server and excludes foreign/invalid pools',()=>{
 const pairs=[pair,{...pair,liquidity:{usd:3000}},{...pair,chainId:'solana'},{...pair,liquidity:{usd:NaN}}];
 assert.deepEqual(normalizeDexPairs(pairs),normalizeMarkets(pairs));assert.equal(normalizeDexPairs(pairs)[0].liquidityUsd,3000);
 assert.throws(()=>normalizeDexPairs(null));
});
test('browser reads public DexScreener directly without credentials or proxy',async()=>{
 const calls=[];const data=await readBrowserMarkets(signal(),async(url,options)=>{calls.push(url);assert.equal(options.credentials,'omit');return Response.json({pairs:[pair]});},()=>1000);
 assert.deepEqual(calls,[DEX_SEARCH]);assert.equal(data.tokens.length,1);assert.equal(data.observedAt,'1970-01-01T00:00:01.000Z');
});
test('browser falls back on network failure, preserving server timestamp and stale flag',async()=>{
 const cached={tokens:[],observedAt:'2026-09-14T00:00:00Z',stale:true};let calls=0;
 const data=await readBrowserMarkets(signal(),async()=>{if(++calls===1)throw new TypeError('network');return Response.json(cached);});
 assert.equal(calls,2);assert.equal(data.observedAt,cached.observedAt);assert.equal(data.stale,true);
});
test('rate limited direct request never routes around the limit',async()=>{
 let calls=0;await assert.rejects(()=>readBrowserMarkets(signal(),async()=>{calls++;return new Response('',{status:429});}),e=>e.retryMs===60000);assert.equal(calls,1);
});
test('cancelled request does not start a fallback',async()=>{
 const c=new AbortController();c.abort();let calls=0;
 await assert.rejects(()=>readBrowserMarkets(c.signal,async(url,{signal})=>{calls++;signal.throwIfAborted();}));assert.equal(calls,1);
});
