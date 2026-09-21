// watchlist-signals.js — dated disclosure and options references beside each watched stock.
// Presentation only: reads saved stock-brief facts (GET /briefing/stocks) and archived Form 4
// and 13F records (GET /radar/archive.json). Nothing here forecasts, sets a target price or
// promises a floor: every value is a sourced, dated reference with its own clock. Insider
// trades and fund moves list newest first; open-market sales and trimmed positions read red.
import {el,px,modal} from './ui.js';
import {s,LANG} from './strings.js';

export const signalKeys=['insider','funds','walls','support'];
const copy={insider:'watch.signal_insider',funds:'watch.signal_funds',walls:'watch.signal_walls',support:'watch.signal_support'};
export const signalLabel=key=>s(copy[key]);
// A "?" beside each header opens a plain-language explanation: what it is, where it comes from, its limits.
export function signalHelpButton(key,meta={}){
  return el('button.watch-signal-help',{type:'button','aria-label':s('watch.signal_help_label',{column:signalLabel(key)}),'data-reading-key':'signal-help:'+key,
    onclick:()=>modal(signalLabel(key),el('div.watch-signal-help-body',el('p',s('watch.signal_help_'+key)),
      el('p.small.muted',s('watch.signal_method_'+key,{n:meta.count||'—',since:meta.since||'—'})),
      el('p.small.muted',s('watch.signal_source_note',{date:meta.as_of||'—'}))))},'?');
}
// Report periods read as quarters; a 13F is a quarter-end snapshot, not a trade date.
const quarter=v=>{const d=day(v);if(!d)return '';const m=Number(d.slice(5,7));return d.slice(0,4)+' Q'+Math.ceil(m/3);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):'';
const newest=values=>values.map(day).filter(Boolean).sort().at(-1)||'';
const shortDate=v=>day(v)?day(v).slice(5).replace('-','/'):'—';
const money=v=>new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(v);
const gap=(level,price)=>finite(level)&&finite(price)&&price>0?(level/price-1)*100:null;
const gapText=n=>!finite(n)?'':Math.abs(n)<0.05?s('watch.signal_at_price'):s(n<0?'watch.signal_below':'watch.signal_above',{n:Math.abs(n).toFixed(1)});
// Strikes are whole or half dollars; print them without a spurious ".00".
const strike=v=>Number.isInteger(v)?'$'+new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US').format(v):px(v);

const validTxn=t=>finite(t?.price)&&finite(t?.shares)&&t.price>0&&t.shares>0;
// Archive rows carry the filing's direction: 1 for reported purchases, -1 for open-market sales.
const tradeSide=row=>row?.direction===-1?'sell':'buy';
const newestFirst=(a,b)=>String(b.date||'').localeCompare(String(a.date||''));
const who=owners=>{const names=(owners||[]).map(o=>o.name).filter(Boolean);return names.length>1?s('watch.signal_owners_more',{name:names[0],n:names.length-1}):names[0]||s('evidence.recorded_data');};
const link=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
// The officer title ("Chief Financial Officer") is more telling than the bare role ("Officer").
const owner=o=>({name:o?.name||o?.reporter_name||'',role:o?.title||o?.role||o?.relationship||''});
// Reported trades → one insider signal: filings newest first (trader, role, side, shares × price,
// value, link), bought and sold totals, and the volume-weighted purchase price (a historical
// transaction price, not support). `value` is the total traded value, so sorting ranks activity.
function insiderFrom(filings,{status='ready',as_of='',complete=true}={}){
  const sorted=[...filings].sort(newestFirst);
  const buys=sorted.filter(f=>f.side!=='sell'),sells=sorted.filter(f=>f.side==='sell');
  const purchases=buys.flatMap(f=>f.transactions);
  const shares=purchases.reduce((sum,t)=>sum+t.shares,0),bought=purchases.reduce((sum,t)=>sum+t.price*t.shares,0);
  const sold=sells.flatMap(f=>f.transactions).reduce((sum,t)=>sum+t.price*t.shares,0);
  const people=sorted.flatMap(f=>f.owners);
  return {status:sorted.length?'ready':status,count:sorted.length,buys:buys.length,sells:sells.length,value:bought+sold,bought,sold,shares,
    average:shares>0?bought/shares:null,filings:sorted,latest:newest(sorted.map(f=>f.date)),
    owners:[...new Set(people.map(o=>o.name).filter(Boolean))],roles:[...new Set(people.map(o=>o.role).filter(Boolean))],
    as_of:as_of||newest(sorted.map(f=>f.date)),complete,side:buys.length&&sells.length?'both':sells.length?'sell':buys.length?'buy':null};
}

