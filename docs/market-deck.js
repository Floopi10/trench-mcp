const section = document.querySelector('[data-market-deck]');
if (section) {
  const grid = section.querySelector('.market-grid');
  const status = section.querySelector('.feed-status');
  const pause = section.querySelector('[data-feed-pause]');
  const refresh = section.querySelector('[data-feed-refresh]');
  const feedback = section.querySelector('.feed-feedback');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const shown = new Set();
  let queue = [], timer, pollTimer, controller, lastFetch = 0, paused = false, focused = false, hovered = false;
  const API = 'https://trench-mcp.mytodofloopi.workers.dev/api/markets';
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' });
  function element(tag, cls, text) { const e = document.createElement(tag); e.className = cls; e.textContent = text; return e; }
  function add(token) {
    if (shown.has(token.address) || shown.size >= 24) return;
    shown.add(token.address);
    const card = element('article', 'market-card', '');
    card.append(element('h3', '', token.symbol), element('p', 'token-name', token.name), element('code', '', token.address), element('p', 'token-liquidity', `Observed pool liquidity ${fmt.format(token.liquidityUsd)}`));
    const actions = element('div', 'market-actions', '');
    const analyze = element('a', '', 'Analyze $1,000 ↗');
    analyze.href = `terminal.html?token=${encodeURIComponent(token.address)}&analyze=1`;
    const copy = element('button', '', 'Copy CA'); copy.type = 'button';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(token.address); feedback.textContent = 'CA copied.'; }
      catch { feedback.textContent = 'Clipboard unavailable. Select the displayed CA to copy it.'; }
    });
    const agent = element('a', '', 'Ask your agent ↗'); agent.href = `connect.html?token=${encodeURIComponent(token.address)}`;
    actions.append(analyze, copy, agent); card.append(actions); grid.append(card);
  }
  function play() {
    clearTimeout(timer);
    if (paused || document.hidden || focused || hovered) return;
    if (reduced.matches) { queue.splice(0).forEach(add); return; }
    if (queue.length) timer = setTimeout(() => { add(queue.shift()); play(); }, 1000);
  }
  async function load() {
    if (controller || paused || document.hidden || focused || hovered) return;
    if (Date.now() - lastFetch < 30_000) return;
    lastFetch = Date.now(); controller = new AbortController(); refresh.disabled = true;
    const timeout = setTimeout(() => controller?.abort(), 10_000);
    try {
      const response = await fetch(API, { signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 429 ? 'Rate limit reached. Retry in a minute.' : 'Feed unavailable. Retry shortly or enter a CA in the terminal.');
      const data = await response.json();
      if (!Array.isArray(data.tokens) || !Number.isFinite(Date.parse(data.observedAt))) throw new Error('Invalid feed response. No tokens displayed.');
      const tokens = data.tokens.filter(t => /^0x[a-fA-F0-9]{40}$/.test(t.address) && typeof t.symbol === 'string' && typeof t.name === 'string' && Number.isFinite(t.liquidityUsd) && t.liquidityUsd > 0).slice(0,24);
      if (focused || hovered || paused || document.hidden) return;
      // Never reorder or remove a card under a pointer or keyboard focus.
      // A new snapshot is applied only when the grid is not being used.
      if (!focused && !hovered) {
        clearTimeout(timer); grid.replaceChildren(); shown.clear(); queue = tokens;
        if (queue.length) add(queue.shift());
      }
      status.classList.remove('error');
      status.textContent = `${tokens.length} matching tokens · fetched ${new Date(data.observedAt).toLocaleTimeString()} · search sample, not new launches.${tokens.length ? '' : ' No matching liquid pools found.'}`;
      play();
    } catch (error) {
      status.classList.add('error');
      status.textContent = `${error.name === 'AbortError' ? 'Feed request timed out.' : error.message} ${shown.size ? 'Visible cards are from the previous fetch; they may be stale.' : 'No synthetic tokens substituted.'}`;
    } finally { clearTimeout(timeout); controller = null; }
  }
  function schedule() {
    clearTimeout(pollTimer); play();
    if (!paused && !document.hidden) { load(); pollTimer = setTimeout(schedule, 30_000); }
  }
  pause.addEventListener('click', () => { paused = !paused; pause.setAttribute('aria-pressed', String(paused)); pause.textContent = paused ? 'Resume feed' : 'Pause feed'; if (paused) controller?.abort(); schedule(); });
  refresh.addEventListener('click', load);
  setInterval(() => { refresh.disabled = !!controller || paused || Date.now() - lastFetch < 30_000; }, 1000);
  grid.addEventListener('mouseenter', () => { hovered = true; play(); });
  grid.addEventListener('mouseleave', () => { hovered = false; play(); });
  grid.addEventListener('focusin', () => { focused = true; play(); });
  grid.addEventListener('focusout', e => { if (!grid.contains(e.relatedTarget)) { focused = false; play(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) controller?.abort(); schedule(); });
  reduced.addEventListener('change', play);
  schedule();
}
