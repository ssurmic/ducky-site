// views/alert-feed.js — 「我的提醒」: one shared row per source event for the stocks the reader follows (the
// backend writes each event once; this page reads it in the account language). Primary source
// GET /me/alerts/feed (docs/api/ALERT-FEED.md in the backend); while that route is not served yet the page
// falls back to the per-account delivery history (/signals/inbox) so earlier pushes stay readable.
// The second tab hosts the existing custom price alerts (views/alerts.js) unchanged.
import {el,clear,spinner,errorBox} from '../ui.js';
import {s,has,LANG} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {recordHref} from '../record-format.js';
import {markAlertsSeen} from '../alert-badge.js';

const tickerPattern=/^[A-Z][A-Z0-9.-]{0,9}$/;
const recordPattern=/^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,149}$/;
const PAGE=30;
export const FILTERS=[['all',null],['insider','insider'],['creators','kol'],['news','news'],['index','index'],['macro','macro-regime']];
const BADGES=['open_market','largest_buy_90d','only_buy_12m','first_buy_6m','cluster_buy','c_suite','indirect','view_changed','conditional'];
const locale=LANG==='en'?'en-US':'zh-CN';

const text=value=>typeof value==='string'?value:'';
const clock=value=>{const t=Date.parse(text(value));return Number.isFinite(t)?t:NaN;};
export const pick=value=>value&&typeof value==='object'?text(value[LANG])||text(value.zh)||text(value.en):text(value);
export function sourceURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function directionOf(item){
  const signal=item?.signal?.direction;
  if(signal==='buy'||item?.direction===1)return 'buy';
  if(signal==='sell'||item?.direction===-1)return 'sell';
  return '';
}
export function kindLabel(kind){const key='alertfeed.kind_'+String(kind||'').replace(/-/g,'_');return has(key)?s(key):s('alertfeed.kind_other');}

function pair(value){return value&&typeof value==='object'?{zh:text(value.zh),en:text(value.en)}:{zh:text(value),en:text(value)};}
function bullets(value){return value&&typeof value==='object'?{zh:(Array.isArray(value.zh)?value.zh:[]).map(text).filter(Boolean),en:(Array.isArray(value.en)?value.en:[]).map(text).filter(Boolean)}:{zh:[],en:[]};}
export function normalizeNote(note){
  if(!note||typeof note!=='object')return null;
  const facts=(Array.isArray(note.facts)?note.facts:[]).filter(f=>f&&typeof f==='object').map(f=>({label:pair(f.label),value:pair(f.value)})).slice(0,12);
  const source=note.source&&typeof note.source==='object'?{label:pair(note.source.label),url:sourceURL(note.source.url)}:{label:{zh:'',en:''},url:null};
  return {headline:pair(note.headline),summary:pair(note.summary),facts,context:bullets(note.context),watch:pair(note.watch),caveats:bullets(note.caveats),
    source,event_at:text(note.event_at),filed_at:text(note.filed_at)};
}
function normalizeItem(raw){
  if(!raw||typeof raw!=='object')return null;
  const id=text(raw.id)||String(raw.id??'');
  if(!id)return null;
  const ticker=text(raw.ticker).toUpperCase();
  const status=raw.content_status==='superseded'?'superseded':'current';
  const signal=raw.signal&&typeof raw.signal==='object'?{direction:text(raw.signal.direction),strength:text(raw.signal.strength),
    badges:(Array.isArray(raw.signal.badges)?raw.signal.badges:[]).filter(b=>BADGES.includes(b))}:null;
  return {id,topic:raw.topic==='macro'?'macro':'ticker',ticker:tickerPattern.test(ticker)?ticker:'',kind:text(raw.kind)||'record',
    observed_at:text(raw.observed_at),published_at:text(raw.published_at),direction:Number(raw.direction)||0,
    headline:pair(raw.headline),summary:pair(raw.summary),signal,materiality_tier:text(raw.materiality_tier),
    source_record_id:recordPattern.test(text(raw.source_record_id))?raw.source_record_id:'',source_url:status==='current'?sourceURL(raw.source_url):null,
    content_status:status,note:status==='current'?normalizeNote(raw.note):null};
}
export function normalizeFeed(doc){
  const items=(Array.isArray(doc?.items)?doc.items:[]).map(normalizeItem).filter(Boolean);
  return {items,next_cursor:text(doc?.next_cursor)||null,unread_count:Number(doc?.unread_count)||0,seen_through:text(doc?.seen_through),
    watch_tickers:(Array.isArray(doc?.watch_tickers)?doc.watch_tickers:[]).map(t=>text(t).toUpperCase()).filter(t=>tickerPattern.test(t)),source:'feed'};
}
/** The delivery history (/signals/inbox) in the feed's shape: earlier pushes stay readable before the feed route ships. */
export function fromInbox(doc){
  const items=(Array.isArray(doc?.items)?doc.items:[]).map(row=>{
    const id=text(row?.source_record_id)||'',ticker=text(row?.ticker).toUpperCase();
    const direction=/:P$/.test(id)?1:/:S$/.test(id)?-1:0;
    return normalizeItem({id:'inbox:'+String(row?.id??''),topic:'ticker',ticker,kind:row?.kind,observed_at:row?.queued_at||row?.observed_at,published_at:row?.published_at,
      direction,headline:{zh:text(row?.title),en:text(row?.title_en)||text(row?.title)},summary:row?.note?.summary||{zh:'',en:''},signal:null,
      materiality_tier:'push',source_record_id:id,source_url:row?.source_url,content_status:row?.content_status,note:row?.note});
  }).filter(Boolean);
  return {items,next_cursor:doc?.next_cursor?String(doc.next_cursor):null,unread_count:0,seen_through:'',watch_tickers:[],source:'inbox'};
}

