// today-macro.js — four market-level references at the top of Today, read from the saved macro
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
import {hasCanonicalReadings,canonicalReading} from './today-market-readings.js';

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
function canonicalStamp(r,key){
  if(!r)return '';
  const basis=r.basis==='session_aligned_score'?'score':r.live===true?'intraday':r.basis==='latest_available_print'?'published':'saved';
  const sources=key==='vix_term_ratio'?r.components:[r];
  const attribution=sources.map(item=>s('today.reading_source_'+item.source)+(item.source==='macro_beta'?'':' '+item.series)).join(' / ');
  return s('today.reading_'+basis,{date:r.date})+' · '+attribution;
}
function reading(doc,key,options){
  if(!hasCanonicalReadings(doc))return legacyReading(doc,key,options);
  const r=canonicalReading(doc,key);
  return {value:r?.value,stamp:canonicalStamp(r,key),recorded:r?.observed_at?s('today.reading_recorded',{time:writtenAt(r.observed_at)}):null};
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
function lineReading(x,i,rows){
  if(x.key==='liquidity'){
    if(!OK(x.raw[i]))return '—';
    const net=rows?.[i]?.net_liquidity_bn;
    return s('today.lines_liquidity_value',{value:num(x.raw[i],1),change:OK(x.change[i])?signed(x.change[i],1):'—'})+(OK(net)?' · '+s('today.lines_net_value',{value:num(net/1000,2)}):'');
  }
  if(x.key==='yield')return OK(x.raw[i])?s('today.lines_yield_value',{value:num(x.raw[i],2),change:OK(x.change[i])?signed(x.change[i],0):'—'}):'—';
  return OK(x.change[i])?signed(x.change[i],2)+'%':'—';
}
function linesBlock(tile){
  const {dates,series,qqq,spy,primary,rows,live=[]}=tile.lines;
  const labels={liquidity:s('today.lines_liquidity'),yield:s('today.lines_yield'),qqq:s('today.lines_qqq'),spy:s('today.lines_spy')};
  const fmtDate=d=>{const t=Date.parse(d+'T12:00:00Z');return Number.isFinite(t)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{month:'2-digit',day:'2-digit'}).format(t):d;};
  const r=v=>OK(v)?(v>0?'+':'')+v.toFixed(2):'—';
  const last=dates.length-1;
  // The legend carries each line's latest day-over-day change, so the last session reads without hovering.
  const legend=el('span.today-macro-legend',...series.map(x=>el('span.today-lines-key.is-'+x.key,el('i'),labels[x.key]+' ',el('b',lineReading(x,last,rows)))));
  const chart=sparkLines({dates,series,live},{labels,fmtDate});
  const tip=el('div.today-lines-tip',{hidden:true,role:'status'});
  let selected=last;
  chart.setAttribute('tabindex','0');chart.setAttribute('role','slider');chart.setAttribute('aria-orientation','horizontal');
  chart.dataset.readingKey='macro-chart:'+primary;
  chart.setAttribute('aria-label',labels[primary]+' / '+labels.qqq+' / '+labels.spy+'. '+s('today.lines_keyboard'));
  chart.setAttribute('aria-valuemin','0');chart.setAttribute('aria-valuemax',String(last));
  const describe=i=>fmtDate(dates[i])+(live[i]?' · '+s('today.lines_live'):'')+'; '+series.map(x=>labels[x.key]+': '+lineReading(x,i,rows)).join('; ');
  chart.setAttribute('aria-valuenow',String(last));chart.setAttribute('aria-valuetext',describe(last));
  const show=i=>{selected=i;tip.hidden=false;tip.replaceChildren(el('span.today-lines-tip-date',fmtDate(dates[i])+(live[i]?' · '+s('today.lines_live'):'')),
    ...series.map(x=>el('span.today-lines-tip-row.is-'+x.key,el('i'),labels[x.key],el('b',lineReading(x,i,rows)))));chart.moveCursor?.(i);
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
  chart.restoreReadingDate=date=>{const i=dates.indexOf(date);if(i>=0)show(i);};
  return el('div.today-macro-chart.has-cursor',tip,chart,legend,
    el('span.today-macro-caption',s('today.lines_caption',{n:dates.length,what:labels[primary],rq:r(qqq?.correlation),rs:r(spy?.correlation),pq:OK(qqq?.opposite)?qqq.opposite:'—'})));
}

export function macroTiles(doc){
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
  return [
    {key:'liquidity',label:s('today.macro_liquidity'),value:OK(funding.value)?num(funding.value,0):'—',unit:s('today.macro_score_unit'),
     tone:band==='supportive'?'up':band==='adverse'?'down':band==='mixed'?'mid':'flat',help:liquidityHelp(latest),
     gauge:{name:s('today.macro_liquidity'),score:OK(funding.value)?funding.value:null,bands:LIQUIDITY_BANDS(),word:s('today.macro_regime_'+band)},
     stamp:funding.stamp,recorded:funding.recorded,
     note:[s('today.macro_regime_'+band),OK(netT)?s('today.macro_net_liquidity',{value:num(netT,2)}):null,OK(change)?s('today.macro_net_change',{value:signed(change)}):null].filter(Boolean).join(' · '),
     lines:linesFor(doc,'liquidity')},
    {key:'yield',label:s('today.macro_10y'),value:OK(y10.value)?num(y10.value,2)+'%':'—',unit:'',tone:'flat',stamp:y10.stamp,recorded:y10.recorded,
     note:OK(bp)?s('today.macro_10y_change',{bp:signed(bp)}):s('today.macro_no_change'),
     lines:linesFor(doc,'yield')},
    {key:'vix',label:s('today.macro_vix'),value:OK(vix.value)?num(vix.value,1):'—',unit:'',tone:OK(ratio)?(ratio>1?'down':'up'):'flat',stamp:vix.stamp,recorded:vix.recorded,ratioStamp:canonical&&OK(ratio)?s('today.reading_ratio',{reading:term.stamp}):null,ratioRecorded:term.recorded,
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
export function digestBlock(digest,{now=new Date()}={}){
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
  const preview=digestPreview(digest.preview,digest.session);
  // v1.3 snapshots carry a deterministic count/date/coverage paragraph, all repeated by
  // the structured preview. Unknown versions can contain unique prose and keep it visible.
  const redundantPreview=edition==='close_snapshot'&&digest.version==='market-digest/1.3'&&preview;
  if(text('tomorrow')&&!redundantPreview)box.append(el('div.today-digest-tomorrow',el('span.today-digest-label',s(current?'today.digest_tomorrow':'today.digest_tomorrow_saved',{date:sessionLabel(digest.next_session)})),el('p',text('tomorrow'))));
  if(preview)box.append(preview);
  box.append(el('p.small.muted.today-digest-note',s('today.digest_note')));
  if(!current)return el('details.today-digest-archive',{'data-reading-key':'macro-digest:'+String(digest.session||'undated')},
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

export function macroStrip(doc,{now=new Date()}={}){
  const box=el('section.today-macro',{'aria-label':s('today.macro_title')});
  const state=digestState(doc?.digest,{now}),digest=digestBlock(doc?.digest,{now});
  if(!doc||(!doc.latest&&!hasCanonicalReadings(doc))){box.append(el('p.small.muted',s('today.macro_unavailable')));if(digest)box.append(digest);return box;}
  if(state==='current'&&digest)box.append(digest);
  box.append(marketHeading(doc,state));
  if(state!=='current'&&digest)box.append(digest);
  const grid=el('div.today-macro-grid');
  for(const tile of macroTiles(doc)){
    const dial=tile.gauge&&Number.isFinite(tile.gauge.score)?gauge(tile.gauge):null;
    grid.append(el('div.today-macro-tile',{'data-tile':tile.key,'data-reading-anchor':'macro-tile:'+tile.key,class:'is-'+tile.tone+(dial?' has-gauge':'')},
      el('span.today-macro-label',tile.label,tile.help||null),
      dial?el('div.today-gauge-wrap',dial,el('span.today-gauge-word',tile.gauge.word)):el('strong.today-macro-value.mono',tile.value,tile.unit?el('span.today-macro-unit',tile.unit):null),
      el('span.today-macro-note',tile.note),tile.stamp?el('span.today-macro-stamp.small.muted',tile.stamp):null,
      tile.recorded?el('span.today-macro-recorded.small.muted',tile.recorded):null,
      tile.ratioStamp?el('span.today-macro-ratio-stamp.small.muted',tile.ratioStamp):null,
      tile.ratioRecorded?el('span.today-macro-recorded.small.muted',s('today.reading_ratio',{reading:tile.ratioRecorded})):null,historyList(tile.history),
      tile.lines?linesBlock(tile):null));
  }
  // Each source carries its own clock: the FRED / New York Fed panel ends at the last session it
  // covers, the CNN index at the minute it was read, so the footer names both.
  const fngAt=Date.parse(doc.fear_greed?.as_of||'');
  const fng=Number.isFinite(fngAt)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(fngAt):'—';
  box.append(grid,el('p.small.muted.today-macro-source',s(hasCanonicalReadings(doc)?'today.macro_canonical_source':'today.macro_source',{date:doc.latest_available?.as_of||doc.as_of||'—',fng})+(doc.status==='stale'?' · '+s('macro.stale'):''),
    ' ',el('a.today-macro-more',{href:'#/macro'},s('today.macro_more')+' →')));
  return box;
}

// Never blocks or delays the research feed. A failed GET is a read error, not a missing or failed
// daily note. Retry only reads the existing shared document; it never requests generation.
export function mountMacroStrip(host,{signal,interval=60000}={}){
  const epoch=store.epoch(),controller=new AbortController();
  let alive=true,running=false,timer=null,signature=null,lastAttempt=0;
  const active=()=>alive&&!signal?.aborted&&epoch===store.epoch();
  const status=el('p.small.muted',{role:'status'}),refresh=el('button.btn.btn-ghost.btn-sm',
    {type:'button','data-reading-key':'macro-refresh',onclick:()=>load()},s('today.macro_refresh'));
  const controls=el('div.today-macro-refresh',refresh,status);
  function replace(doc){
    const focused=host.contains(document.activeElement)?document.activeElement?.dataset.readingKey:null;
    const selectedDate=focused?document.activeElement?.readingDate?.():null;
    const opened=new Set([...host.querySelectorAll('details[open][data-reading-key]')].map(n=>n.dataset.readingKey));
    const scroller=host.closest('.app-main'),top=scroller?.getBoundingClientRect().top;
    const anchor=scroller?.scrollTop>0?[...host.querySelectorAll('[data-reading-anchor]')].find(n=>n.getBoundingClientRect().bottom>top):null;
    const anchorKey=anchor?.dataset.readingAnchor,before=anchor?.getBoundingClientRect().top;
    host.replaceChildren(macroStrip(doc),controls);
    for(const node of host.querySelectorAll('details[data-reading-key]'))if(opened.has(node.dataset.readingKey))node.open=true;
    if(focused){const target=[...host.querySelectorAll('[data-reading-key]')].find(n=>n.dataset.readingKey===focused);target?.focus({preventScroll:true});if(selectedDate)target?.restoreReadingDate?.(selectedDate);}
    const after=anchorKey?[...host.querySelectorAll('[data-reading-anchor]')].find(n=>n.dataset.readingAnchor===anchorKey):null;
    if(after&&scroller)scroller.scrollTop+=after.getBoundingClientRect().top-before;
  }
  const visible=()=>document.visibilityState!=='hidden'&&window.navigator?.onLine!==false;
  function schedule(){clearTimeout(timer);if(active()){timer=setTimeout(check,Math.max(60000,interval));timer.unref?.();}}
  async function load(){
    if(!active()||running)return;
    running=true;lastAttempt=Date.now();refresh.disabled=true;
    try{
      const doc=await api.get('/macro/beta',{signal:controller.signal,silent402:true,observe:false});
      if(!active())return;
      const next=material(doc);if(next!==signature){replace(doc);signature=next;}
      host.hidden=false;status.textContent='';refresh.textContent=s('today.macro_refresh');
    }catch(error){
      if(!active())return;
      // Transient reads keep the accepted version; access denials must revoke it.
      if(!signature||[401,402,403].includes(error.status)){signature=null;host.replaceChildren(controls);}
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
