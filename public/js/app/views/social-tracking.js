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
    (scope!=='hot' || r.overheated) && (scope!=='watchlist' || tickers.has(r.ticker)));
}

function fact(label,value) { return el('div.social-fact',el('dt',s('social.'+label)),el('dd',value)); }
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
  card.append(el('div.social-index',el('strong',score===null?'—':String(score)),el('span',s('social.index_scale')),
    score===null?null:el('meter',{min:0,max:100,value:score,'aria-label':s('social.index')})),
    el('dl.social-metrics',fact('mentions',num(row.mentions,0)),fact('change',row.change_pct==null?s('social.no_base'):pct(row.change_pct,0)),
      fact('rank','#'+row.rank)),
    el('p.social-meaning',s('social.meaning_'+state)));
  const details=el('details.social-evidence',el('summary',s('social.details')),
    el('dl.social-metrics',fact('previous',num(row.mentions_previous,0)),fact('upvotes',num(row.upvotes,0)),fact('rank_previous',row.rank_previous==null?'—':'#'+row.rank_previous)),
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
  const degen=route.view==='degen', standalone=['degen','vibe'].includes(route.view);
  const ctl=new AbortController(), epoch=store.epoch();let alive=true,doc=null,watchState='unloaded',watches=[],expiry=null;
  let viewQuery=route.query?.get('ticker')||'',viewScope=['all','hot','watchlist'].includes(route.query?.get('scope'))?route.query.get('scope'):(degen?'hot':'all');
  function syncFilterUrl(){
    const params=new URLSearchParams(standalone?{}:{board:'social'});
    if(viewQuery.trim())params.set('ticker',viewQuery.trim());
    if(viewScope!=='all'||degen)params.set('scope',viewScope);
    const hash=(standalone?'#/'+route.view:'#/boards')+(params.size?'?'+params:'');
    history.replaceState(null,'',location.pathname+location.search+hash);
    for(const a of document.querySelectorAll('[data-lang-toggle]')){
      const u=new URL(a.href,location.href);u.hash=hash;a.href=u.href;
    }
  }
  const cleanup=()=>{alive=false;clearTimeout(expiry);ctl.abort();};
  route.signal?.addEventListener('abort',cleanup,{once:true});
  const valid=()=>alive&&!ctl.signal.aborted&&epoch===store.epoch();
  const page=el('section.radar-workspace.social-workspace');root.append(page);
  page.append(el('header.radar-heading',el('div',el('p.social-eyebrow',s('boards.h1')+' / '+s('boards.t_social')),
    el('h1',s(degen?'degen.title':'social.title')),el('p.muted',s(degen?'degen.description':'social.description'))),
    el('a.btn.btn-ghost.btn-sm',{href:degen?'#/vibe':'#/degen'},s(degen?'nav.vibe':'nav.degen'))));
  if(degen)page.append(el('p.data-notice',s('degen.limit')));
  page.append(el('div.social-platforms',el('span',s('social.reddit_source')),el('span.muted',s('social.x_unavailable'))));
  const method=el('details.social-method',el('summary',s('social.method')),
    el('p',s('social.formula')),el('p',s('social.threshold')),el('p',s('social.limits')),
    el('p.small.muted',s('social.no_forecast')),source('https://apewisdom.io/methodology/','social.provider_method'));
  page.append(method);
  if(!store.isPro()) {
    page.append(el('section.card.social-empty',el('h2',s('social.lock_title')),el('p',s('social.lock_note')),
      el('a.btn.btn-primary',{href:'#/billing'},s('radar.access_upgrade'))));
    return cleanup;
  }
  const content=el('div');page.append(content);
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
    clear(content);
    const stale=doc.status==='stale';
    if(doc.status==='unavailable') {
      content.append(el('section.card.social-empty',el('h2',s('social.unavailable')),el('p',s('social.unavailable_note')),
        doc.last_attempt?el('p.small.muted',s('social.attempted',{date:dateTime(doc.last_attempt.attempted_at)})):null,
        el('button.btn.btn-ghost',{type:'button',onclick:load},s('common.retry'))));return;
    }
    method.querySelector('.social-coverage')?.remove();
    method.append(el('p.small.muted.social-coverage',s('social.coverage',{n:doc.items.length,total:doc.coverage?.provider_count??'—'})));
    content.append(el('p.small.muted',s('social.collected',{date:dateTime(doc.collected_at)})));
    if(stale)content.append(el('p.social-stale',{role:'status'},s('social.stale')));
    content.append(el('div.social-summary',el('strong',s(stale?'social.saved_count':'social.hot_count',{n:doc.items.filter(r=>r.overheated).length})),
        el('span.muted',s('social.window'))));
    const query=el('input.input',{type:'search','aria-label':s('social.search'),placeholder:s('social.search')});
    query.value=viewQuery;
    const scope=el('select.input',{'aria-label':s('social.filter')},...['all','hot','watchlist'].map(v=>el('option',{value:v},s('social.filter_'+v))));
    scope.value=viewScope;
    const list=el('div.social-grid'),count=el('p.small.muted',{role:'status','aria-live':'polite'});
    const update=()=>{
      viewQuery=query.value;viewScope=scope.value;
      clear(list);
      if(scope.value==='watchlist' && watchState!=='ready') {
        count.textContent=s(watchState==='error'?'social.watchlist_error':'common.loading');
        if(watchState==='error')list.append(el('button.btn.btn-ghost',{type:'button',onclick:loadWatches},s('common.retry')));
        return;
      }
      const rows=filterSocial(doc.items,query.value,scope.value,watches);
      count.textContent=s('social.results',{n:rows.length});
      for(const row of rows)list.append(socialCard(row,{stale,onHistory:loadHistory}));
      if(!rows.length)list.append(el('div.social-empty',el('h2',s('social.no_match')),el('p.muted',s('social.no_match_note'))));
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
      if(valid())update();
    }
    query.addEventListener('input',()=>{update();syncFilterUrl();});scope.addEventListener('change',()=>{
      viewScope=scope.value;syncFilterUrl();
      if(scope.value==='watchlist' && watchState==='unloaded')loadWatches();else update();
    });
    content.append(el('div.social-filters',el('label',el('span',s('social.search')),query),el('label',el('span',s('social.filter')),scope)),count,list);
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