// One stock brief (ticker-brief/2): facts carry topic, data, observed_at and source_at. A brief whose
// own text is pending still ships its last deterministic facts (`facts_status: dated`).
export function briefSignals(item){
  const facts=Array.isArray(item?.evidence)?item.evidence:null;
  if(!facts)return {insider:{status:'missing'},walls:{status:'missing'},support:{status:'missing'}};
  const dated=item?.facts_status==='dated';
  const price=facts.find(f=>f.topic==='price')?.data?.price;
  const insiderFacts=facts.filter(f=>f.topic==='reported_insider_purchase');
  const filings=insiderFacts.map(f=>{const txns=(f.data?.transactions||[]).filter(validTxn);
    return {date:day(f.source_at||f.observed_at),side:'buy',owners:(Array.isArray(f.data?.owners)?f.data.owners:[]).map(owner).filter(o=>o.name),
      transactions:txns.map(x=>({price:x.price,shares:x.shares,date:day(x.date)})),value:txns.reduce((sum,x)=>sum+x.price*x.shares,0),url:link(f.source_url)};});
  const insider={...insiderFrom(filings,{status:'none',as_of:newest(insiderFacts.map(f=>f.observed_at))}),dated,source:'brief'};
  const options=facts.find(f=>f.topic==='option_concentrations'),w=options?.data||{};
  const walls={status:finite(w.call_wall)||finite(w.put_wall)?'ready':'none',
    call:finite(w.call_wall)?w.call_wall:null,put:finite(w.put_wall)?w.put_wall:null,flip:finite(w.flip)?w.flip:null,
    expiries:Array.isArray(w.expiries)?w.expiries.filter(e=>typeof e==='string'):[],price:finite(price)?price:null,as_of:day(options?.observed_at)};
  const position=facts.find(f=>f.topic==='price_position'),band=position?.data||{};
  const current=finite(band.price)?band.price:finite(price)?price:null;
  const refs=[];
  if(finite(w.put_wall))refs.push({key:'put_wall',value:w.put_wall,gap:gap(w.put_wall,current)});
  if(finite(band.low))refs.push({key:'range_low',value:band.low,gap:gap(band.low,current)});
  const support={status:refs.length?'ready':'none',refs,low:finite(band.low)?band.low:null,high:finite(band.high)?band.high:null,
    price:current,sessions:finite(band.sessions)?band.sessions:20,as_of:newest([options?.observed_at,position?.observed_at]),dated};
  return {insider,walls:{...walls,dated},support};
}

