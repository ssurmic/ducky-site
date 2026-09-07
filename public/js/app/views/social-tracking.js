import { el, clear, num, pct } from '../ui.js';
import { s } from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import { dateTime } from './creator-research.js';
import { socialHistoryChart } from './social-history-chart.js';

export function filterSocial(items, query='', scope='all', watches=[]) {
  const q=query.trim().replace(/^\$/,'').toLowerCase();
  const tickers=new Set(watches.map(r=>String(r.ticker||r).toUpperCase()));
  return items.filter(r=>(!q || [r.ticker,r.company,r.id].join(' ').toLowerCase().includes(q)) &&
    (scope!=='hot' || r.overheated) && (scope!=='elevated' || r.state==='elevated') &&
    (scope!=='watchlist' || tickers.has(r.ticker)));
}

export function rankSocial(items) {
  return [...items].sort((a,b)=>(b.mentions??-1)-(a.mentions??-1)||(a.rank??Infinity)-(b.rank??Infinity)||a.ticker.localeCompare(b.ticker));
}

function leaderboard(items,stale,onSelect) {
  const rows=rankSocial(items).slice(0,5);
  if(!rows.length)return null;
  const list=el('ol');
  rows.forEach((row,i)=>{
    const reading=el('span.social-rank-reading',el('strong',num(row.mentions,0)),
      el('small',s(stale?'social.saved_state':'social.state_'+row.state)));
    list.append(el('li',el('button.social-rank-row',{type:'button',onclick:()=>onSelect(row.ticker)},
      el('span.social-rank-number',String(i+1)),el('span',el('strong','$'+row.ticker),el('small',row.company)),reading)));
  });
  return el('section.social-leaderboard',{'aria-label':s('social.ranking')},
    el('h2',s(stale?'social.saved_ranking':'social.ranking')),el('p.small.muted',s('social.ranking_note')),list);
}

function fact(label,value) { return el('div.social-fact',el('dt',s('social.'+label)),el('dd',value)); }
export function xSourceSection(data) {
  if(!data||data.status==='not_connected')return null;
  const panel=el('section.social-leaderboard.social-x',el('h2','X / Twitter'),el('p.small.muted',s('social.x_scope')));
  if(!data.items?.length){panel.append(el('p',s('social.x_awaiting_data')));return panel;}
  for(const row of data.items){
    const observed=Date.parse(row.observed_at),end=Date.parse(row.window_end),now=Date.now();
    const fresh=row.status==='ready'&&[observed,end].every(t=>Number.isFinite(t)&&now>=t&&now-t<=26*3600000);
    panel.append(el('div.social-x-row',el('a',{href:'#/briefing?ticker='+encodeURIComponent(row.ticker)},'$'+row.ticker),
      el('strong',s('social.x_posts',{n:num(row.posts,0)})),el('span.small.muted',s(fresh?'social.x_ready':row.status==='unavailable'?'social.x_awaiting_data':'social.x_stale')),
      row.observed_at?el('small.muted',s('social.observed_short',{date:dateTime(row.observed_at)})):null,
      row.window_end?el('small.muted',s('social.x_window',{date:dateTime(row.window_end)})):null));
  }
  return panel;
}
function source(url,label) {
  try { const u=new URL(url);if(u.protocol==='https:')return el('a',{href:u.href,target:'_blank',rel:'noopener noreferrer'},s(label)+' ↗'); } catch {}
  return null;
}

