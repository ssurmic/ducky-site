// Reading order only. Preserve every record and the original order within each
// class; no sentiment, confidence, source weight or chronology is recomputed.
export function readingOrder(rows,{point='',tickers=null}={}){
  const mention=row=>row.intent==='mention'||row.basis==='verified_mention_no_direction';
  const rank=row=>[
    point&&row.point_id===point?0:1,
    tickers?.length&&tickers.includes(row.ticker)?0:1,
    mention(row)?1:0
  ];
  return [...rows].sort((a,b)=>{
    const left=rank(a),right=rank(b);
    for(let i=0;i<left.length;i++)if(left[i]!==right[i])return left[i]-right[i];
    return 0;
  });
}