// Archived Form 4 records for exactly the watched stocks (the same local records the insider board
// reads, scanned every few minutes), so "none" never waits for a brief to be regenerated. Records
// held for date review are skipped, as the brief does. Purchases and open-market sales are both
// kept, each filing tagged with its side. "None" is only claimed on a complete page.
export function insiderSignals(doc,{months=12,now=Date.now()}={}){
  const since=new Date(now-months*30.5*864e5).toISOString().slice(0,10);
  const rows=(Array.isArray(doc?.items)?doc.items:[]).filter(row=>row?.kind==='insider'&&!row.extra?.facts?.date_review_required&&day(row.ts||row.published_at)>=since);
  const byTicker=new Map();
  for(const row of rows){
    const ticker=String(row.ticker||'').toUpperCase();if(!ticker)continue;
    const facts=row.extra?.facts||{},txns=(Array.isArray(facts.transactions)?facts.transactions:[]).filter(validTxn);
    if(!txns.length)continue;
    const filing={date:day(row.ts||row.published_at),side:tradeSide(row),owners:(Array.isArray(facts.owners)?facts.owners:[]).map(owner).filter(o=>o.name),
      transactions:txns.map(x=>({price:x.price,shares:x.shares,date:day(x.date)})),value:txns.reduce((sum,x)=>sum+x.price*x.shares,0),url:link(row.source_url||row.extra?.source_url)};
    if(!byTicker.has(ticker))byTicker.set(ticker,[]);
    byTicker.get(ticker).push(filing);
  }
  const loaded=Array.isArray(doc?.items)&&!doc.partial;
  return {loaded,byTicker,complete:loaded&&!doc.next_cursor,count:rows.length,since};
}

// Archived 13F records ordered newest first: reported-share increases and new positions (adds) and
// decreases and exits (trims). Unchanged positions are not moves. Option, warrant and debt lines
// never count, and one fund's amended report for a quarter replaces its original instead of
// doubling the move.
const MOVES={new:'add',increased:'add',decreased:'trim',closed:'trim'};
export function fundSignals(doc){
  const rows=(Array.isArray(doc?.items)?doc.items:[]).filter(row=>row?.kind==='13f'&&!row.extra?.facts?.put_call);
  const byTicker=new Map(),seen=new Set(),filings=new Set();
  for(const row of rows){
    const ticker=String(row.ticker||'').toUpperCase();if(!ticker)continue;
    const facts=row.extra?.facts||{},fund=row.reporter_name||facts.reporter_name||'';
    const change=facts.position_change||(row.direction===1?'increased':row.direction===-1?'decreased':'held');
    if(!MOVES[change])continue;
    const key=ticker+'|'+fund+'|'+(facts.report_period||'');
    if(seen.has(key))continue;seen.add(key);
    filings.add(facts.accession||String(row.id||'').split(':')[1]||row.id||'');
    const entry=byTicker.get(ticker)||{status:'ready',moves:[],adds:[],trims:[],latest:''};
    const newShares=finite(facts.new_shares)?facts.new_shares:null,newValue=finite(facts.new_value)?facts.new_value:null;
    const range=facts.quarter_price_range&&finite(facts.quarter_price_range.low)&&finite(facts.quarter_price_range.high)?facts.quarter_price_range:null;
    // 13F values are quarter-end marks: value / shares is the quarter-end price, never a purchase price.
    // A mark far outside the quarter's closing range is a reporting-unit problem, so it is withheld.
    const mark=newShares>0&&newValue>0?newValue/newShares:null;
    const plausible=mark!==null&&(!range||(mark>=range.low/2&&mark<=range.high*2));
    const move={fund,change,side:MOVES[change],
      period:quarter(facts.report_period)||'',periodEnd:day(facts.report_period),filed:day(row.ts||row.published_at),id:row.id||'',url:row.source_url||row.extra?.source_url||'',
      shares:{prior:finite(facts.prior_shares)?facts.prior_shares:null,now:newShares},
      quarterEnd:plausible?mark:null,range};
    entry.moves.push(move);(move.side==='add'?entry.adds:entry.trims).push(move);
    entry.latest=newest([entry.latest,row.ts,row.published_at]);
    byTicker.set(ticker,entry);
  }
  // Newest report period first, then the newest filing; the cell shows the first move.
  const order=(a,b)=>String(b.periodEnd||'').localeCompare(String(a.periodEnd||''))||String(b.filed||'').localeCompare(String(a.filed||''));
  for(const entry of byTicker.values()){for(const list of [entry.moves,entry.adds,entry.trims])list.sort(order);
    entry.side=entry.adds.length&&entry.trims.length?'both':entry.trims.length?'trim':'add';}
  const since=rows.map(r=>day(r.ts)).filter(Boolean).sort()[0]||'';
  const loaded=Array.isArray(doc?.items)&&!doc.partial;
  // "None" is only claimed when the page covered the stocks completely (no further cursor);
  // a truncated page can only say the stock is absent from the records it holds.
  return {loaded,byTicker,since,count:rows.length,filings:filings.size,complete:loaded&&!doc.next_cursor};
}

