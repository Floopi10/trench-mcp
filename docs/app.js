document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
 const status = document.querySelector('#copy-status');
 try { await navigator.clipboard.writeText(button.dataset.copy); if(status) status.textContent = 'Copied. Paste into your MCP client.'; }
 catch { if(status) status.textContent = 'Select the endpoint and copy it manually.'; }
}));
