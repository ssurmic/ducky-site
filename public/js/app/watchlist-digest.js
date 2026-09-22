// watchlist-digest.js — one plain line per stock from the columns already on its row.
// Presentation only: no request, no forecast, no level called a floor or a target. It fills the
// Overview cell until a reviewed stock summary exists (the shared analysis stays the source of
// record and replaces it the moment it is ready) and feeds the one-line strip above the table.
//
// A digest is a list of language-neutral parts `{key, vars}`: `key` names a `watch.digest_*` string
// and each var is a literal, a raw number with a format name (`{v, f, tone}`), a counted noun
// (`{count, one, many, tone}`), a named word (`{key, tone}`) or a joined list (`{join, sep}`).
// Both languages format the same numbers the way the table cells do, and a tone colours a value
// like its column (price up/down, buy/sell, put/call). The shared projection can carry the same
// shape computed once after the close (`row.digest.parts`); that copy is the same for every viewer
// and wins over the browser's own pass.
import {s,LANG} from './strings.js';
import {el,pct,px} from './ui.js';

const finite=n=>typeof n==='number'&&Number.isFinite(n);
const locale=()=>LANG==='zh'?'zh-CN':'en-US';
const money=v=>new Intl.NumberFormat(locale(),{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(v);
const strike=v=>Number.isInteger(v)?'$'+new Intl.NumberFormat(locale()).format(v):px(v);
const gap=(level,price)=>finite(level)&&finite(price)&&price>0?(level/price-1)*100:null;
export const WALL_NEAR_PCT=3;

const FORMATS={num1:v=>Math.abs(v).toFixed(1),num2:v=>Math.abs(v).toFixed(2),pct1:v=>pct(v,1),pct2:v=>pct(v,2),money:v=>money(Math.abs(v)),strike,px,ratio:v=>v.toFixed(2)};
const value=(v,f,tone=null)=>({v,f,tone});
const count=(n,one,many,tone=null)=>n>0?{count:n,one,many,tone}:'';
const join=items=>({join:items.filter(Boolean)});
const word=(key,tone)=>({key,tone});
const KEYS=/^watch\.digest_[a-z_]+$/,WORDS=/^watch\.(digest_ref_[a-z]+|signal_[a-z]+_(one|many))$/;
// Placeholder marker: a private-use code point no translation contains.
const MARK='';

function text(v){
  if(v===null||v===undefined||v==='')return '';
  if(typeof v==='string')return v;
  if(typeof v==='number')return String(v);
  if(Array.isArray(v))return v.map(text).filter(Boolean).join('');
  if(Array.isArray(v.join))return v.join.map(text).filter(Boolean).join(typeof v.sep==='string'?v.sep:' · ');
  if(Number.isInteger(v.count))return WORDS.test(v.one)&&WORDS.test(v.many)?s(v.count===1?v.one:v.many,{n:v.count}):'';
  if(typeof v.key==='string')return WORDS.test(v.key)?s(v.key):'';
  if(finite(v.v)&&FORMATS[v.f])return FORMATS[v.f](v.v);
  return '';
}
function node(v){
  if(v&&typeof v==='object'&&Array.isArray(v.join)){
    const frag=document.createDocumentFragment();
    for(const item of v.join){const piece=node(item);if(!piece)continue;if(frag.childNodes.length)frag.append(typeof v.sep==='string'?v.sep:' · ');frag.append(piece);}
    return frag.childNodes.length?frag:null;
  }
  const label=text(v);if(!label)return null;
  const tone=v&&typeof v==='object'&&typeof v.tone==='string'&&/^[a-z]+$/.test(v.tone)?v.tone:null;
  return tone?el('span.stock-digest-value',{class:'is-'+tone},label):document.createTextNode(label);
}
// Split the localized template on its placeholders so every value keeps its own tone.
function fill(item,render){
  const vars=item.vars&&typeof item.vars==='object'?item.vars:{};
  const marked=s(item.key,Object.fromEntries(Object.keys(vars).map(k=>[k,MARK+k+MARK])));
  return marked.split(MARK).map((chunk,i)=>i%2?render(vars[chunk]):chunk);
}
export const partText=item=>fill(item,text).join('');
export function partNodes(item){
  const span=el('span.stock-digest-part');
  for(const piece of fill(item,node))if(piece)span.append(piece);
  return span;
}

// The nearest option wall to the last price, signed: negative = below.
export function nearestWall(walls){
  if(walls?.status!=='ready')return null;
  const refs=[['put',walls.put],['call',walls.call]].map(([kind,level])=>({kind,level,gap:gap(level,walls.price)})).filter(r=>finite(r.gap));
  return refs.sort((a,b)=>Math.abs(a.gap)-Math.abs(b.gap))[0]||null;
}
export const insiderNet=insider=>insider?.status==='ready'&&insider.count>0?(insider.bought||0)-(insider.sold||0):null;

// Where the last price sits against the references the row already carries: the nearest reference
// below it (put wall or 20-day low), the call wall above, and the position inside the 20-day range.
export function priceContext(sig){
  const support=sig?.support,walls=sig?.walls;
  const price=finite(support?.price)?support.price:finite(walls?.price)?walls.price:null;
  if(!finite(price)||price<=0)return null;
  const below=(support?.status==='ready'?support.refs||[]:[]).filter(r=>finite(r.value)&&r.value<=price)
    .map(r=>({kind:r.key,level:r.value,gap:(price/r.value-1)*100})).sort((a,b)=>a.gap-b.gap)[0]||null;
  const call=walls?.status==='ready'&&finite(walls.call)&&walls.call>=price?{level:walls.call,gap:(walls.call/price-1)*100}:null;
  const span=support?.status==='ready'&&finite(support.low)&&finite(support.high)&&support.high>support.low?(price-support.low)/(support.high-support.low)*100:null;
  return {price,below,call,span};
}

// The browser's own pass over a row and its signals, in the reading order the owner asked for.
export function digestItems(row,sig){
  const items=[],part=(key,vars={})=>items.push({key,vars});
  // 1. Today's close and where it sits against the row's references.
  const change=row?.change_pct;
  if(finite(change)&&row?.price_status!=='missing')part(change>0?'watch.digest_close_up':change<0?'watch.digest_close_down':'watch.digest_close_flat',change?{n:value(change,'pct2',change>0?'up':'down')}:{});
  const context=priceContext(sig);
  if(context?.below){
    const put=context.below.kind==='put_wall';
    part(context.below.gap<0.05?'watch.digest_at_reference':'watch.digest_above_reference',
      {n:value(context.below.gap,'num1'),price:value(context.below.level,put?'strike':'px'),kind:word(put?'watch.digest_ref_put':'watch.digest_ref_low',put?'put':'low')});
  }
  if(context?.call)part(context.call.gap<0.05?'watch.digest_at_call':'watch.digest_below_call',{n:value(context.call.gap,'num1'),price:value(context.call.level,'strike'),kind:word('watch.digest_ref_call','call')});
  // The low or high sixth of the 20-day closing range is worth a word; the middle is not.
  if(finite(context?.span)&&(context.span<=15||context.span>=85))part(context.span<=15?'watch.digest_range_low':'watch.digest_range_high');
  // 2. What the options market prices against what the stock has done.
  const iv=row?.metrics?.iv_hv;
  if(finite(iv?.value)&&iv.status==='ready'&&(iv.value<=0.8||iv.value>=1.2))part(iv.value<=0.8?'watch.digest_iv_low':'watch.digest_iv_high',{n:value(iv.value,'ratio')});
  // 3. The longer frame.
  const ytd=row?.metrics?.ytd,dd=row?.metrics?.drawdown;
  if(finite(ytd?.value)&&['ready','retained'].includes(ytd.status))part('watch.digest_ytd',{n:value(ytd.value,'pct1',ytd.value>0?'up':ytd.value<0?'down':null)});
  if(finite(dd?.value)&&dd.status==='ready')part(dd.value<0?'watch.digest_drawdown':'watch.digest_at_high',dd.value<0?{n:value(dd.value,'num1','down')}:{});
  // 4. Who has been trading it.
  const insider=sig?.insider,net=insiderNet(insider);
  if(net!==null)part(net<0?'watch.digest_insider_sell':net>0?'watch.digest_insider_buy':'watch.digest_insider_even',
    {value:value(net,'money',net<0?'sell':net>0?'buy':null),filings:count(insider.count,'watch.signal_insider_one','watch.signal_insider_many')});
  const funds=sig?.funds;
  if(funds?.status==='ready'&&(funds.adds?.length||funds.trims?.length))part('watch.digest_funds',{moves:join([
    count(funds.adds?.length||0,'watch.signal_adds_one','watch.signal_adds_many','buy'),count(funds.trims?.length||0,'watch.signal_trims_one','watch.signal_trims_many','sell')])});
  const pol=sig?.politicians;
  if(pol?.status==='ready'&&pol.count>0)part('watch.digest_politicians',{trades:join([
    count(pol.buys||0,'watch.signal_buys_one','watch.signal_buys_many','buy'),count(pol.sells||0,'watch.signal_sells_one','watch.signal_sells_many','sell')])});
  // 5. One plain reading when the facts line up: pulled back from its high, sitting within 3% of a
  //    reference below, insiders not net selling. A description of where the stock is, not advice.
  if(finite(dd?.value)&&dd.status==='ready'&&dd.value<=-10&&context?.below&&context.below.gap<=3&&!(net!==null&&net<0))part('watch.digest_pullback');
  return items;
}

// The shared projection's copy, computed once after the close with the same rules; only known
// string keys are accepted so a stored document can never inject copy.
export function serverItems(digest){
  if(!Array.isArray(digest?.parts))return null;
  const items=digest.parts.filter(p=>p&&typeof p.key==='string'&&KEYS.test(p.key)).map(p=>({key:p.key,vars:p.vars&&typeof p.vars==='object'?p.vars:{}}));
  return items.length?items:null;
}
export const digestItemsFor=(row,sig)=>serverItems(row?.digest)||digestItems(row,sig);
export const digestParts=(row,sig)=>digestItemsFor(row,sig).map(partText);
export const digestText=(row,sig)=>digestParts(row,sig).join(' · ');
export function digestNodes(row,sig){
  const out=[];
  for(const item of digestItemsFor(row,sig)){if(out.length)out.push(' · ');out.push(partNodes(item));}
  return out;
}

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
