// Synthetic numbers for reviewing the existing metrics' presentation, never provider observations.
const rows = [
  ['NVDA',215,230,210,48,54,219.3,198.7,68],
  ['MU',160,180,155,56,48,162,148,76],
  ['AMD',185,210,182,52,58,201,179,61],
  ['ORCL',130,150,128,38,44,143,151,49],
  ['META',720,800,710,32,35,735,691,56],
  ['MSFT',500,535,490,29,27,510,476,43],
  ['AVGO',340,370,338,41,46,344,310,58],
  ['AAPL',null,null,null,null,null,334,302,39],
  ['TSM',null,null,null,null,null,null,null,null],
];
export const metricsFor = ticker => {
  const row=rows.find(row=>row[0]===ticker);
  if(!row)return null;
  const [,put,call,low20,iv,hv,ma50,ma200,degen]=row;
  return {put,call,low20,iv,hv,ma50,ma200,degen,ratio:Number.isFinite(iv)&&Number.isFinite(hv)&&hv>0?iv/hv:null,
    asOf:'2026-09-25',expiry:Number.isFinite(iv)?'2026-10-16':null};
};
