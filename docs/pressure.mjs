export function pressure(liquidity,size,volume){
 const depth=Math.max(liquidity/2,.01),afterFee=size*.99,receive=depth*afterFee/(depth+afterFee),impact=Math.max(0,(1-receive/afterFee)*100),ratio=size/depth*100;
 let grade='DEEP',reason='Position stays below the configured depth wall.';
 if(liquidity<10000){grade='CRITICAL';reason='Primary pool liquidity is below $10K.';}
 else if(ratio>8){grade='CRITICAL';reason='Position exceeds 8% of estimated quote-side depth.';}
 else if(ratio>2){grade='THIN';reason='Position exceeds 2% of estimated quote-side depth.';}
 else if(volume/liquidity<.05){grade='THIN';reason='24h turnover is below 5% of pool liquidity.';}
 return {receive,impact,ratio,grade,reason};
}