export function buildSignals(briefs,funds,tickers=[],insiders=null){
  const briefItems=new Map((Array.isArray(briefs?.items)?briefs.items:[]).filter(i=>i?.ticker).map(i=>[String(i.ticker).toUpperCase(),i]));
  const archive=fundSignals(funds),filings=insiderSignals(insiders);
  const out=new Map();
  for(const ticker of new Set([...tickers,...briefItems.keys(),...archive.byTicker.keys(),...filings.byTicker.keys()])){
    const fund=archive.byTicker.get(ticker),brief=briefSignals(briefItems.get(ticker));
    // The archived filings decide the insider column whenever that page loaded; the brief's copy of
    // the same records is the fallback, so a pending brief never turns "none" into "pending".
    const insider=filings.loaded?{...insiderFrom(filings.byTicker.get(ticker)||[],{status:filings.complete?'none':'missing',complete:filings.complete}),source:'archive',since:filings.since}:brief.insider;
    out.set(ticker,{...brief,insider,
      funds:fund?{...fund,since:archive.since,complete:archive.complete,count:archive.count}:
        {status:archive.loaded?'none':'missing',since:archive.since,complete:archive.complete,count:archive.count,moves:[],adds:[],trims:[]},
      briefed:briefItems.has(ticker)});
  }
  out.meta={since:archive.since,count:archive.count,filings:archive.filings,complete:archive.complete,loaded:archive.loaded||briefItems.size>0||filings.loaded,
    insider_since:filings.since,insider_complete:filings.complete,
    as_of:newest([...briefItems.values()].map(i=>i.facts_as_of||i.generated_at||i.checked_at||i.as_of))};
  return out;
}

export function signalSortValue(sig,key){
  const m=sig?.[key];if(!m||m.status==='missing')return null;
  if(key==='insider')return m.status==='ready'?Math.max(m.value||0,m.count||0):0;
  if(key==='funds')return m.status==='ready'?m.moves.length:0;
  if(key==='walls'){const d=gap(m.put,m.price);return finite(d)?-d:m.status==='ready'?0:null;}
  if(key==='support'){const gaps=m.refs?.map(r=>r.gap).filter(finite)||[];return gaps.length?-Math.max(...gaps):null;}
  return null;
}

function chip(state){return el('strong.watch-metric-value.watch-signal-flag',{class:state==='ready'?'is-yes':'is-no'},s(state==='ready'?'watch.signal_yes':'watch.signal_no'));}
// One pill per side present: green for purchases / adds, red for open-market sales / trims.
const SIDE_COPY={buy:['is-yes','watch.signal_bought'],sell:['is-sell','watch.signal_sold'],add:['is-yes','watch.signal_added'],trim:['is-sell','watch.signal_trimmed']};
function sideChips(sides){return el('span.watch-signal-flags',...sides.map(side=>el('strong.watch-metric-value.watch-signal-flag',{class:SIDE_COPY[side][0]},s(SIDE_COPY[side][1]))));}
const insiderSides=m=>[m.buys>0?'buy':null,m.sells>0?'sell':null].filter(Boolean);
const fundSides=m=>[m.adds?.length?'add':null,m.trims?.length?'trim':null].filter(Boolean);
const tradeLine=f=>s(f.side==='sell'?'watch.signal_sell_line':'watch.signal_buy_line',{who:who(f.owners),value:money(f.value)});
// A complete page allows a plain "none"; a truncated one only says where the stock was not found.
const fundsNone=m=>m.complete?s('watch.signal_funds_none_tracked'):m.count?s('watch.signal_funds_none_page',{n:m.count}):s('watch.signal_funds_none');

