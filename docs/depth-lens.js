const lens = document.querySelector('[data-depth-lens]');
if (lens) {
 const content = {
  observe: ['inspect_token / chain_health', 'Start with public evidence.', 'Read observed pool liquidity and volume, plus a separate Robinhood RPC block observation. No wallet connection.'],
  model: ['simulate_exit / compare_exit_sizes', 'Your size changes the pressure.', 'The code applies a constant-product proxy to estimated quote depth, with a disclosed 1% fee. It is not an executable sell quote.'],
  explain: ['explain_exit_signal / MCP', 'Give your agent the evidence.', 'Structured results include a grade, reasons and model limits. Your MCP-compatible agent can explain them; it does not rewrite the formula.']
 };
 const buttons = [...lens.querySelectorAll('[data-lens-step]')];
 for (const button of buttons) button.addEventListener('click', () => {
  const step = button.dataset.lensStep;
  if (!Object.hasOwn(content, step)) return;
  lens.dataset.step = step;
  for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
  const [tool, heading, detail] = content[step];
  lens.querySelector('.lens-tool').textContent = tool;
  lens.querySelector('.lens-explanation h3').textContent = heading;
  lens.querySelector('.lens-detail').textContent = detail;
 });
 const pause = lens.querySelector('.lens-pause');
 pause.addEventListener('click', () => {
  const paused = lens.dataset.paused !== 'true';
  lens.dataset.paused = String(paused);
  pause.setAttribute('aria-pressed', String(paused));
  pause.textContent = paused ? 'Resume motion' : 'Pause motion';
 });
 if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(([entry]) => { lens.dataset.offscreen = String(!entry.isIntersecting); });
  observer.observe(lens);
 }
}
