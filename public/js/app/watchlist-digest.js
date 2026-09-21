// watchlist-digest.js — one plain line per stock from the columns already on its row.
// Presentation only: no request, no forecast, no level called a floor or a target. It fills the
// Overview cell until a reviewed stock summary exists (the shared analysis stays the source of
// record and replaces it the moment it is ready) and feeds the one-line strip above the table.
import {s,LANG} from './strings.js';
import {pct,px} from './ui.js';

const finite=n=>typeof n==='number'&&Number.isFinite(n);
const money=v=>new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(v);
const strike=v=>Number.isInteger(v)?'$'+new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US').format(v):px(v);
const gap=(level,price)=>finite(level)&&finite(price)&&price>0?(level/price-1)*100:null;
export const WALL_NEAR_PCT=3;

// The nearest option wall to the last price, signed: negative = below.
export function nearestWall(walls){
  if(walls?.status!=='ready')return null;
  const refs=[['put',walls.put],['call',walls.call]].map(([kind,level])=>({kind,level,gap:gap(level,walls.price)})).filter(r=>finite(r.gap));
  return refs.sort((a,b)=>Math.abs(a.gap)-Math.abs(b.gap))[0]||null;
}
export const insiderNet=insider=>insider?.status==='ready'&&insider.count>0?(insider.bought||0)-(insider.sold||0):null;

export function digestParts(row,sig){
  const parts=[];
  const insider=sig?.insider,net=insiderNet(insider);
  const count=(n,one,many)=>n>0?s(n===1?one:many,{n}):'';
  if(net!==null)parts.push(s(net<0?'watch.digest_insider_sell':net>0?'watch.digest_insider_buy':'watch.digest_insider_even',
    {value:money(Math.abs(net)),filings:count(insider.count,'watch.signal_insider_one','watch.signal_insider_many')}));
  const funds=sig?.funds;
  if(funds?.status==='ready'&&(funds.adds?.length||funds.trims?.length))parts.push(s('watch.digest_funds',{moves:[count(funds.adds?.length||0,'watch.signal_adds_one','watch.signal_adds_many'),
    count(funds.trims?.length||0,'watch.signal_trims_one','watch.signal_trims_many')].filter(Boolean).join(' · ')}));
  const pol=sig?.politicians;
  if(pol?.status==='ready'&&pol.count>0)parts.push(s('watch.digest_politicians',{trades:[count(pol.buys||0,'watch.signal_buys_one','watch.signal_buys_many'),
    count(pol.sells||0,'watch.signal_sells_one','watch.signal_sells_many')].filter(Boolean).join(' · ')}));
  const wall=nearestWall(sig?.walls);
  if(wall)parts.push(s(wall.kind==='put'?(wall.gap<0?'watch.digest_put_below':'watch.digest_put_above'):(wall.gap<0?'watch.digest_call_below':'watch.digest_call_above'),
    {price:strike(wall.level),n:Math.abs(wall.gap).toFixed(1)}));
  const ytd=row?.metrics?.ytd,dd=row?.metrics?.drawdown,price=[];
  if(finite(ytd?.value)&&['ready','retained'].includes(ytd.status))price.push(s('watch.digest_ytd',{n:pct(ytd.value,1)}));
  if(finite(dd?.value)&&dd.status==='ready')price.push(s(dd.value<0?'watch.digest_drawdown':'watch.digest_at_high',{n:Math.abs(dd.value).toFixed(1)}));
  if(price.length)parts.push(price.join(LANG==='zh'?'，':', '));
  return parts;
}
export const digestText=(row,sig)=>digestParts(row,sig).join(' · ');

// Counts for the strip above the table; every count is a stock, never a filing.
export function listSummary(rows,signals){
  const out={n:0,sells:0,buys:0,funds:0,walls:0,loaded:false};
  for(const row of rows){
    if(!row?.ticker)continue;out.n++;
    const sig=signals?.get?.(row.ticker);if(!sig)continue;
    if(sig.insider?.status==='ready'||sig.funds?.status==='ready'||sig.walls?.status==='ready')out.loaded=true;
    const net=insiderNet(sig.insider);if(net!==null&&net<0)out.sells++;if(net!==null&&net>0)out.buys++;
    if(sig.funds?.status==='ready'&&(sig.funds.adds?.length||0)>(sig.funds.trims?.length||0))out.funds++;
    const wall=nearestWall(sig.walls);if(wall&&wall.kind==='put'&&Math.abs(wall.gap)<=WALL_NEAR_PCT)out.walls++;
  }
  return out;
}
