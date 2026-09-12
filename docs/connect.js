import './app.js';
const button = document.querySelector('#endpoint-check'), status = document.querySelector('#endpoint-status');
button.addEventListener('click', async () => {
 button.disabled = true; status.textContent = 'Checking HTTPS endpoint…';
 try {
  const response = await fetch('https://trench-mcp.mytodofloopi.workers.dev/health', {signal: AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.service !== 'trench-mcp' || data.transport !== 'streamable-http') throw new Error('Unexpected service response');
  status.textContent = 'Endpoint reachable. Add the MCP URL to your client.';
 } catch { status.textContent = 'Endpoint could not be verified. Retry or use the local server.'; }
 finally { button.disabled = false; }
});