export function signalCell(key,sig,{ticker=''}={}){
  const m=sig?.[key]||{status:'missing'},state=m.status||'missing';
  // The whole cell is one tap target: it opens the same flashcard the "?" explains, with the records behind the number.
  const cell=el(state==='missing'?'span.watch-metric.watch-signal':'button.watch-metric.watch-signal',{'data-metric':key,'data-status':state,
    ...(state==='missing'?{}:{type:'button','data-reading-key':ticker+':signal:'+key,'aria-label':signalLabel(key)+' · '+ticker+' · '+s('watch.signal_details'),
      onclick:event=>{event.currentTarget.focus({preventScroll:true});modal(s('watch.signal_card_'+key)+(ticker?' · '+ticker:''),signalCard(key,sig,ticker));}})},el('span.watch-metric-label',signalLabel(key)));
  if(state==='missing'){cell.append(el('strong.watch-metric-value','—'),el('span.watch-metric-note',s('watch.signal_unknown')));return cell;}
  if(key==='insider'){
    if(state!=='ready'){cell.append(chip(state),el('span.watch-metric-note',s('watch.signal_insider_none')));return cell;}
    // Newest filings first: date, who traded, bought or sold, reported value. Sales read red.
    cell.append(sideChips(insiderSides(m)));
    for(const filing of m.filings.slice(0,2))cell.append(el('span.watch-metric-status.watch-signal-event',{class:'is-'+filing.side},[shortDate(filing.date),tradeLine(filing)].join(' · ')));
    if(m.count>2)cell.append(el('span.watch-metric-status',s('watch.signal_more_filings',{n:m.count-2})));
    return cell;
  }
  if(key==='funds'){
    const first=m.moves?.[0];
    if(state!=='ready'){cell.append(chip(state),el('span.watch-metric-note',fundsNone(m)));return cell;}
    const name=first?.fund||s('watch.signal_fund_unnamed'),range=m.moves.map(a=>a.range).find(Boolean);
    cell.append(sideChips(fundSides(m)),el('span.watch-metric-note.watch-signal-fund.watch-signal-event',{class:'is-'+first.side,title:m.moves.map(a=>a.fund).filter(Boolean).join(' · ')},
        s(first.side==='trim'?'watch.signal_fund_trim_line':'watch.signal_fund_add_line',{fund:name})),
      el('span.watch-metric-status',[m.moves.length>1?s('watch.signal_funds_more',{n:m.moves.length-1}):null,first?.period].filter(Boolean).join(' · ')));
    if(range)cell.append(el('span.watch-metric-status.watch-signal-range',strike(range.low)+'–'+strike(range.high)));
    else if(first?.filed)cell.append(el('span.watch-metric-status',s('watch.signal_filed',{date:shortDate(first.filed)})));
    return cell;
  }
  if(key==='walls'){
    if(state!=='ready'){cell.append(el('strong.watch-metric-value','—'),el('span.watch-metric-note',s('watch.signal_walls_none')));return cell;}
    cell.append(el('span.watch-wall.is-call',el('span.watch-wall-kind',s('watch.signal_call')),el('strong.watch-metric-value',finite(m.call)?strike(m.call):'—'),el('span.watch-wall-gap',gapText(gap(m.call,m.price)))),
      el('span.watch-wall.is-put',el('span.watch-wall-kind',s('watch.signal_put')),el('strong.watch-metric-value',finite(m.put)?strike(m.put):'—'),el('span.watch-wall-gap',gapText(gap(m.put,m.price)))),
      el('span.watch-metric-note',m.expiries.length?s('watch.signal_expiry',{date:m.expiries.slice(0,2).map(shortDate).join(' / ')}):s('watch.signal_walls_basis')));
    return cell;
  }
  if(state!=='ready'){cell.append(el('strong.watch-metric-value','—'),el('span.watch-metric-note',s('watch.signal_support_none')));return cell;}
  const below=[...m.refs].filter(r=>finite(r.gap)&&r.gap<=0).sort((a,b)=>b.gap-a.gap),nearest=below[0]||[...m.refs].sort((a,b)=>Math.abs(a.gap??99)-Math.abs(b.gap??99))[0];
  cell.append(el('span.watch-support-reference',
    el('strong.watch-metric-value',nearest.key==='put_wall'?strike(nearest.value):px(nearest.value)),
    el('span.watch-metric-note.watch-support-kind',s(nearest.key==='put_wall'?'watch.signal_ref_put':'watch.signal_ref_low')),
    el('span.watch-metric-note.watch-support-gap',gapText(nearest.gap)||s('watch.signal_distance_unknown'))),supportRange(m));
  return cell;
}

