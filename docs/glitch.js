const root=document.documentElement,button=document.getElementById('effects-toggle'),motion=window.matchMedia('(prefers-reduced-motion: reduce)');
let enabled=true;
try {enabled=localStorage.getItem('trench-visual-effects')!=='off';}catch{}
function apply(){const active=enabled&&!motion.matches;root.dataset.effects=active?'on':'off';button.disabled=motion.matches;button.setAttribute('aria-pressed',String(active));button.textContent=motion.matches?'FX: REDUCED':active?'FX: ON':'FX: OFF';button.title=motion.matches?'Your system requests reduced motion. Animations are disabled.':'Toggle decorative animations. Market data is never animated.';}
button.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('trench-visual-effects',enabled?'on':'off');}catch{}apply();});
motion.addEventListener('change',apply);document.addEventListener('visibilitychange',()=>{root.dataset.pageActive=String(!document.hidden);});root.dataset.pageActive=String(!document.hidden);apply();
