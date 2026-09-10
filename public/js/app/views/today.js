import {el,clear,spinner} from '../ui.js';
import {s} from '../strings.js';
import * as api from '../api.js';
import {pick,stockHref,localTime,dayWindow,reading,researchError} from '../stock-reading.js';
import {detail} from './evidence.js';

export function changeCard(item,{from='today'}={}){
  const available=item.state==='available'&&item.node;
  const label=!available?'focus.record_unavailable':item.kind==='revised'?'focus.record_revised':
    item.earlier_content?'focus.earlier_content':item.initial_coverage?'focus.coverage_added':'focus.record_added';
  const node=item.node,authors=[...new Set((node?.evidence||[]).map(e=>e.author).filter(Boolean))];
  const article=el('article.change-card',el('div.change-meta',el('a.ticker',{href:stockHref(item.ticker,from)},item.ticker),
    el('span.change-kind',s(label)),node?.conditional?el('span.change-kind',s('focus.conditional')):null),
    available?el('h3',pick(node.title)):el('p.muted',s('focus.unavailable_detail')),
    el('p.small.muted',[authors.join(' · '),s('focus.source_published',{date:localTime(item.published_at)})].filter(Boolean).join(' · ')));
  article.append(el('div.focus-actions',
    available?el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>detail(node)},s('focus.read_source')):null,
    el('a.btn.btn-ghost.btn-sm',{href:stockHref(item.ticker,from)},s('focus.open_stock'))),
    el('details.change-clocks',el('summary',s('focus.record_dates')),
      el('p.small',s('focus.first_observed',{date:localTime(item.observed_at)})),
      el('p.small',s('focus.readable_since',{date:localTime(item.available_at)})),
      el('p.small.muted',s('focus.clock_note'))));
  return article;
}

export async function mount(root,{signal,scope:initialScope='watchlist',embedded=false}={}){
  let disposed=false,seq=0,cursor=null,scope=initialScope,days=1,query='',windowRange=dayWindow(),rows=[];
  const main=el('section.focus-today'),feed=el('div.change-list'),status=el('div',{'aria-live':'polite'});
  const title=el('header.focus-heading',el('div',el('h1',s('focus.today')),el('p.muted',s('focus.today_intro'))),
    el('a.btn.btn-ghost',{href:'#/calendar'},s('focus.upcoming')));
  if(!embedded)main.append(title);
  const search=el('input.input',{type:'search',maxlength:80,placeholder:s('focus.search_research'),'aria-label':s('focus.search_research')});
  const range=el('select.input',{'aria-label':s('focus.range'),onchange:()=>{days=Number(range.value);load();}},
    ...[1,7,30,365].map(n=>el('option',{value:n},s('focus.range_'+n))));
  const filters=el('form.focus-filters',{onsubmit:e=>{e.preventDefault();query=search.value.trim();load();}},
    range,search,el('button.btn.btn-ghost',{type:'submit'},s('focus.search')));
  main.append(filters,status,feed);
  const more=el('button.btn.btn-ghost',{type:'button',hidden:true,onclick:()=>load(true)},s('focus.more_changes'));
  const coverage=el('p.small.muted',s('focus.coverage_note'));
  main.append(more,coverage);root.append(main);
  const summaries=el('section.focus-latest');
  if(!embedded)main.append(summaries);
  async function load(append=false){
    const mine=++seq;
    if(!append){cursor=null;rows=[];windowRange=dayWindow(new Date(),days);clear(feed);}
    clear(status);status.append(spinner());more.disabled=true;
    const params=new URLSearchParams({...windowRange,scope,limit:'5',earlier:String(days!==1||!!query),...(cursor?{before:cursor}:{}),...(query?{q:query}:{})});
    try{
      const response=await api.get('/me/research-changes?'+params,{signal});
      if(disposed||signal?.aborted||mine!==seq)return;
      if(!Array.isArray(response?.items))throw new api.ApiError(502,{error:'invalid_research_response'});
      rows.push(...(response.items||[]));cursor=response.next_cursor;clear(status);
      if(!rows.length)status.append(el('p.focus-empty',s(query?'focus.no_search_results':'focus.no_changes')));
      for(const item of response.items||[])feed.append(changeCard(item,{from:embedded?'explore':'today'}));
      more.hidden=!cursor;
    }catch(error){if(!disposed&&!signal?.aborted&&mine===seq){clear(status);status.append(researchError(error,()=>load(append)));}}
    finally{if(mine===seq)more.disabled=false;}
  }
  const summaryTask=embedded?Promise.resolve():api.get('/me/stock-research',{signal}).then(response=>{
    if(disposed||signal?.aborted)return;
    if(!Array.isArray(response?.items))throw new api.ApiError(502,{error:'invalid_research_response'});
    const items=(response.items||[]).filter(i=>pick(i.overview));
    if(response.watchlist_count===0){
      for(const node of [filters,status,feed,more,coverage])node.hidden=true;
      summaries.append(el('p',s('focus.start_following')),el('a.btn.btn-primary',{href:'#/watchlist'},s('focus.add_stocks')));return;
    }
    if(!items.length)return;
    summaries.append(el('h2',s('focus.latest_views')),el('p.small.muted',s('focus.latest_views_note')));
    for(const item of items.slice(0,3))summaries.append(el('article.stock-list-row',
      el('a.ticker',{href:stockHref(item.ticker,'today')},item.ticker),reading(item),
      el('a.stock-open',{href:stockHref(item.ticker,'today')},s('focus.open_stock')+' →')));
  }).catch(()=>{if(!disposed&&!signal?.aborted)summaries.append(el('p.small.muted',s('focus.summary_read_failed')));});
  await Promise.all([load(),summaryTask]);
  return()=>{disposed=true;seq++;};
}
