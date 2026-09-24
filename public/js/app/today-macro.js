// today-macro.js — four market-level references at the top of Today, read from the saved macro
// backdrop (GET /macro/beta, produced once a day off the request path). Descriptive numbers with
// their own dates: no forecast, no threshold advice.
import {el,modal} from './ui.js';
import {s,LANG} from './strings.js';
import * as api from './api.js';
import {gauge,bandFor} from './today-gauge.js';
import {dailyPairs,summary,normalizedLines,sparkLines,cursorIndex,PRIMARY} from './today-spark.js';

const OK=v=>typeof v==='number'&&Number.isFinite(v);
const num=(v,d=2)=>OK(v)?new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v):'—';
const signed=(v,d=0)=>(v>0?'+':'')+num(v,d);
const RATINGS={'extreme fear':'extreme_fear',fear:'fear',neutral:'neutral',greed:'greed','extreme greed':'extreme_greed'};
// CNN's own bands for its index; the dial reads them, it does not invent thresholds.
export const FNG_BANDS=()=>[{to:25,tone:'down',key:'extreme_fear'},{to:45,tone:'sell',key:'fear'},{to:55,tone:'flat',key:'neutral'},{to:75,tone:'up',key:'greed'},{to:101,tone:'up',key:'extreme_greed'}]
  .map(b=>({...b,label:s('today.fng_'+b.key)}));
export const LIQUIDITY_BANDS=()=>[{to:40,tone:'down',key:'adverse'},{to:60,tone:'mid',key:'mixed'},{to:101,tone:'up',key:'supportive'}].map(b=>({...b,label:s('today.macro_regime_'+b.key)}));

// The tile shows the funding score, so its word and its colour come from that same number: 60 and
// above reads loose, under 40 tight, in between mixed. The combined backdrop (with rates) is a
// different number and lives in the "?" explanation instead of colouring this one.
export function fundingBand(score){return !OK(score)?'unknown':score>=60?'supportive':score<40?'adverse':'mixed';}

export function liquidityHelp(latest){
  const beta=OK(latest?.beta_score)?num(latest.beta_score,0):'—';
  const regime=['supportive','mixed','adverse'].includes(latest?.regime)?latest.regime:'unknown';
  return el('button.watch-signal-help.today-macro-help',{type:'button','aria-label':s('today.macro_help_label'),'data-reading-key':'macro-help:liquidity',
    onclick:()=>modal(s('today.macro_help_label'),el('div.watch-signal-help-body',el('p',s('today.macro_help_intro')),
      el('ul',...['spread','tail','srf','net'].map(k=>el('li',s('today.macro_help_'+k)))),el('p',s('today.macro_help_bands')),
      el('p.small.muted',s('today.macro_help_backdrop',{beta,regime:s('today.macro_regime_'+regime)})),el('p.small.muted',s('today.macro_help_sources'))))},'?');
}

// Earlier readings of the index, each with the band it sat in, as CNN lists them.
export function fngHistory(fng){
  const bands=FNG_BANDS();
  return [['previous_close','today.fng_prev_close'],['previous_1_week','today.fng_week'],['previous_1_month','today.fng_month'],['previous_1_year','today.fng_year']]
    .filter(([key])=>OK(fng?.[key])).map(([key,label])=>{const band=bandFor(bands,fng[key]);return {label:s(label),word:band.label,tone:band.tone,value:Math.round(fng[key])};});
}

// A reading and where it comes from: the live index print when the quote feed has one, else the newest
// FRED close (published the evening of its day), else the session-aligned panel the scores use.
function reading(doc,key,{series}={}){
  const q=doc?.intraday||null,la=doc?.latest_available||null,m=doc?.latest?.metrics||{};
  if(OK(q?.[key]))return {value:q[key],stamp:s('today.macro_intraday',{time:clock(q.quoted_at)})};
  if(OK(la?.metrics?.[key]))return {value:la.metrics[key],stamp:s('today.macro_fred_close',{date:(series&&la.dates?.[series])||la.as_of||'—'})};
  return {value:m[key],stamp:OK(m[key])?s('today.macro_tile_as_of',{date:doc?.as_of||'—'}):''};
}
function clock(iso){const t=Date.parse(iso||'');return Number.isFinite(t)?new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(t):'—';}

