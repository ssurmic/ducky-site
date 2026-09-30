// today-macro.js — compact market references at the top of Today, read from the saved macro
// backdrop (GET /macro/beta, produced once a day off the request path). Descriptive numbers with
// their own dates: no forecast, no threshold advice.
import {el,modal} from './ui.js';
import {s,LANG} from './strings.js';
import * as api from './api.js';
import * as store from './store.js';
import {gauge,bandFor} from './today-gauge.js';
import {dailyPairs,summary,normalizedLines,sparkLines,cursorIndex,PRIMARY} from './today-spark.js';
import {digestPreview} from './today-preview.js';
import {material} from './shared-read-refresh.js';
import {hasCanonicalReadings,canonicalReading,kIndexReading} from './today-market-readings.js';
import {currentSession,sessionOverview,sessionMacro} from './today-session.js';
import {summaryFixed} from './today-fixed.js';

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

// Legacy documents retain their original source selection. A recognized canonical projection
// is authoritative even when one metric is missing: never fill it from a conflicting old field.
function legacyReading(doc,key,{series}={}){
  const q=doc?.intraday||null,la=doc?.latest_available||null,m=doc?.latest?.metrics||{};
  const rows=(doc?.observed||[]).filter(r=>OK(r?.[key])),last=rows[rows.length-1]||null;
  if(OK(q?.[key])&&q.phase==='open')return {value:q[key],stamp:s('today.macro_intraday',{time:clock(q.quoted_at)})};
  if(last)return {value:last[key],stamp:last.live?s('today.macro_intraday',{time:clock(doc?.observed_at)}):s('today.macro_close_on',{date:last.date})};
  if(OK(q?.[key]))return {value:q[key],stamp:s('today.macro_intraday',{time:clock(q.quoted_at)})};
  if(OK(la?.metrics?.[key]))return {value:la.metrics[key],stamp:s('today.macro_fred_close',{date:(series&&la.dates?.[series])||la.as_of||'—'})};
  return {value:m[key],stamp:OK(m[key])?s('today.macro_tile_as_of',{date:doc?.as_of||'—'}):''};
}
const readingBasis=r=>r.basis==='session_aligned_score'?'score':r.live===true?'intraday':r.basis==='latest_available_print'?'published':'saved';
function canonicalStamp(r,key){
  if(!r)return '';
  const basis=readingBasis(r);
  const sources=key==='vix_term_ratio'?r.components:[r];
  const attribution=sources.map(item=>s('today.reading_source_'+item.source)+(item.source==='macro_beta'?'':' '+item.series)).join(' / ');
  return s('today.reading_'+basis,{date:r.date})+' · '+attribution;
}
function reading(doc,key,options){
  if(!hasCanonicalReadings(doc))return legacyReading(doc,key,options);
  const r=canonicalReading(doc,key);
  return {value:r?.value,stamp:canonicalStamp(r,key),recorded:r?.quote_at?s('today.reading_trade_time',{time:writtenAt(r.quote_at)}):r?.observed_at?s('today.reading_recorded',{time:writtenAt(r.observed_at)}):null};
}
// The rows a tile's chart and its readings share: the observed panel, or the score panel of an older document.
const panelRows=doc=>doc?.observed?.length?doc.observed:(doc?.history||[]);
function clock(iso){const t=Date.parse(iso||'');return Number.isFinite(t)?new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(t):'—';}

