import {el,clear,spinner,px,pct} from '../ui.js';
import {sourceBadge,nodeSourceIdentity} from '../evidence-source.js';
import {displayQuote} from '../watchlist-overview.js';
import {researchExamples} from '../research-examples.js';
import {s,LANG} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {pick,stockHref,localTime,dayWindow,reading,researchError,replaceReading,syncSourceDialog} from '../stock-reading.js';
import {detail} from './evidence.js';

// Remember only reading controls, never source text or an account's response.
const readingStates=new Map();
let readingEpoch=null;
const SUMMARY_PREVIEW=5,PAGE_SIZE=12,WIDENED_DAYS=7,REVALIDATE_MS=60000;
const timestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?Date.parse(value):-Infinity;

const dayOf=value=>{
  if(typeof value!=='string')return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return '';
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
};
// A record leads the feed only when its SOURCE was published inside the selected period;
// revisions of months-old filings are still readable, but folded away under one disclosure.
export function isFreshChange(item,since){
  const day=dayOf(item?.published_at);
  return !!day&&day>=dayOf(since);
}

// Reading order only: actual analysis dates, never ticker order or a trade score.
export function latestAnalyses(items){
  return [...items].sort((a,b)=>{
    const left=timestamp(a.as_of),right=timestamp(b.as_of);
    return left===right?0:left>right?-1:1;
  });
}
const disclosureHint=()=>el('span.today-disclosure-hint',{'aria-hidden':'true'},
  el('span.today-expand-label',s('focus.expand')),el('span.today-collapse-label',s('focus.collapse')),el('span.today-chevron'));
// Saved watchlist quotes decorate a card; they never change what the record says.
export function quotesFrom(response){
  return new Map((response?.overview?.items||[]).filter(row=>row&&typeof row.ticker==='string').map(row=>[row.ticker,row]));
}
export function quoteChip(ticker,quotes){
  const row=quotes?.get(ticker);if(!row)return null;
  const shown=displayQuote(row)||row;
  if(!Number.isFinite(shown.price)||shown.price<=0)return null;
  const change=Number.isFinite(shown.change_pct)?shown.change_pct:null;
  return el('span.today-quote',{class:change>0?'is-up':change<0?'is-down':''},el('span.mono',px(shown.price)),change===null?null:el('span.mono',pct(change,2)));
}
const quoteSlot=(ticker,quotes)=>el('span.today-quote-slot',{'data-ticker':ticker},quoteChip(ticker,quotes));
const initial=name=>String(name||'').trim().charAt(0).toUpperCase();

function analysisCard(item,quotes){
  const body=reading(item),preview=body.querySelector('.stock-one-sentence')?.cloneNode(true);
  preview?.querySelectorAll('button').forEach(button=>button.remove());
  const key='analysis:'+item.ticker,analysisDate=body.querySelector('.stock-analysis-date');
  return el('details.today-analysis.stock-list-row',{'data-reading-anchor':key,'data-reading-key':key},
    el('summary',{'data-reading-key':key+':toggle'},el('span.today-analysis-top',el('strong.ticker',item.ticker),
      Number.isInteger(item.records)&&item.records>0?el('span.today-records',s('focus.records_count',{n:item.records})):null,
      analysisDate?el('span.small.muted',analysisDate.textContent):null,quoteSlot(item.ticker,quotes)),
      el('span.today-analysis-preview',preview?.textContent||body.textContent),disclosureHint()),
    el('div.today-analysis-body',body,el('div.focus-actions',
      el('a.stock-open',{href:stockHref(item.ticker,'today'),'data-reading-key':item.ticker+':open'},s('focus.open_stock')+' →'),
      el('a.stock-open',{href:'#/evidence/'+encodeURIComponent(item.ticker),'data-reading-key':item.ticker+':map'},s('watch.open_map')+' →'))));
}

