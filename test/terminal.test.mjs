import test from 'node:test';import assert from 'node:assert/strict';
import {createWorker} from '../src/worker.mjs';
import {scenarios,demoReport,liveReceipt,markdownReceipt} from '../docs/terminal-model.mjs';
import {modelExit,gradeExit} from '../src/slip-engine.mjs';
const token='0x'+'1'.repeat(40),env={MCP_RATE_LIMITER:{limit:async()=>({success:true})}};
const request=body=>new Request('https://trench-mcp.mytodofloopi.workers.dev/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://trenchmcp.lol'},body:JSON.stringify(body)});
test('analysis API validates input and delegates only token/size to the shared engine',async()=>{
 let calls=0;const worker=createWorker(undefined,async args=>{calls++;return {input:args};});
 for(const body of [null,{}, {token:'bad',sizeUsd:5},{token,sizeUsd:-1},{token,sizeUsd:Infinity},{token,sizeUsd:'5'},{token,sizeUsd:5,rpcUrl:'https://evil.example'}])assert.equal((await worker.fetch(request(body),env)).status,400);
 assert.equal(calls,0);const response=await worker.fetch(request({token,sizeUsd:5000}),env);assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://trenchmcp.lol');assert.deepEqual(await response.json(),{input:{token,sizeUsd:5000}});assert.equal(calls,1);
});
test('provider failures produce explicit errors without synthetic fallback or leaked internals',async()=>{
 for(const [message,status]of [['No liquid Robinhood Chain pool was found for this token.',404],['sensitive internal detail',502]]){const r=await createWorker(undefined,async()=>{throw new Error(message);}).fetch(request({token,sizeUsd:5}),env);assert.equal(r.status,status);const text=await r.text();assert.ok(!text.includes('sensitive internal detail'));assert.ok(!text.includes('scenarios'));}
});
test('browser scenario math matches server engine across sizes and turnover gates',()=>{
 for(const l of [5000,10000,100000,1000000])for(const size of [.01,500,1500,5000,1e7])for(const volume of [0,5000,20000])for(const row of scenarios(l,size,volume)){const m=modelExit({liquidityUsd:l,sizeUsd:row.sizeUsd});assert.equal(row.receive,m.estimatedReceiveUsd);assert.equal(row.grade,gradeExit({model:m,liquidityUsd:l,volume24hUsd:volume}).grade);}
});
test('demo exports retain synthetic labeling and invalidate incompatible live data',()=>{
 const d=demoReport(100000,5000,20000);assert.equal(d.mode,'demo');assert.equal(d.chain.blockNumber,null);assert.equal(d.scenarios.length,4);assert.match(markdownReceipt(d),/SYNTHETIC DEMO/);assert.throws(()=>liveReceipt(d,token,5000));assert.throws(()=>scenarios(NaN,1,0));
});
