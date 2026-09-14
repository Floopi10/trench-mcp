const section=document.querySelector('[data-market-deck]');
if(section){
 const grid=section.querySelector('.market-grid'),status=section.querySelector('.feed-status'),pause=section.querySelector('[data-feed-pause]'),refresh=section.querySelector('[data-feed-refresh]'),empty=section.querySelector('.scanner-empty'),feedback=section.querySelector('.feed-feedback');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),rows=new Map(),API='https://trench-mcp.mytodofloopi.workers.dev/api/markets',fmt=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact'});
 let queue=[],rowTimer,pollTimer,controller,paused=false,interacting=false,nextFetch=0,expiresAt=0,expiryTimer,pendingSnapshot=null,failures=0;
 const countdown=document.createElement('span');countdown.dataset.refreshCountdown='';countdown.textContent='AUTO / connecting';section.querySelector('.scanner-statusbar').append(countdown);
 function el(tag,cls,text){const e=document.createElement(tag);e.className=cls;e.textContent=text;return e;}
 function say(text){feedback.hidden=false;feedback.textContent=text;}
 function selectToken(ca){
  if(!/^0x[a-fA-F0-9]{40}$/.test(ca))return;
  if(document.getElementById('analysis-form'))document.dispatchEvent(new CustomEvent('trench:select-token',{detail:{token:ca}}));
  else location.href=`terminal.html?token=${ca}&analyze=1`;
 }
 function placeholder(title,detail){empty.hidden=rows.size>0;empty.querySelector('[data-empty-title]').textContent=title;empty.querySelector('[data-empty-detail]').textContent=detail;}
 function add({token,time}){
  if(rows.has(token.address)||rows.size>=24)return;
  const row=el('tr','market-card','');row.dataset.address=token.address;
  const observed=el('td','market-time',time.slice(11,19)),name=el('td','market-token','');name.append(el('strong','',token.symbol),el('small','',token.name));
  const contract=el('td','market-contract',''),copy=el('button','copy-contract',`${token.address.slice(0,8)}…${token.address.slice(-6)}`);copy.type='button';copy.title=token.address;copy.setAttribute('aria-label',`Copy CA ${token.address}`);
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(token.address);say(`Copied ${token.address}`);}catch{say(`Copy manually: ${token.address}`);}});contract.append(copy);
  const actions=el('td','market-actions',''),analyze=el('a','','Analyze ↗');analyze.href=`terminal.html?token=${token.address}&analyze=1`;analyze.setAttribute('aria-label',`Analyze ${token.symbol} at $1,000`);
  analyze.addEventListener('click',event=>{if(document.getElementById('analysis-form')&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();selectToken(token.address);}});
  const agent=el('a','agent-link','Agent');agent.href=`connect.html?token=${token.address}`;actions.append(analyze,agent);
  row.append(observed,name,contract,el('td','token-liquidity',fmt.format(token.liquidityUsd)),actions);grid.append(row);rows.set(token.address,row);empty.hidden=true;
 }
 function reveal(){clearTimeout(rowTimer);if(paused||document.hidden||interacting)return;if(reduced.matches){queue.splice(0).forEach(add);return;}if(queue.length)rowTimer=setTimeout(()=>{add(queue.shift());reveal();},1000);}
 function controls(){
  refresh.disabled=!!controller||paused||Date.now()<nextFetch;
  countdown.textContent=paused?'AUTO / paused':document.hidden?'AUTO / tab hidden':controller?'AUTO / updating':`${failures?'RETRY':'NEXT UPDATE'} / ${Math.max(0,Math.ceil((nextFetch-Date.now())/1000))}s`;
 }
 function expire(){if(expiresAt&&Date.now()>=expiresAt){clearTimeout(rowTimer);queue=[];pendingSnapshot=null;rows.clear();grid.replaceChildren();expiresAt=0;status.textContent='Previous snapshot expired.';placeholder('Snapshot expired','The scanner will retry automatically, or paste a CA below.');}}
 function applySnapshot(data){
  const incoming=new Set(data.tokens.map(t=>t.address));clearTimeout(rowTimer);queue=[];
  // Keep controls under the pointer/focus stable, but always update observed values.
  pendingSnapshot=interacting?data:null;
  if(!interacting)for(const [address,row] of rows)if(!incoming.has(address)){row.remove();rows.delete(address);}
  for(const token of data.tokens){
   const row=rows.get(token.address);
   if(row){
    row.querySelector('.market-time').textContent=data.observedAt.slice(11,19);
    row.querySelector('.token-liquidity').textContent=fmt.format(token.liquidityUsd);
    row.querySelector('.market-token strong').textContent=token.symbol;
    row.querySelector('.market-token small').textContent=token.name;
    row.querySelector('.market-actions a').setAttribute('aria-label',`Analyze ${token.symbol} at $1,000`);
    row.dataset.outdated=String(!incoming.has(token.address));
   }else queue.push({token,time:data.observedAt});
  }
  for(const [address,row] of rows)if(!incoming.has(address)){row.dataset.outdated='true';row.querySelector('.market-time').textContent='PREVIOUS';}
  if(!rows.size)queue.splice(0,6).forEach(add);
  placeholder('No matching liquid pools','Paste a CA below or wait for the next update.');reveal();
 }
 function interactionChanged(){if(!interacting&&pendingSnapshot&&!paused&&!document.hidden){expire();if(pendingSnapshot)applySnapshot(pendingSnapshot);}reveal();}
 async function load(){
  if(controller||paused||document.hidden||Date.now()<nextFetch)return;
  const active=new AbortController();controller=active;controls();const timeout=setTimeout(()=>active.abort(),12000);
  status.classList.remove('error');status.textContent=rows.size?'Refreshing · keeping the previous snapshot visible':'Connecting to public markets...';
  try{
   const response=await fetch(API,{signal:active.signal,cache:'no-store'});
   if(!response.ok){if(response.status===429)nextFetch=Date.now()+60000;throw new Error(response.status===429?'Request limit reached. Retry in one minute.':'Market provider unavailable.');}
   const data=await response.json(),stamp=Date.parse(data.observedAt);
   if(active.signal.aborted||paused||document.hidden)return;
   if(!Array.isArray(data.tokens)||!Number.isFinite(stamp)||Date.now()-stamp>300000||stamp>Date.now()+60000)throw new Error('Invalid or expired snapshot.');
   const tokens=[...new Map(data.tokens.filter(t=>t&&/^0x[a-fA-F0-9]{40}$/.test(t.address)&&typeof t.symbol==='string'&&typeof t.name==='string'&&Number.isFinite(t.liquidityUsd)&&t.liquidityUsd>0).map(t=>[t.address.toLowerCase(),{...t,address:t.address.toLowerCase(),symbol:t.symbol.slice(0,24),name:t.name.slice(0,80)}])).values()].slice(0,24);
   failures=0;nextFetch=Date.now()+30000;
   expiresAt=stamp+300000;clearTimeout(expiryTimer);expiryTimer=setTimeout(expire,Math.max(0,expiresAt-Date.now()));
   status.textContent=`${data.stale?'CACHED / STALE':'SNAPSHOT'} · ${tokens.length} tokens · ${data.observedAt.slice(11,19)} UTC`;status.classList.toggle('error',!!data.stale);
   applySnapshot({...data,tokens});
  }catch(error){
   if(paused||document.hidden){status.textContent=paused?'Paused':'Request stopped while page was hidden';return;}
   failures++;nextFetch=Math.max(nextFetch,Date.now()+Math.min(60000,5000*2**Math.min(failures-1,4)));status.classList.add('error');status.textContent=`${error.name==='AbortError'?'Connection timed out.':error.message}${rows.size?' Previous snapshot shown — may be stale.':' No live snapshot.'}`;
   placeholder('Reconnecting automatically','No invented tokens. Watch the retry countdown, or paste a CA below.');
  }finally{clearTimeout(timeout);controller=null;controls();schedule();}
 }
 function schedule(){clearTimeout(pollTimer);controls();expire();if(!paused&&!document.hidden){pollTimer=setTimeout(schedule,1000);if(!controller&&Date.now()>=nextFetch)void load();}}
 pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(paused));if(paused){controller?.abort();status.textContent='Paused · displayed snapshot is not refreshing';}else{if(expiresAt)status.textContent='Resumed · previous snapshot shown until next update';interactionChanged();}reveal();schedule();});refresh.addEventListener('click',()=>void load());
 grid.addEventListener('mouseenter',()=>{interacting=true;reveal();});grid.addEventListener('mouseleave',()=>{interacting=grid.contains(document.activeElement);interactionChanged();});grid.addEventListener('focusin',()=>{interacting=true;reveal();});grid.addEventListener('focusout',e=>{if(!grid.contains(e.relatedTarget)){interacting=grid.matches(':hover');interactionChanged();}});
  section.querySelector('[data-scan-form]').addEventListener('submit',e=>{e.preventDefault();selectToken(section.querySelector('#scanner-ca').value.trim());});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)controller?.abort();expire();interactionChanged();schedule();});reduced.addEventListener('change',reveal);schedule();
}
