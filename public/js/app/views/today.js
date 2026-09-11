import {el,clear,spinner} from '../ui.js';
import {researchExamples} from '../research-examples.js';
import {s,LANG} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {pick,stockHref,localTime,dayWindow,reading,researchError,replaceReading,syncSourceDialog} from '../stock-reading.js';
import {detail} from './evidence.js';

// Remember only reading controls, never source text or an account's response.
const readingStates=new Map();
let readingEpoch=null;
const SUMMARY_PREVIEW=5;
const timestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?Date.parse(value):-Infinity;

// Reading order only: actual analysis dates, never ticker order or a trade score.
export function latestAnalyses(items){
  return [...items].sort((a,b)=>{
    const left=timestamp(a.as_of),right=timestamp(b.as_of);
    return left===right?0:left>right?-1:1;
  });
}
const disclosureHint=()=>el('span.today-disclosure-hint',{'aria-hidden':'true'},
  el('span.today-expand-label',s('focus.expand')),el('span.today-collapse-label',s('focus.collapse')),el('span.today-chevron'));

function analysisCard(item){
  const body=reading(item),preview=body.querySelector('.stock-one-sentence')?.cloneNode(true);
  preview?.querySelectorAll('button').forEach(button=>button.remove());
  const key='analysis:'+item.ticker,analysisDate=body.querySelector('.stock-analysis-date');
  return el('details.today-analysis.stock-list-row',{'data-reading-anchor':key,'data-reading-key':key},
    el('summary',{'data-reading-key':key+':toggle'},el('span.today-analysis-top',el('strong.ticker',item.ticker),
      analysisDate?el('span.small.muted',analysisDate.textContent):null),
      el('span.today-analysis-preview',preview?.textContent||body.textContent),disclosureHint()),
    el('div.today-analysis-body',body,el('div.focus-actions',
      el('a.stock-open',{href:stockHref(item.ticker,'today'),'data-reading-key':item.ticker+':open'},s('focus.open_stock')+' →'),
      el('a.stock-open',{href:'#/evidence/'+encodeURIComponent(item.ticker),'data-reading-key':item.ticker+':map'},s('watch.open_map')+' →'))));
}