// A tile's chart: its own series (net liquidity, or the 10-year yield), QQQ and SPY on one chart over the last
// two weeks of sessions, each scaled to its own range; the caption carries the correlation of the series' daily
// change against each index's daily return over the same window. Investors remember two weeks, not six months.
const SESSIONS=10;
function linesFor(doc,primary){
  const rows=panelRows(doc);
  const lines=normalizedLines(rows,{sessions:SESSIONS,primary});
  if(lines.series.length<2||!lines.series.some(s=>s.key===primary))return null;
  const pick=PRIMARY[primary];
  const against=key=>summary(dailyPairs(rows.map(r=>({...r,qqq_index:r?.[key]})),r=>primary==='yield'?(OK(pick(r))?pick(r)*100:null):pick(r),{sessions:SESSIONS}));
  return {...lines,primary,qqq:against('qqq_index'),spy:against('spy_index')};
}
// One series' reading on one day: the liquidity index with its day change (and that day's net liquidity), the
// yield with its bp change, an index's day change.
function lineReading(x,i,rows,format=num){
  const change=(value,digits)=>(value>0?'+':'')+format(value,digits);
  if(x.key==='liquidity'){
    if(!OK(x.raw[i]))return '—';
    const net=rows?.[i]?.net_liquidity_bn;
    return s('today.lines_liquidity_value',{value:format(x.raw[i],1),change:OK(x.change[i])?change(x.change[i],1):'—'})+(OK(net)?' · '+s('today.lines_net_value',{value:format(net/1000,2)}):'');
  }
  if(x.key==='yield')return OK(x.raw[i])?s('today.lines_yield_value',{value:format(x.raw[i],2),change:OK(x.change[i])?change(x.change[i],0):'—'}):'—';
  return OK(x.change[i])?change(x.change[i],2)+'%':'—';
}
function linesBlock(tile,{currentSnapshot=false,dashboard=false}={}){
  const {dates,series,qqq,spy,primary,rows,live=[]}=tile.lines;
  const read=(line,index)=>lineReading(line,index,rows,currentSnapshot?summaryFixed:num);
  const labels={liquidity:s('today.lines_liquidity'),yield:s('today.lines_yield'),qqq:s('today.lines_qqq'),spy:s('today.lines_spy')};
  const fmtDate=d=>{const t=Date.parse(d+'T12:00:00Z');return Number.isFinite(t)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{month:'2-digit',day:'2-digit'}).format(t):d;};
  const r=v=>OK(v)?(v>0?'+':'')+v.toFixed(2):'—';
  const last=dates.length-1;
  // The legend carries each line's latest day-over-day change, so the last session reads without hovering.
  const legend=el('span.today-macro-legend',...series.map(x=>el('span.today-lines-key.is-'+x.key,el('i'),labels[x.key]+' ',el('b',read(x,last)))));
  const chart=sparkLines({dates,series,live},{labels,fmtDate});
  const tip=el('div.today-lines-tip',{hidden:true,role:'status'});
  let selected=last;
  chart.setAttribute('tabindex','0');chart.setAttribute('role','slider');chart.setAttribute('aria-orientation','horizontal');
  chart.dataset.readingKey='macro-chart:'+primary;
  chart.setAttribute('aria-label',labels[primary]+' / '+labels.qqq+' / '+labels.spy+'. '+s('today.lines_keyboard'));
  chart.setAttribute('aria-valuemin','0');chart.setAttribute('aria-valuemax',String(last));
  const describe=i=>fmtDate(dates[i])+(live[i]?' · '+s('today.lines_live'):'')+'; '+series.map(x=>labels[x.key]+': '+read(x,i)).join('; ');
  chart.setAttribute('aria-valuenow',String(last));chart.setAttribute('aria-valuetext',describe(last));
  const show=i=>{selected=i;tip.hidden=false;tip.replaceChildren(el('span.today-lines-tip-date',fmtDate(dates[i])+(live[i]?' · '+s('today.lines_live'):'')),
    ...series.map(x=>el('span.today-lines-tip-row.is-'+x.key,el('i'),labels[x.key],el('b',read(x,i)))));chart.moveCursor?.(i);
    chart.setAttribute('aria-valuenow',String(i));chart.setAttribute('aria-valuetext',describe(i));};
  const hide=()=>{tip.hidden=true;chart.moveCursor?.(null);};
  chart.addEventListener('pointermove',e=>{const rect=chart.getBoundingClientRect();show(cursorIndex(e.clientX-rect.left,rect.width,dates.length));});
  chart.addEventListener('pointerleave',()=>{if(document.activeElement!==chart)hide();});
  chart.addEventListener('pointerdown',e=>{const rect=chart.getBoundingClientRect();show(cursorIndex(e.clientX-rect.left,rect.width,dates.length));});
  chart.addEventListener('focus',()=>show(selected));chart.addEventListener('blur',hide);
  chart.addEventListener('keydown',event=>{
    const next={ArrowLeft:selected-1,ArrowDown:selected-1,ArrowRight:selected+1,ArrowUp:selected+1,Home:0,End:last}[event.key];
    if(next===undefined)return;event.preventDefault();show(Math.max(0,Math.min(last,next)));
  });
  chart.readingDate=()=>dates[selected];
  chart.restoreReadingDate=(date,{reveal=true}={})=>{const i=dates.indexOf(date);if(i>=0){show(i);if(!reveal)hide();}};
  const caption=el('span.today-macro-caption',s('today.lines_caption',{n:dates.length,what:labels[primary],rq:r(qqq?.correlation),rs:r(spy?.correlation),pq:OK(qqq?.opposite)?qqq.opposite:'—'}));
  const methodKey='macro-chart:'+primary+':method';
  return el('div.today-macro-chart.has-cursor',el('span.small.muted.today-chart-date',s('today.chart_history_through',{date:dates.at(-1)})),tip,chart,legend,
    dashboard?el('details.today-chart-method',{'data-reading-key':methodKey},el('summary',{'data-reading-key':methodKey+':toggle'},s('today.dashboard_method')),caption):caption);
}

