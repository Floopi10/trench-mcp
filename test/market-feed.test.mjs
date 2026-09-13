import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMarkets, createMarketFeed, MARKET_SOURCE } from '../src/market-feed.mjs';
import { createWorker } from '../src/worker.mjs';
const address='0x'+'a'.repeat(40);
const pair=(liquidity=100)=>({chainId:'robinhood',baseToken:{address,symbol:'TEST',name:'Test'},liquidity:{usd:liquidity}});
test('feed filters chains, malformed addresses and liquidity; deduplicates largest pool',()=>{
 const tokens=normalizeMarkets([null,pair(100),pair(300),{...pair(),chainId:'solana'},{...pair(),baseToken:{address:'bad'}},pair(NaN),pair(-1)]);
 assert.equal(tokens.length,1);assert.equal(tokens[0].liquidityUsd,300);assert.equal(tokens[0].address,address);
 assert.equal(normalizeMarkets([{...pair(),baseToken:{address,symbol:'X'.repeat(300),name:'N'.repeat(500)}}])[0].symbol.length,24);
 assert.throws(()=>normalizeMarkets({}));
});
test('feed coalesces requests, caches for 30 seconds and does not use expired data on failure',async()=>{
 let time=100000,calls=0,fail=false;
 const feed=createMarketFeed(async url=>{assert.equal(url,MARKET_SOURCE);calls++;await new Promise(r=>setTimeout(r,5));if(fail)throw new Error('down');return Response.json({pairs:[pair()]});},()=>time);
 const [a,b]=await Promise.all([feed(),feed()]);assert.deepEqual(a,b);assert.equal(calls,1);
 await feed();assert.equal(calls,1);time+=31000;fail=true;await assert.rejects(feed());assert.equal(calls,2);
 await assert.rejects(feed());assert.equal(calls,2);time+=16000;fail=false;await feed();assert.equal(calls,3);
});
test('markets route has CORS, rate limit, method and explicit failure handling',async()=>{
 const env={MCP_RATE_LIMITER:{limit:async()=>({success:true})}};
 const worker=createWorker(undefined,undefined,async()=>({tokens:[]}));
 const request=(method='GET',origin='https://trenchmcp.lol')=>new Request('https://trenchmcp.lol/api/markets',{method,headers:{Origin:origin}});
 let response=await worker.fetch(request(),env);assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://trenchmcp.lol');assert.deepEqual(await response.json(),{tokens:[]});
 assert.equal((await worker.fetch(request('POST'),env)).status,405);
 assert.equal((await worker.fetch(request('GET','https://evil.example'),env)).status,403);
 assert.equal((await worker.fetch(request(),{MCP_RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
 response=await createWorker(undefined,undefined,async()=>{throw new Error('private detail');}).fetch(request(),env);
 assert.equal(response.status,502);assert.ok(!(await response.text()).includes('private detail'));
});