export function changeCard(item,{from='today'}={}){
  const available=item.state==='available'&&item.node;
  const label=!available?'focus.record_unavailable':item.kind==='revised'?'focus.record_revised':
    item.earlier_content?'focus.earlier_content':item.initial_coverage?'focus.coverage_added':'focus.record_added';
  const node=item.node,authors=[...new Set((node?.evidence||[]).map(e=>e.author).filter(Boolean))];
  const key='change:'+item.id;
  const article=el('details.change-card',{'data-reading-anchor':key,'data-reading-key':key},
    el('summary',{'data-reading-key':key+':toggle'},el('span.change-meta',el('strong.ticker',item.ticker),
      el('span.change-kind',s(label)),available&&node.conditional?el('span.change-kind',s('focus.conditional')):null),
      el('span.change-title',available?pick(node.title):s('focus.unavailable_detail')),
      el('span.small.muted.change-byline',[authors.join(' · '),s('focus.source_published',{date:localTime(item.published_at)})].filter(Boolean).join(' · ')),disclosureHint()));
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
  let showAll=!!saved?.showAll,lastSummary=null,watchlistEmpty=false;
  const restoreDisclosures=host=>{
    for(const node of host.querySelectorAll('details[data-reading-key]'))if(saved?.opened?.includes(node.dataset.readingKey))node.open=true;
  };
  const main=el('section.focus-today'),feed=el('div.change-list'),status=el('div',{'aria-live':'polite'});
  const now=new Date(),date=new Intl.DateTimeFormat(LANG==='en'?'en-US':'zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(now);
  const title=el('header.focus-heading.today-heading',el('div',el('p.today-date',date),el('h1',s('focus.today')),el('p.muted',s('focus.today_intro'))),
    el('a.btn.btn-ghost',{href:'#/calendar'},s('focus.upcoming')));
  if(!embedded)main.append(title);
  const search=el('input.input',{type:'search',maxlength:80,placeholder:s('focus.search_research'),'aria-label':s('focus.search_research')});
  const range=el('select.input',{'aria-label':s('focus.range'),onchange:()=>{days=Number(range.value);load();}},
    ...[1,7,30,365].map(n=>el('option',{value:n},s('focus.range_'+n))));
  range.value=days;search.value=query;
  const filters=el('form.focus-filters',{onsubmit:e=>{e.preventDefault();query=search.value.trim();load();}},
    range,search,el('button.btn.btn-ghost',{type:'submit'},s('focus.search')));
  const updates=el('section.today-updates',el('h2.today-section-title',s('focus.recent_changes')),filters,status,feed);
  main.append(updates);
  const more=el('button.btn.btn-ghost',{type:'button',hidden:true,onclick:()=>load(true)},s('focus.more_changes'));
  const coverage=el('p.small.muted',s('focus.coverage_note'));
  updates.append(more,coverage);root.append(main);
  const summaries=el('section.focus-latest');
  if(!embedded)main.append(summaries);
  async function load(append=false){
    const mine=++seq;
    if(!append){cursor=null;rows=[];pages=0;windowRange=dayWindow(new Date(),days);clear(feed);}
    clear(status);status.append(spinner());more.disabled=true;
    const params=new URLSearchParams({...windowRange,scope,limit:'5',earlier:String(days!==1||!!query),...(cursor?{before:cursor}:{}),...(query?{q:query}:{})});
    try{
      const response=await api.get('/me/research-changes?'+params,{signal});
      if(disposed||signal?.aborted||mine!==seq)return;
      if(!Array.isArray(response?.items))throw new api.ApiError(502,{error:'invalid_research_response'});
      rows.push(...(response.items||[]));cursor=response.next_cursor;pages++;clear(status);
      if(!rows.length)status.append(el('p.focus-empty',s(query?'focus.no_search_results':'focus.no_changes')));
      for(const item of response.items||[])feed.append(changeCard(item,{from:embedded?'explore':'today'}));
      more.hidden=!cursor;
      if(watchlistEmpty)more.hidden=true;
      restoreDisclosures(feed);
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
    watchlistEmpty=response.watchlist_count===0;
    updates.hidden=watchlistEmpty;
    for(const node of [filters,status,feed,coverage])node.hidden=watchlistEmpty;
    more.hidden=watchlistEmpty||!cursor;
    lastSummary=response;
    if(response.watchlist_count===0){
      replaceReading(summaries,el('p',s('focus.start_following')),el('a.btn.btn-primary',{href:'#/watchlist'},s('focus.add_stocks')),researchExamples());return;
    }
    const ordered=latestAnalyses(items),selected=showAll?ordered:ordered.slice(0,SUMMARY_PREVIEW);
    replaceReading(summaries,...(items.length?[el('header.today-section-heading',el('div',
      el('h2.today-section-title',s('focus.latest_views'),el('span.today-count',String(items.length))),
      el('p.small.muted',s('focus.latest_views_note')))),el('div.today-analysis-list',...selected.map(analysisCard))]:[]),
      ...(items.length>SUMMARY_PREVIEW?[el('button.btn.btn-ghost.today-show-all',{type:'button','aria-expanded':String(showAll),
        'data-reading-key':'analyses:all',onclick:()=>{showAll=!showAll;renderSummaries(lastSummary);}},
        s(showAll?'focus.show_fewer_analyses':'focus.show_all_analyses',{count:items.length}))]:[]));
  }
  const update=event=>{
    if(embedded||disposed||signal?.aborted||epoch!==store.epoch()||event.detail?.path!=='/me/stock-research')return;
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
  async function restoreReading(){
    if(!await load())return;
    // Revalidate sources when returning; old copied cards cannot bypass withdrawals.
    for(let page=1;page<Math.min(saved?.pages||1,20)&&cursor&&!disposed&&!signal?.aborted;page++)
      if(!await load(true))break;
  }
  await Promise.all([restoreReading(),summaryTask]);
  restoreDisclosures(summaries);
  return()=>{disposed=true;seq++;root.removeEventListener('ducky:shared-read',update);if(epoch===store.epoch())readingStates.set(stateKey,{days,query,pages,showAll,
    opened:[...main.querySelectorAll('details[open][data-reading-key]')].map(node=>node.dataset.readingKey)});};
}