export function socialCard(row,{stale=false,onHistory}={}) {
  const state=['normal','elevated','overheated','insufficient'].includes(row.state)?row.state:'insufficient';
  const score=Number.isFinite(row.index)?row.index:null;
  const card=el('article.social-card',{'data-state':stale?'stale':state,'data-record-id':row.id},
    el('div.social-card-heading',el('div',el('a.social-ticker',{href:'#/chart/'+encodeURIComponent(row.ticker)},'$'+row.ticker),
      el('span.social-company',row.company)),el('span.social-state',s(stale?'social.saved_state':'social.state_'+state))));
  card.append(el('p.vibe-action',s('social.action_'+(stale?'stale':state))),
    el('dl.social-metrics',fact('mentions',num(row.mentions,0)),fact('change',row.change_pct==null?s('social.no_base'):pct(row.change_pct,0)),
      fact('rsi',row.technical?.status==='current'?num(row.technical.rsi_d,1):'—')),
    el('a.btn.btn-ghost.btn-sm',{href:'#/briefing?ticker='+encodeURIComponent(row.ticker)},s('stockbrief.open')));
  const details=el('details.social-evidence',el('summary',s('social.details')),
    el('div.social-index',el('strong',score===null?'—':String(score)),el('span',s('social.index_scale')),
      score===null?null:el('meter',{min:0,max:100,value:score,'aria-label':s('social.index')})),
    el('p.social-meaning',s('social.meaning_'+state)),
    el('p.small.muted',s('social.technical_context',{rsi:row.technical?.status==='current'?num(row.technical.rsi_d,1):'—',
      ratio:row.technical?.status==='current'?num(row.technical.iv_hv,2):'—',date:dateTime(row.technical?.observed_at)})),
    el('dl.social-metrics',fact('previous',num(row.mentions_previous,0)),fact('upvotes',num(row.upvotes,0)),fact('rank_previous',row.rank_previous==null?'—':'#'+row.rank_previous)),
    el('p.small.muted',s('social.rank')+': #'+row.rank),
    el('p.small.muted',s('social.components',{volume:row.components?.volume??'—',growth:row.components?.growth??'—',rank:row.components?.rank??'—'})),
    el('p.small',s('social.record_id')),el('code.social-record-id',row.id),
    el('p.small.muted',s('social.collected',{date:dateTime(row.collected_at)})),
    el('p.small.muted',s('social.post_id_missing')),el('p.small.muted',s('social.identity')),
    el('div.social-links',source(row.source_url,'social.source'),el('a',{href:'#/chart/'+encodeURIComponent(row.ticker)},s('radar.chart')+' ↗')));
  if(onHistory) {
    const host=el('div.social-history');
    const button=el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>onHistory(row.ticker,host,button)},s('social.history'));
    details.append(button,host);
  }
  card.append(details);return card;
}

