import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from '../src/worker.mjs';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { buildServer } from '../src/server.mjs';
import { Client } from '@modelcontextprotocol/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
const env = { MCP_RATE_LIMITER: { limit: async () => ({success:true}) }, ASSETS: {fetch: () => new Response('static')} };
const endpoint = 'https://trench-mcp.mytodofloopi.workers.dev/mcp';
const request = (body, extra={}) => new Request(endpoint, {method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',...extra},body});
test('HTTP agent discovers five tools and calls chain_health', async () => {
 const handler = createMcpHandler(() => buildServer({chainHealth:async()=>({ok:true,chainId:46630,blockNumber:12345,source:'test fixture'})}),{responseMode:'json'});
 const worker=createWorker(handler),client=new Client({name:'http-test',version:'1.0'});
 const transport=new StreamableHTTPClientTransport(new URL(endpoint),{fetch:(input,init)=>worker.fetch(new Request(input,init),env)});
 try {await client.connect(transport); const listed=await client.listTools();assert.equal(listed.tools.length,5);const result=await client.callTool({name:'chain_health',arguments:{}});assert.equal(result.structuredContent.blockNumber,12345);assert.equal(result.isError,undefined);}
 finally {await client.close();await handler.close();}
});
test('HTTP endpoint rejects untrusted origins, oversized bodies, invalid JSON and batches',async()=>{
 const worker=createWorker();
 for(const [body,headers,status] of [['{}',{Origin:'https://evil.example'},403],['x'.repeat(17000),{},413],['{',{},400],['[]',{},400]]) assert.equal((await worker.fetch(request(body,headers),env)).status,status);
 assert.equal((await worker.fetch(request('{}'),{...env,MCP_RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
 assert.equal((await worker.fetch(request('{}'),{ASSETS:env.ASSETS})).status,503);
 assert.equal((await worker.fetch(new Request(endpoint),env)).status,405);
});


test('legacy 2025 client can initialize and list tools without a session', async () => {
 const worker = createWorker();
 const headers = {'MCP-Protocol-Version':'2025-11-25'};
 const initialize = await worker.fetch(request(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'legacy-test',version:'1'}}}),headers),env);
 assert.equal(initialize.status,200);assert.match(await initialize.text(),/protocolVersion/);
 const list = await worker.fetch(request(JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list',params:{}}),headers),env);
 assert.equal(list.status,200);assert.match(await list.text(),/simulate_exit/);
});
