// Brief delivery reads the same reviewed stock version as Today and Watchlist.
import {el,clear,spinner} from '../ui.js';
import {s} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {reading,stockHref,researchError,replaceReading,syncSourceDialog} from '../stock-reading.js';

export async function mount(root,route={}){
  const query=route.query instanceof URLSearchParams?route.query:new URLSearchParams(route.query||'');
  const ticker=String(query.get('ticker')||'').toUpperCase();
  if(/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker)){
    const stock=await import('./stock.js');
    return stock.mount(root,{...route,query,ticker});
  }
  const controller=new AbortController(),epoch=store.epoch();let disposed=false,request=0;
  root.append(el('div.view-head',el('h1',s('stockbrief.title')),
    el('a.btn.btn-ghost',{href:'#/today'},s('nav.today'))),el('p.view-intro',s('focus.shared_briefs_intro')));
  const host=el('div.stock-briefs');root.append(host);
  const valid=id=>!disposed&&!controller.signal.aborted&&epoch===store.epoch()&&id===request;
  let shown=[];
  function renderResponse(response){
    if(!Array.isArray(response?.items))throw new api.ApiError(502,{error:'invalid_research_response'});
    const next=response.items.filter(item=>/^[A-Z][A-Z0-9.\-]{0,9}$/.test(item.ticker||''));
    for(const ticker of new Set([...shown,...next.map(item=>item.ticker)]))
      syncSourceDialog(ticker,next.find(item=>item.ticker===ticker)?.sources||[]);
    shown=next.map(item=>item.ticker);
    const content=[];
    if(response.watchlist_count===0)content.push(el('p',s('stockbrief.empty')),
      el('a.btn.btn-primary',{href:'#/watchlist'},s('briefing.edit_watchlist')));
    else if(!next.length)content.push(el('p.muted',s('focus.analysis_waiting')));
    else for(const item of next)content.push(el('article.card',{'data-reading-anchor':item.ticker},
      el('h2',el('a',{href:stockHref(item.ticker),'data-reading-key':item.ticker+':name'},item.ticker)),reading(item),
      el('a.stock-open',{href:stockHref(item.ticker),'data-reading-key':item.ticker+':open'},s('focus.open_stock')+' →')));
    replaceReading(host,...content);
  }
  async function load(){
    const id=++request;if(!shown.length)clear(host).append(spinner());
    try{
      const response=await api.get('/me/stock-research',{signal:controller.signal});
      if(!valid(id))return;
      renderResponse(response);
    }catch(error){if(valid(id)){
      if(!shown.length||[401,402,403].includes(error.status))clear(host);
      host.prepend(researchError(error,load));
    }}
  }
  root.append(el('details.focus-tools',el('summary',s('focus.deeper_research')),
    el('a.btn.btn-ghost',{href:'#/briefing?archive=1'},s('focus.past_stock_briefs'))));
  const off=store.subscribe('watchlist',load);
  const update=event=>{
    if(!valid(request)||event.detail?.path!=='/me/stock-research')return;
    try{renderResponse(event.detail.value);event.detail.accepted=true;}catch{}
  };
  root.addEventListener('ducky:shared-read',update);
  const cleanup=()=>{disposed=true;request++;controller.abort();off();root.removeEventListener('ducky:shared-read',update);};
  route.signal?.addEventListener('abort',cleanup,{once:true});
  if(route.signal?.aborted)cleanup();else{
    const saved=api.peek('/me/stock-research');if(saved)renderResponse(saved);
    await load();
  }
  return cleanup;
}