export function changeCard(item,{from='today',quotes=null}={}){
  const available=item.state==='available'&&item.node;
  const label=!available?'focus.record_unavailable':item.kind==='revised'?'focus.record_revised':
    item.earlier_content?'focus.earlier_content':item.initial_coverage?'focus.coverage_added':'focus.record_added';
  const node=item.node,authors=[...new Set((node?.evidence||[]).map(e=>e.author).filter(Boolean))];
  const key='change:'+item.id;
  // Stance and source identity come from the record itself; the card only colors what it was given.
  const stance=available&&['support','counter','context'].includes(node.stance)?node.stance:'';
  const article=el('details.change-card',{class:stance?'is-'+stance:'','data-reading-anchor':key,'data-reading-key':key},
    el('summary',{'data-reading-key':key+':toggle'},el('span.change-meta',el('strong.ticker',item.ticker),
      available?sourceBadge(nodeSourceIdentity(node)):null,
      el('span.change-kind',s(label)),available&&node.conditional?el('span.change-kind',s('focus.conditional')):null,quoteSlot(item.ticker,quotes)),
      el('span.change-title',available?pick(node.title):s('focus.unavailable_detail')),
      el('span.small.muted.change-byline',authors.length?el('span.change-avatar',{'aria-hidden':'true'},initial(authors[0])):null,
        el('span',[authors.join(' · '),s('focus.source_published',{date:localTime(item.published_at)})].filter(Boolean).join(' · '))),disclosureHint()));
  article.append(el('div.change-body',el('div.focus-actions',
    available?el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>detail(node)},s('focus.read_source')):null,
    el('a.btn.btn-ghost.btn-sm',{href:stockHref(item.ticker,from)},s('focus.open_stock'))),
    el('details.change-clocks',{'data-reading-key':key+':dates'},el('summary',{'data-reading-key':key+':dates-toggle'},s('focus.record_dates')),
      el('p.small',s('focus.first_observed',{date:localTime(item.observed_at)})),
      el('p.small',s('focus.readable_since',{date:localTime(item.available_at)})),
      el('p.small.muted',s('focus.clock_note')))));
  return article;
}

