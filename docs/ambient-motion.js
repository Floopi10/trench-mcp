// Homepage decoration and rotating product facts. No market events are simulated.
const hero = document.querySelector('.hero');
const notes = document.querySelector('[data-project-notes]');
if (hero && notes) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const lens = document.querySelector('[data-depth-lens]');
  const toggle = document.querySelector('.lens-pause');
  const rain = document.createElement('div');
  rain.className = 'mascot-rain';
  rain.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 10; i++) {
    const drop = document.createElement('img');
    drop.src = 'assets/trench-mascot.png';
    drop.alt = '';
    drop.width = 42;
    drop.height = 42;
    drop.style.setProperty('--x', `${(i * 37 + 4) % 96}%`);
    drop.style.setProperty('--duration', `${14 + i % 5 * 2}s`);
    drop.style.setProperty('--delay', `${-i * 2.7}s`);
    drop.style.setProperty('--drift', `${i % 2 ? 55 : -55}px`);
    rain.append(drop);
  }
  hero.prepend(rain);
  const facts = [
    ['01 / OBSERVE', 'A chart is only the surface.', 'Inspect observed token pools, liquidity and volume before you model a position.', 'inspect_token'],
    ['02 / COMPARE', 'Same pool. Different pressure.', 'Compare up to eight USD position sizes against one fetched pool observation.', 'compare_exit_sizes'],
    ['03 / CONNECT', 'Your agent gets the evidence.', 'Five MCP tools return structured results, reasons and model limits. No wallet required.', 'MCP / HTTPS'],
    ['04 / VERIFY', 'An estimate. Not a sell quote.', 'The model uses estimated quote depth and a disclosed 1% fee. It does not execute trades.', 'PUBLIC CODE / EXPLICIT LIMITS']
  ];
  const card = notes.querySelector('.note-card');
  const counter = notes.querySelector('.note-counter');
  const close = notes.querySelector('.note-close');
  const restore = hero.querySelector('.notes-restore');
  let index = 0;
  let timer;
  let visible = true;
  let hovered = false;
  let focused = false;
  let closed = false;
  let paused = false;
  const enabled = () => !reduced.matches && !paused && !document.hidden && visible;
  function render() {
    const [label, title, detail, tool] = facts[index];
    notes.querySelector('.note-label').textContent = label;
    notes.querySelector('h2').textContent = title;
    notes.querySelector('.note-detail').textContent = detail;
    notes.querySelector('.note-tool').textContent = tool;
    counter.textContent = `${index + 1} / ${facts.length}`;
    if (enabled()) card.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 500, easing: 'ease-out' });
  }
  function sync() {
    clearTimeout(timer);
    hero.dataset.motionPaused = String(!enabled());
    if (enabled() && !closed && !hovered && !focused) {
      timer = setTimeout(() => { index = (index + 1) % facts.length; render(); sync(); }, 7500);
    }
  }
  // The existing visible pause button controls both the lens and ambient activity.
  if (lens) new MutationObserver(() => {
    paused = lens.dataset.paused === 'true';
    sync();
  }).observe(lens, { attributes: true, attributeFilter: ['data-paused'] });
  toggle?.setAttribute('aria-label', 'Pause or resume all homepage animation');
  notes.querySelector('.note-next').addEventListener('click', () => { index = (index + 1) % facts.length; render(); sync(); });
  notes.addEventListener('mouseenter', () => { hovered = true; sync(); });
  notes.addEventListener('mouseleave', () => { hovered = false; sync(); });
  notes.addEventListener('focusin', () => { focused = true; sync(); });
  notes.addEventListener('focusout', event => { if (!notes.contains(event.relatedTarget)) { focused = false; sync(); } });
  close.addEventListener('click', () => {
    closed = true; notes.hidden = true; restore.hidden = false; restore.focus(); sync();
  });
  restore.addEventListener('click', () => {
    closed = false; notes.hidden = false; restore.hidden = true; close.focus(); sync();
  });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; sync();
  }).observe(hero);
  render();
  sync();
}