export function macroTiles(doc,{currentSnapshot=false}={}){
  const metricNumber=currentSnapshot?summaryFixed:num;
  const latest=doc?.latest||{},m=latest.metrics||{},fng=doc?.fear_greed||null,la=doc?.latest_available?.metrics||{};
  const canonical=hasCanonicalReadings(doc),funding=canonical?reading(doc,'funding_score'):{value:latest.funding_score,stamp:OK(latest.funding_score)?s('today.macro_tile_as_of',{date:latest.date||doc?.as_of||'—'}):null};
  const band=fundingBand(funding.value);
  // Net liquidity as of the newest prints (the observed panel), the 65-session change from the score panel.
  const netRows=(doc?.observed||[]).filter(r=>OK(r?.net_liquidity_bn)),netLast=netRows[netRows.length-1];
  const netT=OK(netLast?.net_liquidity_bn)?netLast.net_liquidity_bn/1000:OK(m.net_liquidity_bn)?m.net_liquidity_bn/1000:null,change=m.net_liquidity_65d_change_bn;
  const y10=reading(doc,'nominal_10y',{series:'DGS10'}),vix=reading(doc,'vix',{series:'VIXCLS'}),term=reading(doc,'vix_term_ratio',{series:'VXVCLS'});
  // The 20-session change over the same closes the chart draws; the FRED-based figure when the panel is short.
  const yRows=(doc?.observed||[]).filter(r=>OK(r?.nominal_10y));
  const bp=yRows.length>=21?Math.round((yRows[yRows.length-1].nominal_10y-yRows[yRows.length-21].nominal_10y)*100):OK(la.nominal_10y_20d_change_bp)?la.nominal_10y_20d_change_bp:m.nominal_10y_20d_change_bp;
  const ratio=term.value;
  const rating=RATINGS[String(fng?.rating||'').toLowerCase()];
  const fngWord=rating?s('today.fng_'+rating):OK(fng?.score)?bandFor(FNG_BANDS(),fng.score).label:null;
  const k=kIndexReading(doc);
  return [
    {key:'liquidity',label:s('today.macro_liquidity'),value:OK(funding.value)?metricNumber(funding.value,0):'—',unit:s('today.macro_score_unit'),
     tone:band==='supportive'?'up':band==='adverse'?'down':band==='mixed'?'mid':'flat',help:liquidityHelp(latest),
     gauge:{name:s('today.macro_liquidity'),score:OK(funding.value)?funding.value:null,bands:LIQUIDITY_BANDS(),word:s('today.macro_regime_'+band),displayScore:currentSnapshot?summaryFixed(funding.value,0):undefined},
     stamp:funding.stamp,recorded:funding.recorded,
     note:[s('today.macro_regime_'+band),OK(netT)?s('today.macro_net_liquidity',{value:num(netT,2)}):null,OK(change)?s('today.macro_net_change',{value:signed(change)}):null].filter(Boolean).join(' · '),
     lines:linesFor(doc,'liquidity')},
    {key:'yield',label:s('today.macro_10y'),value:OK(y10.value)?metricNumber(y10.value,2)+'%':'—',unit:'',tone:'flat',stamp:y10.stamp,recorded:y10.recorded,
     note:OK(bp)?s('today.macro_10y_change',{bp:signed(bp)})+(yRows.at(-1)?.date?' · '+yRows.at(-1).date:''):s('today.macro_no_change'),
     lines:linesFor(doc,'yield')},
    {key:'vix',label:s('today.macro_vix'),value:OK(vix.value)?metricNumber(vix.value,1):'—',unit:'',tone:OK(ratio)?(ratio>1?'down':ratio<1?'up':'flat'):'flat',stamp:vix.stamp,recorded:vix.recorded,ratioStamp:canonical&&OK(ratio)?s('today.reading_ratio',{reading:term.stamp}):null,ratioRecorded:term.recorded,
     note:OK(ratio)?s('today.macro_vix_ratio',{ratio:num(ratio,2)})+' · '+s(ratio>1?'today.macro_vix_stress':ratio<1?'today.macro_vix_calm':'today.macro_vix_equal'):s('today.macro_vix_missing')},
    {key:'fng',label:s('today.macro_fng'),value:OK(fng?.score)?num(fng.score,0):'—',unit:'',tone:OK(fng?.score)?(fng.score<45?'down':fng.score>55?'up':'mid'):'flat',
     gauge:{name:s('today.macro_fng'),score:OK(fng?.score)?fng.score:null,bands:FNG_BANDS(),word:fngWord||''},history:fngHistory(fng),
     note:fng&&OK(fng.score)?[fngWord,OK(fng.previous_close)?s('today.macro_fng_prev',{value:num(fng.previous_close,0)}):null].filter(Boolean).join(' · '):s('today.macro_fng_missing')},
    {key:'kindex',label:s('today.k_index'),value:k?metricNumber(k.value,2):'—',unit:'',tone:'flat',
     note:s('today.k_formula'),stamp:k?s('today.macro_tile_as_of',{date:k.date}):s(doc?.k_index?.reason==='session_mismatch'?'today.k_misaligned':'today.k_missing'),
     recorded:k?s('today.k_components',{score:num(k.components[0].value,2),vix:num(k.components[1].value,2),fearAt:writtenAt(k.components[0].as_of),vixDate:k.components[1].date}):null,
     explanation:s('today.k_explanation')},
    {key:'term',label:s('today.term_ratio'),value:OK(ratio)?metricNumber(ratio,2):'—',unit:'',tone:OK(ratio)?(ratio>1?'down':ratio<1?'up':'flat'):'flat',
     stamp:term.stamp,recorded:term.recorded,note:OK(ratio)?s(ratio>1?'today.macro_vix_stress':ratio<1?'today.macro_vix_calm':'today.macro_vix_equal'):s('today.macro_vix_missing')}];
}