export async function mount(root,{signal,scope:initialScope='watchlist',embedded=false,initialDays=1}={}){
  const epoch=store.epoch();
  if(readingEpoch!==epoch){readingStates.clear();readingEpoch=epoch;}
  const stateKey=initialScope+'|'+embedded,saved=readingStates.get(stateKey);
  let disposed=false,seq=0,cursor=null,scope=initialScope,days=saved?.days||initialDays,query=saved?.query||'',windowRange=dayWindow(),rows=[],pages=0;
  let showAll=!!saved?.showAll,lastSummary=null,watchlistEmpty=false,autoWiden=!saved,analysesCount=0;
  let quotes=quotesFrom(api.peek('/watchlist'));
  const repaintQuotes=()=>{for(const slot of main.querySelectorAll('.today-quote-slot'))slot.replaceChildren(quoteChip(slot.dataset.ticker,quotes)||'');};
  const restoreDisclosures=host=>{
    for(const node of host.querySelectorAll('details[data-reading-key]'))if(saved?.opened?.includes(node.dataset.readingKey))node.open=true;
  };
  const main=el('section.focus-today'),feed=el('div.change-list'),status=el('div',{'aria-live':'polite'});
  const olderList=el('div.change-list'),olderSummary=el('summary',{'data-reading-key':'changes:older-toggle'},s('focus.older_updates',{count:0}));
  const older=el('details.change-older',{hidden:true,'data-reading-key':'changes:older'},olderSummary,el('p.small.muted',s('focus.older_updates_note')),olderList);
  let olderCount=0;
  const now=new Date(),date=new Intl.DateTimeFormat(LANG==='en'?'en-US':'zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(now);
  const stats=el('div.today-stats',{hidden:true});
  const title=el('header.focus-heading.today-heading',el('div',el('p.today-date',date),el('h1',s('focus.today')),el('p.muted',s('focus.today_intro')),stats),
    el('a.btn.btn-ghost',{href:'#/calendar'},s('focus.upcoming')));
  if(!embedded)main.append(title);
  const stat=(value,label)=>el('span.today-stat',el('strong',String(value)),el('span',label));
  function renderStats(){
    if(embedded)return;
    clear(stats);stats.hidden=watchlistEmpty;
    stats.append(stat(feed.childElementCount,s('focus.stat_fresh',{days})),stat(analysesCount,s('focus.stat_analyses')));
  }
  const search=el('input.input',{type:'search',maxlength:80,placeholder:s('focus.search_research'),'aria-label':s('focus.search_research')});
  const widenedNote=el('p.small.today-widened',{hidden:true,role:'status'},s('focus.widened_note',{days:WIDENED_DAYS}));
  const range=el('select.input',{'aria-label':s('focus.range'),onchange:()=>{days=Number(range.value);autoWiden=false;widenedNote.hidden=true;load();}},
    ...[1,7,30,365].map(n=>el('option',{value:n},s('focus.range_'+n))));
  range.value=days;search.value=query;
  const filters=el('form.focus-filters',{onsubmit:e=>{e.preventDefault();query=search.value.trim();autoWiden=false;widenedNote.hidden=true;load();}},
    range,search,el('button.btn.btn-ghost',{type:'submit'},s('focus.search')));
  const updates=el('section.today-updates',el('h2.today-section-title',s('focus.recent_changes')),filters,widenedNote,status,feed);
  main.append(updates);
  const more=el('button.btn.btn-ghost',{type:'button',hidden:true,onclick:()=>load(true)},s('focus.more_changes'));
  const coverage=el('p.small.muted',s('focus.coverage_note'));
  updates.append(older,more,coverage);root.append(main);
  const summaries=el('section.focus-latest');
  if(!embedded)main.append(summaries);
  async function load(append=false){
    const mine=++seq;
    if(!append){cursor=null;rows=[];pages=0;windowRange=dayWindow(new Date(),days);clear(feed);clear(olderList);olderCount=0;older.hidden=true;}
    clear(status);status.append(spinner());more.disabled=true;
    const params=new URLSearchParams({...windowRange,scope,limit:String(PAGE_SIZE),earlier:String(days!==1||!!query),...(cursor?{before:cursor}:{}),...(query?{q:query}:{})});
    try{
      const response=await api.get('/me/research-changes?'+params,{signal});
      if(disposed||signal?.aborted||mine!==seq)return;
      if(!Array.isArray(response?.items))throw new api.ApiError(502,{error:'invalid_research_response'});
      rows.push(...(response.items||[]));cursor=response.next_cursor;pages++;clear(status);
      // A quiet day widens once, on arrival only, to the past week instead of an empty page; the picker says so.
      if(!append&&!rows.length&&!query&&days===1&&autoWiden&&!watchlistEmpty){
        autoWiden=false;days=WIDENED_DAYS;range.value=String(WIDENED_DAYS);widenedNote.hidden=false;return load();
      }
      autoWiden=false;
      if(!rows.length)status.append(el('p.focus-empty',s(query?'focus.no_search_results':'focus.no_changes')));
      // Within a page the newest source publication reads first; availability order still paginates.
      const ordered=[...(response.items||[])].sort((a,b)=>timestamp(b.published_at)-timestamp(a.published_at));
      for(const item of ordered){
        const card=changeCard(item,{from:embedded?'explore':'today',quotes});
        if(isFreshChange(item,windowRange.since)){feed.append(card);continue;}
        olderList.append(card);olderCount++;olderSummary.textContent=s('focus.older_updates',{count:olderCount});older.hidden=false;
      }
      more.hidden=!cursor;
      if(watchlistEmpty)more.hidden=true;
      restoreDisclosures(feed);restoreDisclosures(older);renderStats();
      return true;
    }catch(error){if(!disposed&&!signal?.aborted&&mine===seq){clear(status);status.append(researchError(error,()=>load(append)));}}
    finally{if(mine===seq)more.disabled=false;}
  }
  let shown=[];
  function renderSummaries(response){
    if(!Array.isArray(response?.items))throw new api.ApiError(502,{error:'invalid_research_response'});
    const items=response.items.filter(i=>/^[A-Z][A-Z0-9.\-]{0,9}$/.test(i.ticker||''));
    for(const ticker of new Set([...shown,...items.map(item=>item.ticker)]))
      syncSourceDialog(ticker,items.find(item=>item.ticker===ticker)?.sources||[]);
    shown=items.map(item=>item.ticker);
    watchlistEmpty=response.watchlist_count===0;analysesCount=items.length;
    updates.hidden=watchlistEmpty;
    for(const node of [filters,status,feed,coverage])node.hidden=watchlistEmpty;
    more.hidden=watchlistEmpty||!cursor;
    lastSummary=response;
    if(response.watchlist_count===0){
      renderStats();replaceReading(summaries,el('p',s('focus.start_following')),el('a.btn.btn-primary',{href:'#/watchlist'},s('focus.add_stocks')),researchExamples());return;
    }
    renderStats();
    const ordered=latestAnalyses(items),selected=showAll?ordered:ordered.slice(0,SUMMARY_PREVIEW);
    replaceReading(summaries,...(items.length?[el('header.today-section-heading',el('div',
      el('h2.today-section-title',s('focus.latest_views'),el('span.today-count',String(items.length))),
      el('p.small.muted',s('focus.latest_views_note')))),el('div.today-analysis-list',...selected.map(item=>analysisCard(item,quotes)))]:[]),
      ...(items.length>SUMMARY_PREVIEW?[el('button.btn.btn-ghost.today-show-all',{type:'button','aria-expanded':String(showAll),
        'data-reading-key':'analyses:all',onclick:()=>{showAll=!showAll;renderSummaries(lastSummary);}},
        s(showAll?'focus.show_fewer_analyses':'focus.show_all_analyses',{count:items.length}))]:[]));
  }
  const update=event=>{
    if(disposed||signal?.aborted||epoch!==store.epoch())return;
    if(event.detail?.path==='/watchlist'){
      if(!Array.isArray(event.detail.value?.overview?.items))return;
      quotes=quotesFrom(event.detail.value);repaintQuotes();event.detail.accepted=true;return;
    }
    if(embedded||event.detail?.path!=='/me/stock-research')return;
    try{renderSummaries(event.detail.value);event.detail.accepted=true;}catch{}
  };
  root.addEventListener('ducky:shared-read',update);
  const savedSummary=embedded?null:api.peek('/me/stock-research');
  if(savedSummary)renderSummaries(savedSummary);
  const summaryTask=embedded?Promise.resolve():api.get('/me/stock-research',{signal}).then(response=>{
    if(!disposed&&!signal?.aborted&&epoch===store.epoch())renderSummaries(response);
  }).catch(error=>{if(!disposed&&!signal?.aborted&&epoch===store.epoch()){
    if([401,402,403].includes(error.status))clear(summaries);
    summaries.append(el('p.small.muted',s('focus.summary_read_failed')));
  }});
  // Prices decorate the cards; a slow, missing or failed quote read never blocks or delays the feed.
  // The first page after boot reuses the boot sequence's seconds-old /watchlist read (it still joins
  // shared revalidation); every later entry revalidates.
  const boot=embedded?null:api.bootRead('/watchlist');
  if(boot){quotes=quotesFrom(boot.value);repaintQuotes();}
  else if(!embedded)api.get('/watchlist',{signal,observe:true}).then(response=>{
    if(disposed||signal?.aborted||epoch!==store.epoch()||!Array.isArray(response?.overview?.items))return;
    quotes=quotesFrom(response);repaintQuotes();
  }).catch(()=>{});
  // While Today stays open and visible, the first page is re-read once a minute and records that
  // were published since are added in place. Searches, history cursors and hidden pages are never replayed.
  async function revalidate(){
    if(disposed||signal?.aborted||epoch!==store.epoch()||embedded||query||pages!==1||watchlistEmpty)return;
    if(document.visibilityState==='hidden'||window.navigator?.onLine===false)return;
    const range=dayWindow(new Date(),days);
    const params=new URLSearchParams({...range,scope,limit:String(PAGE_SIZE),earlier:String(days!==1)});
    let response;
    try{response=await api.get('/me/research-changes?'+params,{signal,observe:false});}catch{return;}
    if(disposed||signal?.aborted||epoch!==store.epoch()||query||pages!==1||!Array.isArray(response?.items))return;
    const known=new Set(rows.map(item=>item?.id));
    const added=response.items.filter(item=>item?.id&&!known.has(item.id));
    if(!added.length)return;
    windowRange=range;
    for(const item of [...added].sort((a,b)=>timestamp(a.published_at)-timestamp(b.published_at))){
      const card=changeCard(item,{from:'today',quotes});
      if(isFreshChange(item,windowRange.since))feed.prepend(card);
      else{olderList.prepend(card);olderCount++;olderSummary.textContent=s('focus.older_updates',{count:olderCount});older.hidden=false;}
    }
    rows.unshift(...added);clear(status);renderStats();
  }
  const timer=embedded?null:setInterval(()=>{revalidate();},REVALIDATE_MS);
  timer?.unref?.();
  async function restoreReading(){
    if(!await load())return;
    // Revalidate sources when returning; old copied cards cannot bypass withdrawals.
    for(let page=1;page<Math.min(saved?.pages||1,20)&&cursor&&!disposed&&!signal?.aborted;page++)
      if(!await load(true))break;
  }
  await Promise.all([restoreReading(),summaryTask]);
  restoreDisclosures(summaries);
  return()=>{disposed=true;seq++;if(timer)clearInterval(timer);root.removeEventListener('ducky:shared-read',update);if(epoch===store.epoch())readingStates.set(stateKey,{days,query,pages,showAll,
    opened:[...main.querySelectorAll('details[open][data-reading-key]')].map(node=>node.dataset.readingKey)});};
}
