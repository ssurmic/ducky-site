import {el,clear,spinner,toast} from '../ui.js';
import {s} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {analysisPanel,detail} from './evidence.js';
import {pick,compactPrice,dayWindow,localTime,researchError} from '../stock-reading.js';
import {closingChart} from '../stock-price-chart.js';
import {changeCard} from './today.js';

export async function mount(root,{ticker,signal,query=new URLSearchParams()}={}){
  if(!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker||'')){location.hash='#/explore';return;}
  let disposed=false,followingBusy=false;
  const epoch=store.epoch(),current=()=>!disposed&&!signal?.aborted&&store.epoch()===epoch;
  const shell=el('article.focus-stock'),body=el('div'),chart=el('section.focus-chart',el('h2',s('focus.price_history')),spinner());
  const from=['today','explore'].includes(query.get('from'))?query.get('from'):'watchlist';
  const company=el('p.small.muted',{hidden:true});
  const head=el('header.focus-heading',el('div',el('a.small.muted',{href:'#/'+from},'← '+s('nav.'+from)),el('h1',ticker),company));
  const follow=el('button.btn.btn-ghost',{type:'button'});
  const sync=()=>{const watched=(store.get('watchlist')||[]).includes(ticker);follow.textContent=s(watched?'focus.unfollow_stock':'focus.follow_stock');follow.disabled=followingBusy;};
  sync();follow.addEventListener('click',async()=>{
    if(followingBusy||!current())return;followingBusy=true;sync();
    const watched=(store.get('watchlist')||[]).includes(ticker);
    try{await (watched?api.watchlist.remove(ticker):api.watchlist.add(ticker));if(!current())return;
      store.set('watchlist',watched?(store.get('watchlist')||[]).filter(t=>t!==ticker):[...new Set([...(store.get('watchlist')||[]),ticker])]);}
    catch(error){if(current()){toast(s('common.error',{msg:error.message}),'err');follow.disabled=false;}}
    finally{followingBusy=false;if(current())sync();}
  });
  head.append(follow);shell.append(head,body,chart);root.append(shell);
  const off=store.subscribe('watchlist',sync);
  const details=el('details.focus-history',el('summary',s('focus.research_history'))),historyBody=el('div');details.append(historyBody);shell.append(details);
  let historyCursor=null,historyLoaded=false,historyLoading=false;
  async function loadHistory(){
    if(historyLoading)return;historyLoading=true;
    const params=new URLSearchParams({...dayWindow(new Date(),365),scope:'all',ticker,limit:'10',...(historyCursor?{before:historyCursor}:{})});
    const progress=spinner();historyBody.append(progress);
    try{
      const response=await api.get('/me/research-changes?'+params,{signal});
      if(!current())return;
      if(!Array.isArray(response?.items))throw new api.ApiError(502,{error:'invalid_research_response'});
      progress.remove();historyLoaded=true;historyCursor=response.next_cursor;
      if(!response.items?.length)historyBody.append(el('p.muted',s('focus.history_empty')));
      for(const item of response.items||[])historyBody.append(changeCard(item,{from}));
      if(historyCursor){const more=el('button.btn.btn-ghost',{type:'button',onclick:()=>{more.remove();loadHistory();}},s('focus.more_changes'));historyBody.append(more);}
    }catch(error){if(current()){progress.remove();historyBody.append(researchError(error,loadHistory));}}
    finally{historyLoading=false;}
  }
  details.addEventListener('toggle',()=>{if(details.open&&!historyLoaded)loadHistory();});
  shell.append(el('details.focus-tools',el('summary',s('focus.deeper_research')),el('div.focus-tool-links',
    ...[['briefing?archive=1&ticker='+ticker,'past_stock_briefs'],['evidence/'+ticker,'evidence'],['chart/'+ticker,'full_chart'],['research/'+ticker,'track_record'],['calendar?ticker='+ticker,'upcoming'],['alerts?ticker='+ticker,'set_alert']].map(([route,key])=>
      el('a.btn.btn-ghost',{href:'#/'+route},s('focus.'+key))))));
  async function loadEvidence(){
    clear(body);body.append(spinner());
    try{
      const result=await api.get('/stock-research/'+encodeURIComponent(ticker),{signal});
      if(!current())return;
      if(result?.ticker!==ticker||!Object.hasOwn(result,'evidence')||(result.evidence&&!Array.isArray(result.evidence.nodes)))throw new api.ApiError(502,{error:'invalid_research_response'});
      company.textContent=typeof result.price?.company==='string'?result.price.company:'';company.hidden=!company.textContent||company.textContent===ticker;
      clear(body);const doc=result.evidence||{ticker,nodes:[],analysis_status:'pending'};
      body.append(compactPrice(result.price),analysisPanel(doc,{formatTime:localTime}));
      const available=(doc.nodes||[]).filter(n=>n.intent!=='mention');
      const direct=available.filter(n=>n.priority==='direct'),important=direct.length?direct:available;
      const sources=el('section.stock-key-evidence',el('h2',s('focus.key_sources')));
      // Always retain the first opposed record among the three visible sources.
      const selected=important.slice(0,3),opposed=important.find(n=>n.stance==='counter');
      if(opposed&&!selected.includes(opposed))selected.splice(Math.min(2,selected.length),1,opposed);
      if(!selected.length)sources.append(el('p.muted',s('focus.no_research')));
      for(const node of selected){
        const authors=node.kind==='creator'?[...new Set((node.evidence||[]).map(e=>e.author).filter(Boolean))].join(' · '):'';
        const kind=s(node.stance==='counter'?(node.kind==='creator'?'focus.counter_view':'focus.counter_record'):node.kind==='creator'?'focus.creator_view':'focus.source_record');
        sources.append(el('button.stock-source-card',{type:'button',onclick:()=>detail(node)},
          el('span.small.muted',[authors,kind,localTime(node.published_at)].filter(Boolean).join(' · ')),el('strong',pick(node.title)),el('span.small',s('focus.read_source')+' →')));
      }
      body.append(sources);
      const requested=query.get('source'),node=(doc.nodes||[]).find(n=>n.id===requested);
      if(node)detail(node);
    }catch(error){if(current()){clear(body);body.append(researchError(error,loadEvidence));}}
  }
  const priceTask=api.get('/bars/'+encodeURIComponent(ticker)+'?period=6mo',{signal}).then(response=>{
    if(!current())return;clear(chart);
    chart.append(el('h2',s('focus.price_history')));
    if(api.isAccepted(response)){chart.append(el('p.muted',s('focus.chart_pending')));return;}
    if(!Array.isArray(response)&&!Array.isArray(response?.bars)&&!Array.isArray(response?.items))throw new api.ApiError(502,{error:'invalid_price_response'});
    chart.append(closingChart(response));
  }).catch(error=>{if(current()){clear(chart);chart.append(el('h2',s('focus.price_history')),el('p.muted',s('focus.chart_unavailable')));}});
  await Promise.all([loadEvidence(),priceTask]);
  return()=>{disposed=true;off();};
}
