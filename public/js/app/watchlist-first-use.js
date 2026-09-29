// A bounded preview of the same saved ranking as Explore. It never adds membership,
// fetches candidate quotes, or turns discussion attention into a directional view.
import {el,clear,spinner} from './ui.js';
import {s,LANG} from './strings.js';
import * as api from './api.js';
import {discoveryRows,discoveryDate} from './explore-discovery.js';

export function watchlistStarters({signal,current=()=>true}={}){
  const controller=new AbortController();
  let disposed=false,busy=false;
  const valid=()=>!disposed&&!signal?.aborted&&current();
  const date=el('p.small.muted.watch-starters-date',{hidden:true});
  const status=el('div.watch-starters-status',{'aria-live':'polite'});
  const list=el('div.watch-starters-list');
  const node=el('section.watch-first-use',{'aria-label':s('explore.discussion_title')},
    el('header.watch-starters-heading',el('h2',s('explore.discussion_title')),
      el('a',{href:'#/explore'},s('watch.first_use_more'))),date,
    el('p.small.muted.watch-starters-basis',s('explore.attention_only')),status,list);
  async function load(){
    if(!valid()||busy)return;
    busy=true;clear(status).append(spinner());
    try{
      const doc=await api.get('/radar/social.json',{signal:controller.signal,silent402:true,observe:false});
      if(!valid())return;
      if(!doc||!Array.isArray(doc.items)||!['ready','stale','pending','unavailable','empty'].includes(doc.status))throw new api.ApiError(502,{error:'invalid_discovery_response'});
      clear(status);clear(list);
      const dated=typeof doc.collected_at==='string'&&Number.isFinite(Date.parse(doc.collected_at));
      date.hidden=!dated;date.textContent=dated?s('explore.discussion_date',{date:discoveryDate(doc.collected_at)}):'';
      const rows=discoveryRows(doc,LANG).slice(0,4);
      if(doc.status==='stale')status.append(el('p.small.muted',s('explore.discussion_stale')));
      for(const row of rows){
        const href='#/stock/'+encodeURIComponent(row.ticker);
        const count=Number.isFinite(row.mentions)?s('focus.discover_mentions',{n:new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US').format(row.mentions)}):s('explore.mentions_unknown');
        list.append(el('article.watch-starter',{'data-ticker':row.ticker},
          el('a.watch-starter-open',{href,'data-reading-key':'watch-starter:'+row.ticker,
            'aria-label':s('explore.research_stock',{ticker:row.ticker})},
            el('span.watch-starter-identity',el('strong',row.ticker),row.company&&row.company!==row.ticker?el('span',row.company):null),
            el('span.small.muted.watch-starter-count',count),
            el('span.watch-starter-action',s('focus.open_stock'),' →')),
          el('a.watch-starter-map',{href:href+'?tab=evidence','aria-label':s('watch.open_stock_map',{ticker:row.ticker})},s('watch.open_map'))));
      }
      if(!rows.length)status.append(el('p.small.muted',s(doc.status==='pending'?'watch.first_use_pending':doc.status==='unavailable'?'explore.discussion_unavailable':'explore.discussion_empty')));
      if(['pending','unavailable'].includes(doc.status))status.append(retry());
    }catch(error){
      if(!valid())return;
      clear(list);date.hidden=true;date.textContent='';
      clear(status).append(el('p.small.muted',s('explore.discussion_unavailable')),retry());
    }finally{busy=false;}
  }
  const retry=()=>el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:load},s('common.retry'));
  function dispose(){if(disposed)return;disposed=true;controller.abort();signal?.removeEventListener('abort',dispose);}
  signal?.addEventListener('abort',dispose,{once:true});
  load();
  return {node,dispose};
}