export async function mountSocial(root,route={}) {
  const standalone=['degen','vibe'].includes(route.view);
  const ctl=new AbortController(), epoch=store.epoch();let alive=true,doc=null,watchState='unloaded',watches=[],expiry=null,xExpiry=null,renderVersion=0;
  let viewQuery=route.query?.get('ticker')||'',viewScope=['all','hot','elevated','watchlist'].includes(route.query?.get('scope'))?route.query.get('scope'):'all';
  function syncFilterUrl(){
    const params=new URLSearchParams(standalone?{}:{board:'social'});
    if(viewQuery.trim())params.set('ticker',viewQuery.trim());
    if(viewScope!=='all')params.set('scope',viewScope);
    const hash=(standalone?'#/vibe':'#/boards')+(params.size?'?'+params:'');
    history.replaceState(null,'',location.pathname+location.search+hash);
    for(const a of document.querySelectorAll('[data-lang-toggle]')){
      const u=new URL(a.href,location.href);u.hash=hash;a.href=u.href;
    }
  }
  const cleanup=()=>{alive=false;clearTimeout(expiry);clearTimeout(xExpiry);ctl.abort();};
  route.signal?.addEventListener('abort',cleanup,{once:true});
  const valid=()=>alive&&!ctl.signal.aborted&&epoch===store.epoch();
  const page=el('section.radar-workspace.social-workspace');root.append(page);
  page.append(el('header.radar-heading',el('div',el('p.social-eyebrow',s('boards.h1')+' / '+s('boards.t_social')),
    el('h1',s('social.title')),el('p.muted',s('social.description')))));
  const method=el('details.social-method',el('summary',s('social.method')),
    el('div.social-platforms',el('span',s('social.reddit_source')),el('span.muted.social-x-status',s('social.x_unavailable'))),
    el('p',s('social.formula')),el('p',s('social.threshold')),el('p',s('social.limits')),
    el('p.small.muted',s('social.no_forecast')),source('https://apewisdom.io/methodology/','social.provider_method'));
  page.append(method);
  if(!store.isPro()) {
    page.append(el('section.card.social-empty',el('h2',s('social.lock_title')),el('p',s('social.lock_note')),
      el('a.btn.btn-primary',{href:'#/billing'},s('radar.access_upgrade'))));
    return cleanup;
  }
  const content=el('div');page.insertBefore(content,method);
  async function load() {
    clear(content);content.append(el('p',{role:'status'},s('common.loading')));
    try {
      doc=await api.get('/radar/social.json',{signal:ctl.signal,silent402:true});
      if(!valid())return;
      if(!Array.isArray(doc?.items)||!['ready','stale','unavailable'].includes(doc.status))throw new Error('invalid_response');
      clearTimeout(expiry);
      if(doc.status==='ready' && doc.stale_after_seconds && doc.collected_at) {
        const remaining=Date.parse(doc.collected_at)+doc.stale_after_seconds*1000-Date.now();
        if(remaining<=0)doc.status='stale';
        else if(Number.isFinite(remaining))expiry=setTimeout(()=>{if(valid()){doc.status='stale';render();}},remaining);
      }
      render();
    } catch(e) {
      if(!valid())return;clear(content);
      content.append(el('section.card.social-empty',el('h2',s(e.status===402?'social.lock_title':'social.load_error')),
        e.status===402?el('a.btn.btn-primary',{href:'#/billing'},s('radar.access_upgrade')):
          el('button.btn.btn-ghost',{type:'button',onclick:load},s('common.retry'))));
    }
  }
  function render() {
    const version=++renderVersion;
    clear(content);
    const stale=doc.status==='stale';
    clearTimeout(xExpiry);
    const xPanel=xSourceSection(doc.x);
    method.querySelector('.social-x-status').textContent=s(xPanel?'social.x_available':'social.x_unavailable');
    if(xPanel){
      content.append(xPanel);
      const deadlines=(doc.x.items||[]).filter(r=>r.status==='ready').flatMap(r=>[Date.parse(r.observed_at),Date.parse(r.window_end)])
        .map(t=>t+26*3600000-Date.now()+1).filter(t=>Number.isFinite(t)&&t>0);
      if(deadlines.length)xExpiry=setTimeout(()=>{if(valid())render();},Math.min(...deadlines));
    }
    if(doc.status==='unavailable') {
      content.append(el('section.card.social-empty',el('h2',s('social.unavailable')),el('p',s('social.unavailable_note')),
        doc.last_attempt?el('p.small.muted',s('social.attempted',{date:dateTime(doc.last_attempt.attempted_at)})):null,
        el('button.btn.btn-ghost',{type:'button',onclick:load},s('common.retry'))));return;
    }
    method.querySelector('.social-coverage')?.remove();
    method.append(el('p.small.muted.social-coverage',s('social.coverage',{n:doc.items.length,total:doc.coverage?.provider_count??'—'})));
    method.querySelector('.social-observed')?.remove();
    method.append(el('p.small.muted.social-observed',s('social.collected',{date:dateTime(doc.collected_at)})));
    method.querySelector('.social-universe')?.remove();
    if(doc.universe)method.append(el('p.small.muted.social-universe',s('social.stock_coverage',{
      n:doc.universe.eligible_rows,total:doc.universe.source_rows,funds:doc.universe.excluded?.fund??'—',
      other:doc.universe.excluded?.other_security??'—',unknown:doc.universe.excluded?.unverified??'—'})));
    if(stale)content.append(el('p.social-stale',{role:'status'},s('social.stale')));
    const hot=doc.items.filter(r=>r.overheated), elevated=doc.items.filter(r=>r.state==='elevated');
    content.append(el('div.social-summary',el('strong',s(stale?'social.saved_count':hot.length?'social.hot_count':'social.no_hot',{n:hot.length})),
        el('span.muted',s('social.observed_short',{date:dateTime(doc.collected_at)}))));
    if(hot.length)content.append(el('div.social-hot-list',...hot.map(row=>el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>select(row.ticker,'all')},'$'+row.ticker+' · '+s(stale?'social.saved_state':'social.state_overheated')))));
    if(!stale&&elevated.length)content.append(el('p.small.muted',s('social.elevated_count',{n:elevated.length})));
    content.append(leaderboard(doc.items,stale,ticker=>select(ticker,'all'))||el('p.small.muted',s('social.no_stocks')));
    const query=el('input.input',{type:'search','aria-label':s('social.search'),placeholder:s('social.search')});
    query.value=viewQuery;
    const scope=el('select.input',{'aria-label':s('social.filter')},...['all','hot','elevated','watchlist'].map(v=>el('option',{value:v},s('social.filter_'+v))));
    scope.value=viewScope;
    const list=el('div.social-grid'),count=el('p.small.muted',{role:'status','aria-live':'polite'});
    let visibleLimit=10;
    const more=el('button.btn.btn-ghost',{type:'button',onclick:()=>{visibleLimit+=10;update();}},s('creators.load_more'));
    function select(ticker,filter) {query.value=ticker;scope.value=filter;visibleLimit=10;update();syncFilterUrl();query.focus();}
    const update=()=>{
      if(version!==renderVersion||!valid())return;
      viewQuery=query.value;viewScope=scope.value;
      clear(list);more.hidden=true;
      if(scope.value==='watchlist' && watchState!=='ready') {
        count.textContent=s(watchState==='error'?'social.watchlist_error':'common.loading');
        if(watchState==='error')list.append(el('button.btn.btn-ghost',{type:'button',onclick:loadWatches},s('common.retry')));
        return;
      }
      const rows=rankSocial(filterSocial(doc.items,query.value,scope.value,watches));
      count.textContent=s('social.results',{n:rows.length});
      for(const row of rows.slice(0,visibleLimit))list.append(socialCard(row,{stale,onHistory:loadHistory}));
      more.hidden=rows.length<=visibleLimit;
      if(!rows.length)list.append(el('div.social-empty',el('h2',s(scope.value==='hot'&&!query.value.trim()?'social.no_hot':'social.no_match')),
        el('p.muted',s('social.no_match_note')),el('button.btn.btn-ghost',{type:'button',onclick:()=>select('','all')},s('social.show_all'))));
    };
    async function loadWatches() {
      if(watchState==='loading')return;
      watchState='loading';update();
      try {
        const result=await api.get('/watchlist',{signal:ctl.signal});
        if(!valid())return;
        const values=Array.isArray(result)?result:(result.tickers||result.items);
        if(!Array.isArray(values))throw new Error('invalid_watchlist');
        watches=values;watchState='ready';
      } catch {if(!valid())return;watchState='error';}
      if(valid()){if(version===renderVersion)update();else render();}
    }
    query.addEventListener('input',()=>{visibleLimit=10;update();syncFilterUrl();});scope.addEventListener('change',()=>{
      visibleLimit=10;
      viewScope=scope.value;syncFilterUrl();
      if(scope.value==='watchlist' && watchState==='unloaded')loadWatches();else update();
    });
    content.append(el('div.social-filters',el('label',el('span',s('social.search')),query),el('label',el('span',s('social.filter')),scope)),count,list,more);
    update();
    if(viewScope==='watchlist' && watchState==='unloaded')loadWatches();
  }
  async function loadHistory(ticker,host,button) {
    button.disabled=true;
    try {
      const params=new URLSearchParams({ticker,limit:'10'});if(host.dataset.cursor)params.set('before',host.dataset.cursor);
      const data=await api.get('/radar/social/history.json?'+params,{signal:ctl.signal,silent402:true});
      if(!valid() || !host.isConnected)return;
      if(!Array.isArray(data?.items))throw new Error('invalid_response');
      host.querySelector('.social-history-error')?.remove();
      if(!host.childElementCount)host.append(el('p.small.muted',s('social.history_note')));
      host._historyRows=[...(host._historyRows||[]),...data.items];
      host.querySelector('.social-history-plot')?.remove();host.prepend(socialHistoryChart(host._historyRows));
      for(const row of data.items)host.append(el('div.social-history-row',el('time',{datetime:row.collected_at},dateTime(row.collected_at)),
        el('strong',(row.index??'—')+' / 100'),el('span',s('social.state_'+row.state)),
        el('span',num(row.mentions,0)+' · '+pct(row.change_pct,0)),el('code.social-record-id',row.id),
        el('small.muted',row.version||'')));
      host.dataset.cursor=data.next_cursor||'';button.hidden=!data.next_cursor;button.textContent=s('creators.load_more');
    } catch {
      if(valid()) { host.querySelector('.social-history-error')?.remove();host.append(el('p.social-history-error',s('social.history_error'))); }
    } finally {button.disabled=false;}
  }
  await load();return cleanup;
}