export function dayKey(value){const t=clock(value);if(!Number.isFinite(t))return '';const d=new Date(t);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
export function dayLabel(key,now=new Date()){
  if(!key)return s('alertfeed.date_unknown');
  const today=dayKey(now.toISOString()),yesterday=dayKey(new Date(now.getTime()-86400000).toISOString());
  if(key===today)return s('alertfeed.today');
  if(key===yesterday)return s('alertfeed.yesterday');
  const [y,m,d]=key.split('-').map(Number),date=new Date(y,m-1,d);
  return new Intl.DateTimeFormat(locale,{month:'long',day:'numeric',...(y!==now.getFullYear()?{year:'numeric'}:{})}).format(date);
}
export function timeLabel(value){const t=clock(value);return Number.isFinite(t)?new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit'}).format(new Date(t)):'';}
export function groupByDay(items,now=new Date()){
  const groups=[];
  for(const item of items){const key=dayKey(item.observed_at);let group=groups.at(-1);
    if(!group||group.key!==key){group={key,label:dayLabel(key,now),items:[]};groups.push(group);}
    group.items.push(item);}
  return groups;
}

function noteDetails(note){
  const box=el('details.alert-note',el('summary',s('alertfeed.details')));
  if(note.facts.length){const dl=el('dl.alert-note-facts');for(const f of note.facts)dl.append(el('dt',pick(f.label)),el('dd',pick(f.value)));box.append(dl);}
  const context=note.context[LANG]?.length?note.context[LANG]:note.context.zh.length?note.context.zh:note.context.en;
  if(context.length)box.append(el('h4',s('alertfeed.context')),el('ul',context.map(line=>el('li',line))));
  const watch=pick(note.watch);if(watch)box.append(el('h4',s('alertfeed.watch')),el('p',watch));
  const caveats=note.caveats[LANG]?.length?note.caveats[LANG]:note.caveats.zh.length?note.caveats.zh:note.caveats.en;
  if(caveats.length)box.append(el('h4',s('alertfeed.caveats')),el('ul.small.muted',caveats.map(line=>el('li',line))));
  return box;
}
export function itemCard(item,{seenThrough='',now=new Date()}={}){
  const dir=directionOf(item),unread=Number.isFinite(clock(item.observed_at))&&(!seenThrough||clock(item.observed_at)>clock(seenThrough));
  const card=el('article.alert-item',{class:[dir?'is-'+dir:'',unread?'is-unread':'',item.content_status==='superseded'?'is-superseded':''].filter(Boolean).join(' ')||null,
    'data-alert-id':item.id,'data-kind':item.kind});
  const top=el('div.alert-item-top');
  if(item.ticker)top.append(el('a.alert-ticker.mono',{href:'#/stock/'+encodeURIComponent(item.ticker)},el('span.ticker-symbol','$'+item.ticker)));
  else if(item.topic==='macro')top.append(el('span.alert-ticker',s('alertfeed.macro_label')));
  top.append(el('span.chip.alert-kind',kindLabel(item.kind)));
  if(dir)top.append(el('span.alert-direction',s(has('alertfeed.direction_'+String(item.kind).replace(/-/g,'_')+'_'+dir)?'alertfeed.direction_'+String(item.kind).replace(/-/g,'_')+'_'+dir:'alertfeed.direction_'+dir)));
  const when=timeLabel(item.observed_at);
  top.append(el('time.alert-time',{datetime:item.observed_at||null},when));
  if(unread)top.append(el('span.alert-unread',{role:'img','aria-label':s('alertfeed.unread_one')}));
  card.append(top);
  if(item.content_status==='superseded'){card.append(el('p.alert-headline.muted',s('alertfeed.superseded')));return card;}
  card.append(el('h3.alert-headline',pick(item.headline)||s('alertfeed.untitled')));
  const summary=pick(item.summary);if(summary)card.append(el('p.alert-summary',summary));
  const badges=(item.signal?.badges||[]).filter(b=>has('alertfeed.badge_'+b));
  if(badges.length)card.append(el('div.alert-badges',badges.map(b=>el('span.alert-badge',s('alertfeed.badge_'+b)))));
  if(item.note)card.append(noteDetails(item.note));
  const links=el('div.alert-links');
  if(item.ticker)links.append(el('a.btn.btn-ghost.btn-sm',{href:'#/stock/'+encodeURIComponent(item.ticker)},s('alertfeed.open_stock')));
  if(item.source_record_id&&!item.source_record_id.startsWith('inbox:'))links.append(el('a.btn.btn-ghost.btn-sm',{href:recordHref({id:item.source_record_id})},s('alertfeed.record')));
  const source=item.note?.source?.url||item.source_url;
  if(source)links.append(el('a.btn.btn-ghost.btn-sm',{href:source,target:'_blank',rel:'noopener noreferrer'},(pick(item.note?.source?.label)||s('alertfeed.source'))+' ↗'));
  if(links.childElementCount)card.append(links);
  return card;
}

export async function mount(root,params={}){
  const epoch=store.epoch(),token=store.get('token');
  const query=params.query instanceof URLSearchParams?params.query:new URLSearchParams();
  const ctl=new AbortController();
  // A price draft from a stock page (?ticker&price&direction) and ?view=custom open the custom-alert tab.
  const draft=['price','direction'].some(key=>query.has(key));
  let alive=true,tab=query.get('view')==='custom'||draft?'custom':'feed',filter=FILTERS.some(([k])=>k===query.get('kind'))?query.get('kind'):'all';
  let state={items:[],cursor:null,seenThrough:'',unread:0,source:'',loading:false,more:false,error:null,ready:false},customDispose=null,customRoot=null,seenSent=false;
  const page=el('section.alert-feed');root.append(page);
  const valid=()=>alive&&epoch===store.epoch()&&token===store.get('token');
  const head=el('div.view-head.alert-feed-head',el('div',el('h1',s('alertfeed.title')),el('p.view-intro.muted',s('alertfeed.intro'))));
  const unreadChip=el('span.chip.alert-unread-chip',{hidden:true});
  const refresh=el('button.btn.btn-ghost.btn-sm',{type:'button','data-alert-refresh':'',onclick:()=>load(false)},s('alertfeed.refresh'));
  head.append(el('div.alert-feed-actions',unreadChip,refresh));
  const tabs=el('div.alert-tabs',{role:'tablist'});
  const feedTab=el('button',{type:'button',role:'tab','data-alert-tab':'feed',onclick:()=>selectTab('feed')},s('alertfeed.tab_feed'));
  const customTab=el('button',{type:'button',role:'tab','data-alert-tab':'custom',onclick:()=>selectTab('custom')},s('alertfeed.tab_custom'));
  tabs.append(feedTab,customTab);
  const filters=el('div.alert-filters',{role:'group','aria-label':s('alertfeed.filters')});
  const feedPanel=el('div.alert-feed-panel',{role:'tabpanel'}),customPanel=el('div.alert-custom-panel',{role:'tabpanel',hidden:true});
  const list=el('div.alert-list');feedPanel.append(filters,list);
  page.append(head,tabs,feedPanel,customPanel);

  function syncQuery(){const q=new URLSearchParams(query);if(tab==='custom'&&!draft)q.set('view','custom');else q.delete('view');if(filter!=='all')q.set('kind',filter);else q.delete('kind');
    const hash='#/alerts'+(q.toString()?'?'+q:'');if(location.hash!==hash)history.replaceState(null,'',location.pathname+location.search+hash);}
  function renderTabs(){for(const [btn,name] of [[feedTab,'feed'],[customTab,'custom']]){btn.setAttribute('aria-selected',String(tab===name));}
    feedPanel.hidden=tab!=='feed';customPanel.hidden=tab!=='custom';refresh.hidden=tab!=='feed';}
  async function selectTab(name){if(!valid())return;tab=name;syncQuery();renderTabs();
    if(name==='custom'&&!customRoot){customRoot=el('div');customPanel.append(customRoot);
      try{const mod=await import('./alerts.js');if(!valid())return;customDispose=await mod.mount(customRoot,{...params,query,signal:ctl.signal});}
      catch(error){if(valid())customRoot.append(errorBox(error,()=>{customRoot.remove();customRoot=null;selectTab('custom');}));}}}
  function renderFilters(){clear(filters);for(const [key] of FILTERS)filters.append(el('button',{type:'button','data-alert-filter':key,'aria-pressed':String(filter===key),
    onclick:()=>{if(filter===key)return;filter=key;syncQuery();renderFilters();load(false);}},s('alertfeed.filter_'+key)));}
  function renderList(){
    if(!valid())return;clear(list);
    unreadChip.hidden=!(state.source==='feed'&&state.unread>0);unreadChip.textContent=s('alertfeed.unread_count',{n:state.unread});
    if(state.error&&!state.items.length){list.append(errorBox(state.error,()=>load(false)));return;}
    if(state.source==='inbox')list.append(el('p.small.muted.alert-rollout',s('alertfeed.pending_rollout'),' ',el('a',{href:'#/updates'},s('alertfeed.history_link'))));
    // Delivery history carries no materiality tier, so company newsroom rows show only under the 公告 filter there;
    // the feed route applies the backend gate itself (news only when material).
    const wanted=FILTERS.find(([k])=>k===filter)[1];
    const visible=state.source==='inbox'?state.items.filter(i=>filter==='all'?i.kind!=='news':i.kind===wanted):state.items;
    if(state.ready&&!visible.length)list.append(el('div.alert-empty',el('p',s(filter==='all'?'alertfeed.empty':'alertfeed.empty_filtered')),
      filter==='all'?el('a.btn.btn-ghost.btn-sm',{href:'#/explore'},s('alertfeed.browse')):null));
    for(const group of groupByDay(visible)){list.append(el('h2.alert-day',group.label));for(const item of group.items)list.append(itemCard(item,{seenThrough:state.seenThrough}));}
    if(state.error)list.append(errorBox(state.error,()=>load(state.more)));
    if(state.cursor&&!state.loading)list.append(el('button.btn.btn-ghost.alert-more',{type:'button','data-alert-more':'',onclick:()=>load(true)},s('alertfeed.more')));
    if(state.loading)list.append(spinner(s('common.loading')));
  }
  async function fetchFeed(more){
    const kinds=FILTERS.find(([k])=>k===filter)[1];
    const p={limit:String(PAGE),fields:'full'};if(kinds)p.kinds=kinds;if(more&&state.cursor)p.before=state.cursor;
    return normalizeFeed(await api.alertFeed.list(p,{signal:ctl.signal,silent402:true}));
  }
  async function fetchInbox(more){
    const p=new URLSearchParams({limit:String(PAGE)});if(more&&state.cursor)p.set('before_id',state.cursor);
    return fromInbox(await api.get('/signals/inbox?'+p,{signal:ctl.signal,silent402:true}));
  }
  async function load(more){
    if(!valid()||state.loading)return;
    state={...state,loading:true,more,error:null};if(!more)state={...state,items:[],cursor:null};renderList();
    try{
      let doc;
      if(state.source==='inbox')doc=await fetchInbox(more);
      else{try{doc=await fetchFeed(more);}catch(error){if(![404,501].includes(error?.status))throw error;doc=await fetchInbox(more);}}
      if(!valid())return;
      const items=more?[...state.items,...doc.items.filter(i=>!state.items.some(x=>x.id===i.id))]:doc.items;
      state={...state,items,cursor:doc.next_cursor,source:doc.source,ready:true,loading:false,
        seenThrough:more?state.seenThrough:doc.seen_through,unread:more?state.unread:doc.unread_count};
      renderList();
      if(!more&&doc.source==='feed'&&!seenSent&&doc.items.length&&doc.unread_count>0){seenSent=true;
        const newest=doc.items.reduce((a,b)=>clock(b.observed_at)>clock(a.observed_at)?b:a);
        api.alertFeed.seen(newest.observed_at,{signal:ctl.signal,silent402:true}).then(()=>{if(valid())markAlertsSeen();}).catch(()=>{});}
    }catch(error){if(!valid())return;state={...state,loading:false,error,ready:true};renderList();}
  }
  function dispose(){if(!alive)return;alive=false;ctl.abort();try{customDispose?.();}catch{}}
  params.signal?.addEventListener('abort',dispose,{once:true});
  renderTabs();renderFilters();
  if(tab==='custom')await selectTab('custom');
  await load(false);
  return dispose;
}
