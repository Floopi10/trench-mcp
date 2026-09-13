import { pressure } from './pressure.mjs';
export const LIMITS = ['Quote depth is modeled as reported liquidity / 2; fee assumption is 1%.', 'Constant-product pressure proxy, not an executable quote or token safety rating.', 'Four independent scenarios, not sequential sells or a routing simulation.', 'Gas, MEV and complete Uniswap v4 tick-level liquidity are not modeled.', 'Pool data and RPC block are separate observations. Missing numeric provider fields can normalize to zero.'];
export function scenarios(liquidity, size, volume) {
 if (![liquidity,size,volume].every(Number.isFinite) || liquidity <= 0 || size <= 0 || volume < 0) throw new Error('Invalid model inputs.');
 return [10,25,50,100].map(percent => ({percent,sizeUsd:size*percent/100,...pressure(liquidity,size*percent/100,volume)}));
}
export function demoReport(liquidity,size,volume) {
 const rows=scenarios(liquidity,size,volume),full=rows.at(-1);
 return {mode:'demo',observedAt:new Date().toISOString(),input:{token:null,sizeUsd:size},token:{address:null,name:'Synthetic example',symbol:'DEMO'},chain:{name:'Synthetic example',chainId:null,blockNumber:null},market:{poolsFound:1,primaryPool:{liquidityUsd:liquidity,volume24hUsd:volume,dex:'Synthetic',pairAddress:null,url:null}},grade:full.grade,reason:full.reason,model:{feeBps:100,quoteDepthUsd:liquidity/2,estimatedReceiveUsd:full.receive,estimatedImpactPct:full.impact,positionToQuoteDepthPct:full.ratio},scenarios:rows,boundaries:LIMITS};
}
export function liveReceipt(report, token, size) {
 const p=report?.market?.primaryPool;
 if (!p || ![p.liquidityUsd,p.volume24hUsd].every(Number.isFinite) || p.liquidityUsd<=0 || p.volume24hUsd<0 || report?.chain?.chainId!==4663 || !Number.isSafeInteger(report.chain.blockNumber) || report.chain.blockNumber<0 || report?.token?.address?.toLowerCase()!==token.toLowerCase() || report.input?.sizeUsd!==size || report.model?.feeBps!==100 || !Number.isFinite(Date.parse(report.observedAt))) throw new Error('The server returned an incomplete or incompatible observation. No result was displayed.');
 return {...report,mode:'live',scenarios:scenarios(p.liquidityUsd,size,p.volume24hUsd),boundaries:[...new Set([...(report.boundaries||[]),...LIMITS])]};
}
const escapeMd=value=>String(value??'Not available').replace(/[\\`*_{}\[\]<>()#|]/g,'\\$&').replace(/[\r\n]+/g,' ');
export function markdownReceipt(r) {
 return ['# TRENCH pressure receipt',`Mode: ${r.mode==='demo'?'SYNTHETIC DEMO':'LIVE PUBLIC OBSERVATION'}`,`Observed at: ${r.observedAt}`,`Token: ${escapeMd(r.token.address)}`,`Symbol: ${escapeMd(r.token.symbol)}`,`RPC block: ${r.chain.blockNumber??'Not applicable (demo)'}`,`Pool: ${escapeMd(r.market.primaryPool.pairAddress)}`,`Liquidity USD: ${r.market.primaryPool.liquidityUsd}`,`24h volume USD: ${r.market.primaryPool.volume24hUsd}`,'','| Position | Input USD | Modeled receive USD | Impact % | Grade |','|---|---:|---:|---:|---|',...r.scenarios.map(s=>`| ${s.percent}% | ${s.sizeUsd.toFixed(2)} | ${s.receive.toFixed(2)} | ${s.impact.toFixed(4)} | ${s.grade} |`),'','## Limitations',...r.boundaries.map(x=>`- ${escapeMd(x)}`)].join('\n');
}
