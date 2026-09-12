import { createMcpHandler } from '@modelcontextprotocol/server';
import { buildServer } from './server.mjs';

const MAX_BODY = 16 * 1024;
const origins = new Set(['https://trenchmcp.lol', 'https://www.trenchmcp.lol', 'https://trench-mcp.mytodofloopi.workers.dev']);
const handler = createMcpHandler(() => buildServer(), { responseMode: 'json' });

export function createWorker(mcp = handler) {
 return { async fetch(request, env) {
  const url = new URL(request.url);
  if (!['/mcp', '/health'].includes(url.pathname)) return env.ASSETS.fetch(request);
  const origin = request.headers.get('Origin');
  const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  if (origin && !origins.has(origin)) return new Response('Origin not allowed', { status: 403, headers });
  if (origin) { headers.set('Access-Control-Allow-Origin', origin); headers.set('Vary', 'Origin'); }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID');
  headers.set('Access-Control-Expose-Headers', 'MCP-Protocol-Version, MCP-Session-Id');
  const reply = (message, status) => new Response(message, { status, headers });
  if (request.method === 'OPTIONS') return reply(null, 204);
  if (!env.MCP_RATE_LIMITER) return reply('Service temporarily unavailable', 503);
  const { success } = await env.MCP_RATE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
  if (!success) { headers.set('Retry-After', '60'); return reply('Rate limit exceeded', 429); }
  if (url.pathname === '/health') {
   if (request.method !== 'GET') return reply('Method not allowed', 405);
   headers.set('Content-Type', 'application/json');
   return reply(JSON.stringify({ service: 'trench-mcp', transport: 'streamable-http', tools: 5 }), 200);
  }
  if (request.method !== 'POST') return reply('Use an MCP Streamable HTTP client to POST requests', 405);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return reply('Expected application/json', 415);
  if (Number(request.headers.get('Content-Length')) > MAX_BODY) return reply('Request too large', 413);
  let parsedBody;
  try {
   const reader = request.body?.getReader();
   if (!reader) return reply('Missing request body', 400);
   const chunks = []; let length = 0;
   for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY) { await reader.cancel(); return reply('Request too large', 413); }
    chunks.push(value);
   }
   const bytes = new Uint8Array(length); let offset = 0;
   for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
   parsedBody = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
   if (Array.isArray(parsedBody)) return reply('Batch requests are not supported', 400);
  } catch { return reply('Invalid JSON request', 400); }
  try {
   const response = await mcp.fetch(request, { parsedBody });
   const merged = new Headers(response.headers);
   for (const [key, value] of headers) merged.set(key, value);
   return new Response(response.body, { status: response.status, headers: merged });
  } catch { return reply('MCP request failed', 500); }
 }};
}
export default createWorker();
