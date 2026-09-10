// Brief delivery reads the same reviewed stock version as Today and Watchlist.
import {el,clear,spinner} from '../ui.js';
import {s} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {reading,stockHref,researchError} from '../stock-reading.js';

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
  async function load(){
    const id=++request;clear(host).append(spinner());
    try{
      const response=await api.get('/me/stock-research',{signal:controller.signal});
      if(!valid(id))return;
      if(!Array.isArray(response?.items))throw new api.ApiError(502,{error:'invalid_research_response'});
      clear(host);
      if(response.watchlist_count===0)host.append(el('p',s('stockbrief.empty')),
        el('a.btn.btn-primary',{href:'#/watchlist'},s('briefing.edit_watchlist')));
      else if(!response.items.length)host.append(el('p.muted',s('focus.analysis_waiting')));
      for(const item of response.items){
        if(!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(item.ticker||''))continue;
        host.append(el('article.card',el('h2',el('a',{href:stockHref(item.ticker)},item.ticker)),
          reading(item),el('a.stock-open',{href:stockHref(item.ticker)},s('focus.open_stock')+' →')));
      }
    }catch(error){if(valid(id))clear(host).append(researchError(error,load));}
  }
  root.append(el('details.focus-tools',el('summary',s('focus.deeper_research')),
    el('a.btn.btn-ghost',{href:'#/briefing?archive=1'},s('focus.past_stock_briefs'))));
  const off=store.subscribe('watchlist',load);
  const cleanup=()=>{disposed=true;request++;controller.abort();off();};
  route.signal?.addEventListener('abort',cleanup,{once:true});
  if(route.signal?.aborted)cleanup();else await load();
  return cleanup;
}
