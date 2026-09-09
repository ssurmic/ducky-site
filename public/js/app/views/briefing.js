import {el,clear,spinner,errorBox,num} from '../ui.js';
import {s,LANG} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {readingPreview} from '../reading-preview.js';
import {mountStockBriefs} from './stock-briefs.js';

const localized=(row,key)=>row?.[key+'_'+(LANG==='en'?'en':'zh')]||row?.[key+'_en']||row?.[key+'_zh']||'';
export function dateTime(value,precision){const d=new Date(value);if(!value||Number.isNaN(d.getTime()))return '—';
  return precision==='day'||/^\d{4}-\d{2}-\d{2}$/.test(value)?s('briefing.date_only',{date:d.toISOString().slice(0,10)}):d.toISOString().replace('T',' ').slice(0,16)+' UTC';}
function external(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function sourceLink(value,label){const href=external(value);return href?el('a',{href,target:'_blank',rel:'noopener noreferrer'},label+' ↗'):el('span.muted',label);}
function historyLink(row){
  // Construct the internal destination from validated fields, not remote HTML.
  if(!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(row.ticker))return null;
  const path=new URL(row.history_url||'', 'https://ducky.test/').hash;
  if(!path.startsWith('#/boards?'))return '#/boards?mode=archive&ticker='+encodeURIComponent(row.ticker);
  return path;
}
function viewSource(view){const full=localized(view,'summary'),preview=readingPreview(full,LANG!=='en');return el('article.market-evidence-item',
  el('p.small.muted',view.publisher+' · '+dateTime(view.published_at)),
  sourceLink(view.source_url,view.title),el('p',preview),
  full!==preview?el('details.briefing-summary-details',el('summary',s('creators.read_summary')),el('p',full)):null,
  el('p.small.muted',s('briefing.attributed')));}
function eventRow(event){
  const row=el('li',sourceLink(event.source_url,s('radar.kind_'+event.kind)),
    el('p.small.muted',s('briefing.published',{date:dateTime(event.published_at,event.date_precision)})));
  if(event.value!=null)row.append(el('p.small',s('briefing.open_market_value',{value:num(event.value,0)})));
  if(event.position_change)row.append(el('p.small',s('briefing.position_'+event.position_change)));
  if(event.new_shares!=null)row.append(el('p.small',s('briefing.shares',{current:num(event.new_shares,0),prior:num(event.prior_shares,0)})));
  if(event.event_date)row.append(el('p.small.muted',s(event.kind==='13f'?'briefing.report_period':'briefing.event_date',{date:event.event_date})));
  if(event.observed_at)row.append(el('p.small.muted',s('briefing.recorded',{date:dateTime(event.observed_at)})));
  return row;
}
function stockCard(row){
  const card=el('article.card.briefing-stock',{'data-ticker':row.ticker},
    el('div.view-head',el('h3',el('a',{href:'#/chart/'+encodeURIComponent(row.ticker)},'$'+row.ticker)),
      el('span.small.muted',dateTime(row.latest_at,row.latest_precision))),row.company?el('p.muted',row.company):null);
  if(row.events?.length)card.append(el('ul',...row.events.slice(0,2).map(eventRow)));
  if(row.events?.length>2)card.append(el('details',el('summary',s('briefing.more_evidence',{n:row.events.length-2})),
    el('ul',...row.events.slice(2).map(eventRow))));
  for(const view of row.creator_views||[])card.append(el('p.small',sourceLink(view.source_url,view.publisher+' · '+view.title),
    el('span.muted',' · '+dateTime(view.published_at))));
  const history=historyLink(row);
  if(history)card.append(el('a.btn.btn-ghost.btn-sm',{href:history},s('briefing.history')));
  if(row.event_count>row.events?.length)card.append(el('p.small.muted',s('briefing.events_more',{shown:row.events.length,total:row.event_count})));
  return card;
}

export function renderBriefing(doc){
  const body=el('div.briefing-body');
  const window=doc.window||{},coverage=doc.coverage||{};
  body.append(el('p.radar-access-note',s(doc.access?.mode==='delayed'?'briefing.delayed':'briefing.current')),
    el('p.mono.small',dateTime(window.start)+' → '+dateTime(window.end)));
  if(!doc.watchlist_count)body.append(el('section.card',el('h2',s('briefing.add_title')),
    el('p',s('briefing.add_hint')),el('a.btn.btn-primary',{href:'#/watchlist'},s('briefing.edit_watchlist'))));
  const stocks=doc.stock_changes||[];
  const section=el('section',el('h2',s('briefing.changes')));
  if(coverage.facts_status!=='ready')section.append(el('p.data-notice',s('briefing.facts_'+(coverage.facts_status==='stale'?'stale':'unavailable'))));
  if(coverage.events_truncated)section.append(el('p.data-notice',s('briefing.partial')));
  const notes=el('details.briefing-notes',el('summary',s('briefing.details')),
    el('p.small.muted',s('briefing.covered',{n:coverage.covered_watchlist_count??'—',total:doc.watchlist_count??'—',date:dateTime(coverage.facts_as_of)})),
    el('p.small.muted',s('briefing.window_basis')));
  if(coverage.missing_watchlist?.length)notes.append(el('p.small.muted',s('briefing.missing',{tickers:coverage.missing_watchlist.join(', ')})));
  if(!stocks.length)section.append(el('p.empty',s('briefing.no_changes')));
  section.append(el('div.cards',...stocks.slice(0,3).map(stockCard)));
  if(stocks.length>3){
    const more=el('details.card.briefing-all',el('summary',s('briefing.show_all',{n:stocks.length,more:stocks.length-3})),
      el('div.cards',...stocks.slice(3).map(stockCard)));
    section.append(more);
  }
  section.append(notes);body.append(section);
  const creators=el('section.card',el('h2',s('briefing.creators')));
  if(doc.creator_access!=='available')creators.append(el('p',s('briefing.creator_locked')),
    el('a.btn.btn-ghost',{href:'#/billing'},s('briefing.membership')));
  else{
    creators.append(el('p.small.muted',s('briefing.creator_basis')));
    if(coverage.creator_status!=='ready')creators.append(el('p.data-notice',s('briefing.creator_stale')));
    for(const view of doc.creator_views||[])creators.append(viewSource(view));
    if(!doc.creator_views?.length)creators.append(el('p.empty',s('briefing.no_creators')));
    if(doc.creator_view_count>doc.creator_views?.length)creators.append(el('p.small',s('briefing.creator_more',{n:doc.creator_view_count})));
    creators.append(el('a.btn.btn-ghost',{href:'#/creators'},s('briefing.creator_history')));
  }
  body.append(creators);
  const calendar=doc.upcoming||{};
  const upcoming=el('section.card',el('h2',s('briefing.upcoming')),
    el('p.small.muted',s('briefing.calendar_window',{start:calendar.start||'—',end:calendar.end||'—',date:dateTime(calendar.as_of)})));
  if(calendar.partial||calendar.status!=='ready')upcoming.append(el('p.data-notice',s('briefing.calendar_partial')));
  for(const event of calendar.items||[]){
    upcoming.append(el('article.market-evidence-item',el('p.small.mono',event.date+(event.time_et?' · '+event.time_et+' ET':'')),
      el('strong',localized(event,'title')),el('p.small.muted',s(event.relation==='direct'?'briefing.direct':'briefing.market_wide',{tickers:(event.tickers||[]).join(', ')})),
      event.source_url?sourceLink(event.source_url,s('briefing.source')):null));
  }
  if(!calendar.items?.length)upcoming.append(el('p.empty',s('briefing.no_calendar')));
  upcoming.append(el('a.btn.btn-ghost',{href:'#/calendar'},s('briefing.calendar_all',{n:calendar.total||0})));
  body.append(upcoming);
  const market=doc.market||{};
  const context=el('section.card',el('h2',s('briefing.market')),
    el('p.small.muted',s('briefing.market_window',{date:dateTime(market.observed_at)})));
  if(market.status!=='ready')context.append(el('p.data-notice',s('briefing.market_stale')));
  for(const topic of market.topics||[]){
    context.append(el('h3',localized(topic,'label')),el('p.small.muted',s(topic.tickers?.length?'briefing.direct':'briefing.background',{tickers:(topic.tickers||[]).join(', ')})),
      localized(topic,'summary')?el('p',localized(topic,'summary')):null,
      el('ul',...(topic.sources||[]).map(ref=>el('li',sourceLink(ref.source_url,ref.title),el('span.small.muted',' · '+dateTime(ref.published_at))))));
  }
  if(!market.topics?.length){
    for(const headline of market.headlines||[])context.append(el('p',sourceLink(headline.source_url,headline.title),
      el('span.small.muted',' · '+headline.publisher+' · '+dateTime(headline.published_at))));
    if(!market.headlines?.length)context.append(el('p.empty',s('briefing.no_market')));
  }
  body.append(context);
  return body;
}

export async function mount(root,route={}){
  const params=route.query instanceof URLSearchParams?route.query:new URLSearchParams(route.query||'');
  if(!['daily','weekly'].includes(params.get('period')))return mountStockBriefs(root,route);
  const period=params.get('period')==='weekly'?'weekly':'daily';
  const ctl=new AbortController(),epoch=store.epoch();let alive=true,request=0;
  const head=el('div.view-head',el('h1',s('briefing.title')),
    el('nav',{'aria-label':s('briefing.period')},...['daily','weekly'].map(value=>el('a.btn.btn-ghost.btn-sm',
      {href:'#/briefing?period='+value,'aria-current':value===period?'page':null},s('briefing.'+value)))));
  const body=el('div');root.append(head,body);
  head.append(el('a.btn.btn-ghost.btn-sm',{href:'#/briefing'},s('stockbrief.title')));
  if(store.get('me'))head.append(el('a.btn.btn-ghost.btn-sm',{href:'#/research'},s('record.changes')));
  const valid=id=>alive&&!ctl.signal.aborted&&store.epoch()===epoch&&(id==null||id===request);
  async function load(){
    const id=++request;clear(body).append(spinner());
    try{
      const doc=await api.get('/briefing?period='+period,{signal:ctl.signal});
      if(!valid(id))return;
      clear(body).append(renderBriefing(doc));
    }catch(error){if(valid(id))clear(body).append(errorBox(error,load));}
  }
  const unsubs=[store.subscribe('watchlist',load),store.subscribe('me',load)];
  function cleanup(){if(!alive)return;alive=false;request++;ctl.abort();unsubs.forEach(fn=>fn());}
  route.signal?.addEventListener('abort',cleanup,{once:true});
  if(route.signal?.aborted)cleanup();
  if(alive)await load();
  return cleanup;
}