// Keep the same range slot for every support source. A put wall alone is not a price range.
function supportRange(m){
  const available=finite(m.low)&&finite(m.high)&&m.high>m.low;
  const label=s('watch.signal_range_label'),range=el('span.watch-range',{'data-range-status':available?'ready':'missing'},
    el('span.watch-range-label',label));
  if(!available){range.append(el('span.watch-range-empty',s('watch.signal_range_unknown')));return range;}
  range.title=s('watch.signal_range',{low:px(m.low),high:px(m.high)});
  range.setAttribute('aria-label',range.title);
  const pos=finite(m.price)?Math.min(100,Math.max(0,(m.price-m.low)/(m.high-m.low)*100)):null;
  range.append(el('span.watch-range-track',pos===null?null:el('span.watch-range-dot',{style:{left:pos.toFixed(1)+'%'}})),
    el('span.watch-range-ends',el('span',px(m.low)),el('span',px(m.high))));
  return range;
}

const compact=n=>new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US',{notation:'compact',maximumFractionDigits:1}).format(n);
const externalLink=(url,label)=>url?el('a.small',{href:url,target:'_blank',rel:'noopener noreferrer'},label+' ↗'):null;
// One flashcard per signal: the records behind the cell, their dates and sources, then the same two exits every card has.
export function signalCard(key,sig,ticker){
  const m=sig?.[key]||{},body=el('div.watch-signal-card',{'data-signal':key});
  const list=el('div.watch-signal-items');
  if(key==='insider'){
    // Every filing in the window, newest first, each with its side; the lead sums bought and sold.
    for(const filing of m.filings||[])list.append(el('article.watch-signal-item',{class:'is-'+filing.side},
      el('header',el('strong',filing.owners.map(o=>o.name).join(' · ')||s('evidence.recorded_data')),el('span.small.muted',filing.date||'—')),
      el('p',sideChips([filing.side]),filing.owners.some(o=>o.role)?el('span.small.muted',' · '+filing.owners.map(o=>o.role).filter(Boolean).join(' · ')):null),
      el('ul.watch-signal-txns',...filing.transactions.map(x=>el('li',s('watch.signal_txn',{shares:compact(x.shares),price:px(x.price)}),x.date?el('span.muted',' · '+x.date):null))),
      el('p',el('strong',money(filing.value)),filing.side==='buy'?el('span.muted',' · '+s('watch.signal_avg_price',{price:px(filing.transactions.reduce((a,x)=>a+x.price*x.shares,0)/Math.max(1,filing.transactions.reduce((a,x)=>a+x.shares,0)))})):null),
      externalLink(filing.url,s('boards.source'))));
    const lead=[m.buys>0?[s('watch.signal_bought')+' '+money(m.bought),finite(m.average)?s('watch.signal_avg_price',{price:px(m.average)}):null,m.shares>0?s('watch.signal_shares',{n:compact(m.shares)}):null].filter(Boolean).join(' · '):null,
      m.sells>0?s('watch.signal_sold')+' '+money(m.sold):null].filter(Boolean);
    if(lead.length)body.append(el('p.watch-signal-card-lead',lead.join(' · ')));
  }else if(key==='funds'){
    for(const move of m.moves||[])list.append(el('article.watch-signal-item',{class:'is-'+move.side},
      el('header',el('strong',move.fund||s('watch.signal_fund_unnamed')),el('span.small.muted',move.period||'—')),
      el('p',sideChips([move.side]),el('span.muted',' · '+(move.change==='new'?s('watch.signal_new_position'):move.change==='closed'?s('watch.signal_closed_position'):
        move.shares.prior!==null&&move.shares.now!==null?s('watch.signal_shares_change',{prior:compact(move.shares.prior),now:compact(move.shares.now)}):''))),
      finite(move.quarterEnd)?el('p.small.muted',s('watch.signal_quarter_end_price',{price:px(move.quarterEnd)})):null,
      move.range?el('p.small.muted',s('watch.signal_quarter_range',{low:strike(move.range.low),high:strike(move.range.high)})):null,
      el('p.small.muted',move.filed?s('watch.signal_filed',{date:move.filed}):''),externalLink(move.url,s('boards.source'))));
  }else if(key==='walls'){
    list.append(el('article.watch-signal-item',el('p',el('span.watch-wall-kind',s('watch.signal_call')),' ',el('strong',finite(m.call)?strike(m.call):'—'),el('span.muted',' '+gapText(gap(m.call,m.price)))),
      el('p',el('span.watch-wall-kind',s('watch.signal_put')),' ',el('strong',finite(m.put)?strike(m.put):'—'),el('span.muted',' '+gapText(gap(m.put,m.price)))),
      finite(m.flip)?el('p.small.muted','Flip '+strike(m.flip)):null,m.expiries?.length?el('p.small.muted',s('watch.signal_expiry',{date:m.expiries.join(' / ')})):null));
  }else{
    for(const ref of m.refs||[])list.append(el('article.watch-signal-item',el('p',el('strong',ref.key==='put_wall'?strike(ref.value):px(ref.value)),' ',el('span.muted',s(ref.key==='put_wall'?'watch.signal_ref_put':'watch.signal_ref_low')+' · '+gapText(ref.gap)))));
    if(m.status==='ready')list.append(supportRange(m));
  }
  // An empty card still says why: no filings in the window, or no adds in the newest 13F page.
  if(!list.childElementCount)list.append(el('p.muted',m.status==='none'?
    (key==='insider'?s('watch.signal_insider_none'):key==='funds'?fundsNone(m):key==='walls'?s('watch.signal_walls_none'):s('watch.signal_support_none')):
    s('watch.signal_card_empty')));
  body.append(list,el('p.small.muted',s(key==='funds'?'watch.signal_card_note_funds':key==='insider'?'watch.signal_card_note_insider':'watch.signal_method_'+key)));
  if(ticker)body.append(el('div.watch-signal-card-actions',
    el('a.btn.btn-ghost.btn-sm',{href:key==='insider'?'#/boards?board=insider&ticker='+encodeURIComponent(ticker):key==='funds'?'#/boards?board=partner&ticker='+encodeURIComponent(ticker):'#/chart/'+encodeURIComponent(ticker)},s(['insider','funds'].includes(key)?'watch.signal_open_filings':'radar.chart')),
    el('a.btn.btn-ghost.btn-sm',{href:'#/evidence/'+encodeURIComponent(ticker)},s('watch.signal_open_map'))));
  return body;
}

export function signalMethods(signals){
  const meta=signals?.meta||{};
  return el('details.watch-metric-method.watch-signal-method',{'data-disclosure':'signals'},el('summary',s('watch.signal_method')),
    el('p.small.muted',s('watch.signal_method_insider')),
    el('p.small.muted',s('watch.signal_method_funds',{n:meta.filings||0,since:meta.since||'—'})),
    el('p.small.muted',s('watch.signal_method_walls')),
    el('p.small.muted',s('watch.signal_method_support')),
    el('p.small.muted',s('watch.signal_source_note',{date:meta.as_of||'—'})));
}