function historyList(rows){
  if(!rows?.length)return null;
  return el('ul.today-macro-history',...rows.map(r=>el('li',el('span.today-macro-history-label',r.label),el('span.today-macro-history-word',r.word),
    el('span.today-macro-history-value.mono',{class:'is-'+r.tone},String(r.value)))));
}

// The close-of-day note: four short paragraphs written from this site's own numbers and the
// published schedule, the same for every reader. Shown only when it is ready; an old one says so.
// "Today's" only while the note is for the current New York session; during the next day it is the last
// close and the heading says so (a Friday showed "today" over Wednesday's note, 2026-09-25).
const nySession=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const validSession=iso=>typeof iso==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(iso)&&Number.isFinite(Date.parse(iso+'T12:00:00Z'))&&new Date(iso+'T12:00:00Z').toISOString().slice(0,10)===iso;
const sessionLabel=iso=>validSession(iso)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{timeZone:'America/New_York',year:'numeric',month:'numeric',day:'numeric',weekday:'short'}).format(new Date(iso+'T12:00:00Z')):'—';
const writtenAt=iso=>{const t=Date.parse(iso||'');return Number.isFinite(t)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{timeZone:'America/New_York',year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(t):'—';};

// A calendar date determines whether a saved note may say "today", not whether the exchange
// traded or a producer failed. Weekend/holiday readers still see the last published note.
export function digestState(digest,{now=new Date()}={}){
  if(!digest||!['ready','stale'].includes(digest.status))return 'unavailable';
  if(!validSession(digest.session))return 'undated';
  return digest.session===nySession(now)?'current':'previous';
}
export function digestBlock(digest,{now=new Date(),archive=false}={}){
  if(!digest||!['ready','stale'].includes(digest.status))return null;
  const text=key=>String(digest[key]?.[LANG==='zh'?'zh':'en']||'').trim();
  const current=digestState(digest,{now})==='current';
  const edition=['close_snapshot','daily_close'].includes(digest.edition)?digest.edition:null;
  const title=s(edition?'today.digest_'+edition:current?'today.digest_title':'today.digest_title_past',{date:sessionLabel(digest.session)});
  const box=el('section.today-digest',{'aria-label':title,'data-reading-anchor':'macro-note:'+String(digest.session||'undated')});
  box.append(el('div.today-digest-head',el('h2.today-section-title',title),
    el('span.small.muted',s('today.digest_written',{time:writtenAt(digest.generated_at)})+(digest.status==='stale'?' · '+s('today.digest_stale'):''))));
  if(edition){
    const publication=digest.publication||{},coverage=publication.coverage||{};
    const dataStamp=validSession(publication.data_as_of)?s('today.digest_data_session',{date:sessionLabel(publication.data_as_of)}):s('today.digest_data_as_of',{time:writtenAt(publication.data_as_of)});
    const meta=el('div.today-digest-publication',el('p.small',dataStamp),
      el('p.small.muted',s(edition==='close_snapshot'?'today.digest_snapshot_basis':'today.digest_daily_basis')));
    if(Number.isInteger(coverage.available)&&Number.isInteger(coverage.expected))meta.append(el('p.small.muted',s('today.digest_coverage',{n:coverage.available,total:coverage.expected})));
    const missing=(Array.isArray(coverage.missing)?coverage.missing:[]).map(item=>typeof item==='string'?item:item?.ticker).filter(Boolean);
    if(missing.length>5){
      const key='macro-digest:'+String(digest.session||'undated')+':missing';
      meta.append(el('details.today-digest-missing',{'data-reading-key':key},
        el('summary',{'data-reading-key':key+':toggle'},s('today.digest_missing_count',{n:missing.length})),
        el('p.small.muted',s('today.digest_missing',{tickers:missing.join(', ')}))));
    }else if(missing.length)meta.append(el('p.small.muted',s('today.digest_missing',{tickers:missing.join(', ')})));
    if(publication.phase==='revised')meta.append(el('span.small.muted',s('today.digest_revised')));
    box.append(meta);
  }
  const grid=el('div.today-digest-grid');
  for(const [key,label] of [['close','today.digest_close'],['sectors','today.digest_sectors'],['macro','today.digest_macro']])
    if(text(key))grid.append(el('div.today-digest-part',el('span.today-digest-label',s(label)),el('p',text(key))));
  box.append(grid);
  const preview=digestPreview(digest.preview,digest.session,{now});
  // v1.3 snapshots carry a deterministic count/date/coverage paragraph, all repeated by
  // the structured preview. Unknown versions can contain unique prose and keep it visible.
  const redundantPreview=edition==='close_snapshot'&&digest.version==='market-digest/1.3'&&preview;
  if(text('tomorrow')&&!redundantPreview)box.append(el('div.today-digest-tomorrow',el('span.today-digest-label',s(current?'today.digest_tomorrow':'today.digest_tomorrow_saved',{date:sessionLabel(digest.next_session)})),el('p',text('tomorrow'))));
  if(preview)box.append(preview);
  box.append(el('p.small.muted.today-digest-note',s('today.digest_note')));
  if(!current||archive)return el('details.today-digest-archive',{'data-reading-key':'macro-digest:'+String(digest.session||'undated')},
    el('summary',{'data-reading-key':'macro-digest:'+String(digest.session||'undated')+':toggle'},el('span',edition?title:s('today.digest_archive',{date:sessionLabel(digest.session)})),el('span.small.muted',s('today.digest_read_full'))),
    el('p.small.muted.today-digest-context',s('today.digest_saved_context',{date:sessionLabel(digest.session)})),box);
  return box;
}

// Only actual observed rows establish a newer market date. The read time, a quote's requested
// session and the score snapshot date cannot establish a trading session or a completed close.
export function marketReadingState(doc){
  const rows=doc?.observed||[];
  const observed=rows.filter(r=>validSession(r?.date)&&['qqq_index','spy_index','nominal_10y','vix'].some(key=>OK(r[key]))).at(-1);
  const current=rows.at(-1),prior=rows.at(-2);
  const returns=['qqq','spy'].map(key=>{
    const value=current?.[key+'_index'],base=prior?.[key+'_index'];
    return {key,value:validSession(current?.date)&&validSession(prior?.date)&&OK(value)&&OK(base)&&base>0&&prior.date<current.date?Math.round((value/base-1)*10000)/100:null};
  });
  return {date:observed?.date||null,returnDate:current?.date||null,live:!!current?.live,returns};
}

function marketHeading(doc,state){
  const reading=marketReadingState(doc),digest=doc.digest;
  const head=el('header.today-market-heading',{'data-reading-anchor':'macro-market'},el('h2.today-section-title',s('today.market_readings')));
  if(reading.returns.some(r=>OK(r.value))){
    head.append(el('div.today-market-indices',el('span.small.muted',s(reading.live?'today.market_quote_date':'today.market_close_date',{date:reading.returnDate})),
      ...reading.returns.map(r=>el('span',r.key.toUpperCase()+' ',el('strong.mono',{class:OK(r.value)?r.value>0?'pos':r.value<0?'neg':'':''},OK(r.value)?signed(r.value,2)+'%':'—')))));
  }
  if(state!=='current'){
    const hasNote=state!=='unavailable';
    const newer=hasNote&&validSession(digest.session)&&reading.date>digest.session;
    head.append(el('p.small.muted.today-market-status',newer?s('today.digest_newer_readings',{date:reading.date,summary:sessionLabel(digest.session)}):
      hasNote?s('today.digest_latest',{date:sessionLabel(digest.session)}):s('today.digest_unavailable')));
  }
  head.append(el('p.small.muted.today-market-cadence',s('today.market_cadence')));
  return head;
}

function macroSource(doc){
  const fngAt=Date.parse(doc.fear_greed?.as_of||'');
  const fng=Number.isFinite(fngAt)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(fngAt):'—';
  return el('p.small.muted.today-macro-source',s(hasCanonicalReadings(doc)?'today.macro_canonical_source':'today.macro_source',{date:doc.latest_available?.as_of||doc.as_of||'—',fng})+(doc.status==='stale'?' · '+s('macro.stale'):''),
    ' ',el('a.today-macro-more',{href:'#/macro'},s('today.macro_more')+' →'));
}

function currentDashboard(box,overview,doc,digest,state,now){
  box.classList.add('has-current-dashboard');
  const sources=overview.querySelector('.today-session-details');sources.remove();
  const tiles=macroTiles(doc,{currentSnapshot:true}),metrics=el('div.today-dashboard-metrics');
  const sourceMetrics=el('div.today-dashboard-source-metrics');
  const keys={liquidity:'funding_score',yield:'nominal_10y',vix:'vix',term:'vix_term_ratio'};
  for(const tile of tiles){
    const reading=keys[tile.key]?canonicalReading(doc,keys[tile.key]):null;
    const fngAt=tile.key==='fng'?Date.parse(doc.fear_greed?.as_of||''):NaN;
    const stamp=reading?s('today.reading_'+readingBasis(reading),{date:reading.date}):Number.isFinite(fngAt)?s('today.macro_tile_as_of',{date:writtenAt(doc.fear_greed.as_of)+' ET'}):tile.stamp;
    const note=tile.key==='liquidity'||tile.key==='fng'?tile.gauge?.word||tile.note:
      tile.key==='vix'?s('today.vix_explanation'):tile.note;
    const date=reading?.date||(Number.isFinite(fngAt)?nySession(new Date(fngAt)):tile.key==='kindex'?kIndexReading(doc)?.date:null);
    metrics.append(el('div.today-dashboard-metric',{'data-tile':tile.key,'data-reading-anchor':'macro-tile:'+tile.key,class:'is-'+tile.tone},
      el('span.today-macro-label',tile.label),
      el('strong.today-macro-value.mono',tile.value,tile.unit?el('span.today-macro-unit',tile.unit):null),
      note?el('span.today-dashboard-metric-note',note):null,
      stamp?el('span.today-dashboard-metric-date',{title:stamp,'aria-label':stamp},date||stamp):null));
    const detail=el('section.today-dashboard-source-metric',{'data-source-metric':tile.key},
      el('h3',tile.label,tile.help||null),el('p.small',tile.note),
      tile.stamp?el('p.small.muted',tile.stamp):stamp?el('p.small.muted',stamp):null,
      tile.recorded?el('p.today-macro-recorded.small.muted',tile.recorded):null,
      tile.explanation?el('p.small',tile.explanation):null,
      tile.ratioStamp?el('p.small.muted',tile.ratioStamp):null,
      tile.ratioRecorded?el('p.today-macro-recorded.small.muted',s('today.reading_ratio',{reading:tile.ratioRecorded})):null);
    if(tile.gauge&&Number.isFinite(tile.gauge.score))detail.append(el('div.today-gauge-wrap',gauge(tile.gauge),el('span.today-gauge-word',tile.gauge.word)));
    const history=historyList(tile.history);if(history)detail.append(history);
    if(tile.key==='fng'&&doc.fear_greed?.retrieved_at)detail.append(el('p.small.muted',s('today.reading_recorded',{time:writtenAt(doc.fear_greed.retrieved_at)})));
    sourceMetrics.append(detail);
  }
  const charts=el('section.today-dashboard-trends',{'aria-label':s('today.dashboard_charts')},
    el('div.today-dashboard-charts-head',el('h2',s('today.dashboard_charts')),el('a.today-macro-more',{href:'#/macro'},s('today.macro_more')+' →')),
    doc.current_session.phase==='post'?el('p.today-session-meta.today-session-post-basis',s('today.session_post_basis')):null,
    el('p.today-dashboard-scale',s('today.dashboard_chart_scale')));
  const chartGrid=el('div.today-dashboard-charts');
  for(const key of ['liquidity','yield']){
    const tile=tiles.find(t=>t.key===key);
    chartGrid.append(el('section.today-dashboard-chart',{'data-chart':key,'data-reading-anchor':'macro-chart:'+key+':section'},
      el('h3',s('today.dashboard_'+key+'_chart')),
      tile.lines?linesBlock(tile,{currentSnapshot:true,dashboard:true}):el('p.today-dashboard-chart-missing',s('today.dashboard_chart_missing'))));
  }
  const switcher=el('div.today-chart-switch',{'aria-label':s('today.dashboard_charts')});
  const select=key=>{for(const chart of chartGrid.children)chart.classList.toggle('is-selected',chart.dataset.chart===key);for(const button of switcher.children)button.setAttribute('aria-pressed',String(button.dataset.chartChoice===key));};
  for(const key of ['liquidity','yield'])switcher.append(el('button',{type:'button','data-chart-choice':key,'data-reading-key':'macro-chart-choice:'+key,onclick:()=>select(key)},s('today.chart_choice_'+key)));
  charts.readingChart=()=>switcher.querySelector('[aria-pressed=true]')?.dataset.chartChoice;
  charts.restoreReadingChart=select;select('liquidity');
  charts.append(switcher,chartGrid);sources.append(sourceMetrics,macroSource(doc));overview.append(metrics,charts,sources);
  box.append(overview);
  const preview=state==='current'?digest?.querySelector('.today-preview'):null;
  box.append(preview||el('div.today-dashboard-calendar',el('h3',s('today.preview_title')),el('a.today-preview-calendar',
    {href:'#/calendar?date='+encodeURIComponent(nySession(now)),'data-reading-key':'macro-current-calendar'},s('today.preview_calendar')+' · '+nySession(now))));
  if(digest)box.append(digest);
  return box;
}

export function macroStrip(doc,{now=new Date()}={}){
  const box=el('section.today-macro',{'aria-label':s('today.macro_title')});
  const overview=sessionOverview(doc,{now});
  doc=sessionMacro(doc,{now});
  const state=digestState(doc?.digest,{now}),digest=digestBlock(doc?.digest,{now,archive:!!overview});
  if(overview)return currentDashboard(box,overview,doc,digest,state,now);
  if(!doc||(!doc.latest&&!hasCanonicalReadings(doc))){box.append(el('p.small.muted',s('today.macro_unavailable')));if(digest)box.append(digest);return box;}
  if(!overview){
    if(state==='current'&&digest)box.append(digest);
    box.append(marketHeading(doc,state));
  }
  if((overview||state!=='current')&&digest)box.append(digest);
  const grid=el('div.today-macro-grid');
  for(const tile of macroTiles(doc,{currentSnapshot:!!overview})){
    const dial=tile.gauge&&Number.isFinite(tile.gauge.score)?gauge(tile.gauge):null;
    // One compact, source-dated reading is the entry point on every viewport.
    // The original gauge, complete notes and comparison remain available on demand.
    const key='macro-reading:'+tile.key;
    grid.append(el('details.today-macro-tile.today-macro-fold',{'data-tile':tile.key,'data-reading-anchor':'macro-tile:'+tile.key,'data-reading-key':key,class:'is-'+tile.tone+(dial?' has-gauge':'')},
      el('summary',{'data-reading-key':key+':toggle'},el('span.today-macro-label',tile.label),
        el('strong.today-macro-value.mono',tile.value,tile.unit?el('span.today-macro-unit',tile.unit):null),
        tile.gauge?.word?el('span.today-macro-band',tile.gauge.word):null,
        tile.stamp?el('span.today-macro-stamp.small.muted',tile.stamp):null,
        el('span.today-macro-expand',s('today.reading_details'))),
      el('div.today-macro-fold-content',
        tile.help||null,
        dial?el('div.today-gauge-wrap',dial,el('span.today-gauge-word',tile.gauge.word)):null,
        el('p.today-macro-note',tile.note),
        tile.explanation?el('p.small',tile.explanation):null,
        tile.recorded?el('p.today-macro-recorded.small.muted',tile.recorded):null,
        tile.ratioStamp?el('p.today-macro-ratio-stamp.small.muted',tile.ratioStamp):null,
        tile.ratioRecorded?el('p.today-macro-recorded.small.muted',s('today.reading_ratio',{reading:tile.ratioRecorded})):null,historyList(tile.history),
        tile.lines?linesBlock(tile,{currentSnapshot:!!overview}):null)));

  }
  // Each source carries its own clock: the FRED / New York Fed panel ends at the last session it
  // covers, the CNN index at the minute it was read, so the footer names both.
  box.append(grid,macroSource(doc));
  return box;
}

// Never blocks or delays the research feed. A failed GET is a read error, not a missing or failed
// daily note. Retry only reads the existing shared document; it never requests generation.
export function mountMacroStrip(host,{signal,interval=60000}={}){
  const epoch=store.epoch(),controller=new AbortController();
  let alive=true,running=false,timer=null,signature=null,lastAttempt=0,currentSequence=-1,lastDocument=null;
  const active=()=>alive&&!signal?.aborted&&epoch===store.epoch();
  const status=el('p.small.muted',{role:'status'}),refresh=el('button.btn.btn-ghost.btn-sm',
    {type:'button','data-reading-key':'macro-refresh',onclick:()=>load()},s('today.macro_refresh'));
  const controls=el('div.today-macro-refresh',refresh,status);
  function replace(doc){
    const focused=host.contains(document.activeElement)?document.activeElement?.dataset.readingKey:null;
    const chartChoice=host.querySelector('.today-dashboard-trends')?.readingChart?.();
    const chartDates=new Map([...host.querySelectorAll('[data-reading-key]')].filter(n=>typeof n.readingDate==='function').map(n=>[n.dataset.readingKey,n.readingDate()]));
    const opened=new Set([...host.querySelectorAll('details[open][data-reading-key]')].map(n=>n.dataset.readingKey));
    const scroller=host.closest('.app-main'),top=scroller?.getBoundingClientRect().top;
    const anchor=scroller?.scrollTop>0?[...host.querySelectorAll('[data-reading-anchor]')].find(n=>n.getBoundingClientRect().bottom>top):null;
    const anchorKey=anchor?.dataset.readingAnchor,before=anchor?.getBoundingClientRect().top;
    host.replaceChildren(macroStrip(doc),controls);
    if(chartChoice)host.querySelector('.today-dashboard-trends')?.restoreReadingChart?.(chartChoice);
    for(const node of host.querySelectorAll('details[data-reading-key]'))if(opened.has(node.dataset.readingKey))node.open=true;
    for(const node of host.querySelectorAll('[data-reading-key]'))if(chartDates.has(node.dataset.readingKey))node.restoreReadingDate?.(chartDates.get(node.dataset.readingKey),{reveal:false});
    if(focused){const target=[...host.querySelectorAll('[data-reading-key]')].find(n=>n.dataset.readingKey===focused);target?.focus({preventScroll:true});}
    const after=anchorKey?[...host.querySelectorAll('[data-reading-anchor]')].find(n=>n.dataset.readingAnchor===anchorKey):null;
    if(after&&scroller)scroller.scrollTop+=after.getBoundingClientRect().top-before;
  }
  const visible=()=>document.visibilityState!=='hidden'&&window.navigator?.onLine!==false;
  function schedule(){clearTimeout(timer);if(active()){timer=setTimeout(check,Math.max(60000,interval));timer.unref?.();}}
  async function load(){
    if(!active()||running)return;
    running=true;lastAttempt=Date.now();refresh.disabled=true;
    // Expiry is a presentation clock: even a failed refresh must not leave an old
    // snapshot labelled current indefinitely. Source values/dates remain intact.
    if(lastDocument){const next=material({doc:lastDocument,stale:currentSession(lastDocument)?.stale});if(next!==signature){replace(lastDocument);signature=next;}}
    try{
      const doc=await api.get('/macro/beta',{signal:controller.signal,silent402:true,observe:false});
      if(!active())return;
      const current=currentSession(doc);
      if(!current&&currentSequence>=0){status.textContent=s('today.session_stale');return;}
      if(current&&current.data.sequence<currentSequence)return;
      if(current)currentSequence=current.data.sequence;
      lastDocument=doc;
      const next=material({doc,stale:current?.stale});if(next!==signature){replace(doc);signature=next;}
      host.hidden=false;status.textContent='';refresh.textContent=s('today.macro_refresh');
    }catch(error){
      if(!active())return;
      // Transient reads keep the accepted version; access denials must revoke it.
      if(!signature||[401,402,403].includes(error.status)){signature=null;lastDocument=null;currentSequence=-1;host.replaceChildren(controls);}
      host.hidden=false;status.textContent=s('today.macro_read_error');refresh.textContent=s('common.retry');
    }finally{running=false;refresh.disabled=false;schedule();}
  }
  function check(){if(!active()||!host.isConnected){stop();return;}if(visible())load();else schedule();}
  function onVisible(){if(visible()&&Date.now()-lastAttempt>=60000)check();}
  function stop(){alive=false;clearTimeout(timer);controller.abort();document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('online',onVisible);window.removeEventListener('pageshow',onVisible);}
  document.addEventListener('visibilitychange',onVisible);window.addEventListener('online',onVisible);window.addEventListener('pageshow',onVisible);
  signal?.addEventListener('abort',stop,{once:true});
  const initial=load();initial.stop=stop;return initial;
}