// A tile's chart: its own series (net liquidity, or the 10-year yield), QQQ and SPY on one chart over the last
// two weeks of sessions, each scaled to its own range; the caption carries the correlation of the series' daily
// change against each index's daily return over the same window. Investors remember two weeks, not six months.
const SESSIONS=10;
function linesFor(doc,primary){
  const lines=normalizedLines(doc?.history,{sessions:SESSIONS,primary});
  if(lines.series.length<2||!lines.series.some(s=>s.key===primary))return null;
  const pick=PRIMARY[primary];
  const against=key=>summary(dailyPairs((doc?.history||[]).map(r=>({...r,qqq_index:r?.[key]})),r=>primary==='yield'?(OK(pick(r))?pick(r)*100:null):pick(r),{sessions:SESSIONS}));
  return {...lines,primary,qqq:against('qqq_index'),spy:against('spy_index')};
}
// One series' reading on one day: the liquidity level in $B with its day change, the yield with its bp change,
// an index's day change.
function lineReading(x,i){
  if(x.key==='liquidity')return OK(x.raw[i])?s('today.lines_liquidity_value',{value:num(x.raw[i],0),change:OK(x.change[i])?signed(x.change[i],0):'—'}):'—';
  if(x.key==='yield')return OK(x.raw[i])?s('today.lines_yield_value',{value:num(x.raw[i],2),change:OK(x.change[i])?signed(x.change[i],0):'—'}):'—';
  return OK(x.change[i])?signed(x.change[i],2)+'%':'—';
}
function linesBlock(tile){
  const {dates,series,qqq,spy,primary}=tile.lines;
  const labels={liquidity:s('today.lines_liquidity'),yield:s('today.lines_yield'),qqq:s('today.lines_qqq'),spy:s('today.lines_spy')};
  const fmtDate=d=>{const t=Date.parse(d+'T12:00:00Z');return Number.isFinite(t)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{month:'2-digit',day:'2-digit'}).format(t):d;};
  const r=v=>OK(v)?(v>0?'+':'')+v.toFixed(2):'—';
  const last=dates.length-1;
  // The legend carries each line's latest day-over-day change, so the last session reads without hovering.
  const legend=el('span.today-macro-legend',...series.map(x=>el('span.today-lines-key.is-'+x.key,el('i'),labels[x.key]+' ',el('b',lineReading(x,last)))));
  const chart=sparkLines({dates,series},{labels,fmtDate});
  const tip=el('div.today-lines-tip',{hidden:true,role:'status'});
  const show=i=>{tip.hidden=false;tip.replaceChildren(el('span.today-lines-tip-date',fmtDate(dates[i])),
    ...series.map(x=>el('span.today-lines-tip-row.is-'+x.key,el('i'),labels[x.key],el('b',lineReading(x,i)))));chart.moveCursor?.(i);};
  const hide=()=>{tip.hidden=true;chart.moveCursor?.(null);};
  chart.addEventListener('pointermove',e=>{const rect=chart.getBoundingClientRect();show(cursorIndex(e.clientX-rect.left,rect.width,dates.length));});
  chart.addEventListener('pointerleave',hide);
  chart.addEventListener('pointerdown',e=>{const rect=chart.getBoundingClientRect();show(cursorIndex(e.clientX-rect.left,rect.width,dates.length));});
  return el('div.today-macro-chart.has-cursor',tip,chart,legend,
    el('span.today-macro-caption',s('today.lines_caption',{n:dates.length,what:labels[primary],rq:r(qqq?.correlation),rs:r(spy?.correlation),pq:OK(qqq?.opposite)?qqq.opposite:'—'})));
}

export function macroTiles(doc){
  const latest=doc?.latest||{},m=latest.metrics||{},fng=doc?.fear_greed||null,la=doc?.latest_available?.metrics||{};
  const band=fundingBand(latest.funding_score);
  const netT=OK(m.net_liquidity_bn)?m.net_liquidity_bn/1000:null,change=m.net_liquidity_65d_change_bn;
  const y10=reading(doc,'nominal_10y',{series:'DGS10'}),vix=reading(doc,'vix',{series:'VIXCLS'}),term=reading(doc,'vix_term_ratio',{series:'VXVCLS'});
  const ratio=term.value,bp=OK(la.nominal_10y_20d_change_bp)?la.nominal_10y_20d_change_bp:m.nominal_10y_20d_change_bp;
  const rating=RATINGS[String(fng?.rating||'').toLowerCase()];
  const fngWord=rating?s('today.fng_'+rating):OK(fng?.score)?bandFor(FNG_BANDS(),fng.score).label:null;
  return [
    {key:'liquidity',label:s('today.macro_liquidity'),value:OK(latest.funding_score)?num(latest.funding_score,0):'—',unit:s('today.macro_score_unit'),
     tone:band==='supportive'?'up':band==='adverse'?'down':band==='mixed'?'mid':'flat',help:liquidityHelp(latest),
     gauge:{name:s('today.macro_liquidity'),score:OK(latest.funding_score)?latest.funding_score:null,bands:LIQUIDITY_BANDS(),word:s('today.macro_regime_'+band)},
     note:[s('today.macro_regime_'+band),OK(netT)?s('today.macro_net_liquidity',{value:num(netT,2)}):null,OK(change)?s('today.macro_net_change',{value:signed(change)}):null].filter(Boolean).join(' · '),
     lines:linesFor(doc,'liquidity')},
    {key:'yield',label:s('today.macro_10y'),value:OK(y10.value)?num(y10.value,2)+'%':'—',unit:'',tone:'flat',stamp:y10.stamp,
     note:OK(bp)?s('today.macro_10y_change',{bp:signed(bp)}):s('today.macro_no_change'),
     lines:linesFor(doc,'yield')},
    {key:'vix',label:s('today.macro_vix'),value:OK(vix.value)?num(vix.value,1):'—',unit:'',tone:OK(ratio)?(ratio>1?'down':'up'):'flat',stamp:vix.stamp,
     note:OK(ratio)?s('today.macro_vix_ratio',{ratio:num(ratio,2)})+' · '+s(ratio>1?'today.macro_vix_stress':'today.macro_vix_calm'):s('today.macro_vix_missing')},
    {key:'fng',label:s('today.macro_fng'),value:OK(fng?.score)?num(fng.score,0):'—',unit:'',tone:OK(fng?.score)?(fng.score<45?'down':fng.score>55?'up':'mid'):'flat',
     gauge:{name:s('today.macro_fng'),score:OK(fng?.score)?fng.score:null,bands:FNG_BANDS(),word:fngWord||''},history:fngHistory(fng),
     note:fng&&OK(fng.score)?[fngWord,OK(fng.previous_close)?s('today.macro_fng_prev',{value:num(fng.previous_close,0)}):null].filter(Boolean).join(' · '):s('today.macro_fng_missing')}];
}

function historyList(rows){
  if(!rows?.length)return null;
  return el('ul.today-macro-history',...rows.map(r=>el('li',el('span.today-macro-history-label',r.label),el('span.today-macro-history-word',r.word),
    el('span.today-macro-history-value.mono',{class:'is-'+r.tone},String(r.value)))));
}

// The close-of-day note: four short paragraphs written from this site's own numbers and the
// published schedule, the same for every reader. Shown only when it is ready; an old one says so.
const sessionLabel=iso=>{const t=Date.parse((iso||'')+'T12:00:00Z');return Number.isFinite(t)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{month:'numeric',day:'numeric',weekday:'short'}).format(t):(iso||'—');};
export function digestBlock(digest){
  if(!digest||!['ready','stale'].includes(digest.status))return null;
  const text=key=>String(digest[key]?.[LANG==='zh'?'zh':'en']||'').trim();
  const box=el('section.today-digest',{'aria-label':s('today.digest_title',{date:sessionLabel(digest.session)})});
  box.append(el('div.today-digest-head',el('h2.today-section-title',s('today.digest_title',{date:sessionLabel(digest.session)})),
    el('span.small.muted',s('today.digest_written',{time:clock(digest.generated_at)})+(digest.status==='stale'?' · '+s('today.digest_stale'):''))));
  const grid=el('div.today-digest-grid');
  for(const [key,label] of [['close','today.digest_close'],['sectors','today.digest_sectors'],['macro','today.digest_macro']])
    if(text(key))grid.append(el('div.today-digest-part',el('span.today-digest-label',s(label)),el('p',text(key))));
  box.append(grid);
  if(text('tomorrow'))box.append(el('div.today-digest-tomorrow',el('span.today-digest-label',s('today.digest_tomorrow',{date:sessionLabel(digest.next_session)})),el('p',text('tomorrow'))));
  box.append(el('p.small.muted.today-digest-note',s('today.digest_note')));
  return box;
}

export function macroStrip(doc){
  const box=el('section.today-macro',{'aria-label':s('today.macro_title')});
  if(!doc||!doc.latest){box.append(el('p.small.muted',s('today.macro_unavailable')));return box;}
  const digest=digestBlock(doc.digest);if(digest)box.append(digest);
  const grid=el('div.today-macro-grid');
  for(const tile of macroTiles(doc)){
    const dial=tile.gauge&&Number.isFinite(tile.gauge.score)?gauge(tile.gauge):null;
    grid.append(el('div.today-macro-tile',{'data-tile':tile.key,class:'is-'+tile.tone+(dial?' has-gauge':'')},
      el('span.today-macro-label',tile.label,tile.help||null),
      dial?el('div.today-gauge-wrap',dial,el('span.today-gauge-word',tile.gauge.word)):el('strong.today-macro-value.mono',tile.value,tile.unit?el('span.today-macro-unit',tile.unit):null),
      el('span.today-macro-note',tile.note),tile.stamp?el('span.today-macro-stamp.small.muted',tile.stamp):null,historyList(tile.history),
      tile.lines?linesBlock(tile):null));
  }
  // Each source carries its own clock: the FRED / New York Fed panel ends at the last session it
  // covers, the CNN index at the minute it was read, so the footer names both.
  const fngAt=Date.parse(doc.fear_greed?.as_of||'');
  const fng=Number.isFinite(fngAt)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(fngAt):'—';
  box.append(grid,el('p.small.muted.today-macro-source',s('today.macro_source',{date:doc.latest_available?.as_of||doc.as_of||'—',fng})+(doc.status==='stale'?' · '+s('macro.stale'):'')));
  return box;
}

// Never blocks or delays the feed; a failed read hides the strip instead of showing zeros.
export function mountMacroStrip(host,{signal}={}){
  return api.get('/macro/beta',{signal,silent402:true,observe:false}).then(doc=>{if(signal?.aborted)return;host.replaceChildren(macroStrip(doc));})
    .catch(()=>{host.hidden=true;});
}
