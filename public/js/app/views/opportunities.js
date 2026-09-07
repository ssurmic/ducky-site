import { el, clear, spinner, num, pct, errorBox } from '../ui.js';
import { s, LANG } from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import { defaults, mountScreen } from './signal-screen.js';
import { dateTime } from './creator-research.js';

export function selectCandidates(items,scope,watches,query='') {
  const watched=new Set(watches.map(x=>String(x.ticker||x).toUpperCase()));
  const q=query.trim().toLowerCase();
  return items.filter(row=>(scope==='all'||(scope==='watchlist')===watched.has(row.ticker)) &&
    (!q||[row.ticker,row.company].join(' ').toLowerCase().includes(q)));
}
const link=(href,key)=>el('a.btn.btn-ghost.btn-sm',{href},s(key));
export function candidateCard(row,watches=[]) {
  const tech=row.technical||{},rel=row.relative||{};
  const watched=watches.some(x=>(x.ticker||x)===row.ticker),tk=encodeURIComponent(row.ticker);
  const card=el('article.card.opportunity-card',el('div.opportunity-heading',
    el('div',el('a.ticker',{href:'#/chart/'+tk},'$'+row.ticker),el('p.muted',row.company||'')),
    el('span.chip',s(watched?'opportunities.watched':'opportunities.discovered'))));
  const gap=rel.status==='ready'&&Number.isFinite(rel.excess20)?rel.excess20:null;
  const metric=(key,value)=>el('div',el('dt',s('opportunities.'+key)),el('dd.mono',value));
  card.append(el('dl.opportunity-metrics',metric('rsi',num(tech.rsi_d,1)),
    metric('drawdown',pct(tech.dd_pct,1)),metric('relative',gap===null?'—':s(gap<0?'opportunities.behind':'opportunities.ahead',{n:Math.abs(gap).toFixed(1)}))));
  card.append(el('p.opportunity-reason',s('opportunities.qualified')),
    el('p.small.muted',s('screen.technical_at',{date:dateTime(row.snapshot_at)})));
  const details=el('details.opportunity-evidence',el('summary',s('opportunities.evidence')),
    el('p',s('opportunities.rsis',{daily:num(tech.rsi_d,1),weekly:num(tech.rsi_w,1),monthly:num(tech.rsi_m,1)})),
    el('p',s('opportunities.volatility',{n:num(tech.iv_hv,2)})));
  if(gap!==null)details.append(el('p',s('opportunities.peer_basis',{symbols:(rel.symbols||[]).join(', '),date:rel.as_of})),
    el('p',s('opportunities.peer_returns',{stock:pct(rel.stock_return,1),peer:pct(rel.peer_return,1)})));
  else details.append(el('p.data-notice',s('opportunities.peer_missing')));
  details.append(el('p.small.muted',s('opportunities.risk')));
  card.append(details,el('div.opportunity-actions',link('#/chart/'+tk,'nav.chart'),
    link('#/research/'+tk,'opportunities.research'),link('#/alerts?ticker='+tk,'boards.set_alert')));
  return card;
}

export async function mount(root,route={}) {
  const ctl=new AbortController(),epoch=store.epoch();let alive=true,watches=[],watchReady=false,doc=null;
  const cleanup=()=>{alive=false;ctl.abort();};route.signal?.addEventListener('abort',cleanup,{once:true});
  const valid=()=>alive&&!ctl.signal.aborted&&epoch===store.epoch();
  const head=el('div.view-head',el('div',el('h1',s('nav.opportunities')),el('p.muted',s('opportunities.description'))));
  const method=el('details.card.opportunity-method',el('summary',s('opportunities.method')),
    el('p',s('opportunities.rule')),el('p',s('opportunities.peer_rule')),el('p.small.muted',s('opportunities.weekly_basis')),
    el('a',{href:(LANG==='en'?'/en':'')+'/research-records/'},s('opportunities.backtest')));
  root.append(head,method);
  if(!store.isPro()){
    root.append(el('section.card',el('h2',s('opportunities.lock_title')),el('p',s('opportunities.lock_note')),
      link('#/billing','nav.billing')));return cleanup;
  }
  const body=el('div');root.append(body);
  const config={...defaults(),oversold:true,scope:'covered'};
  let scope='all',query='';
  const customize=el('details.card',el('summary',s('opportunities.customize')),el('p.small',s('opportunities.notify_note')));
  const disposeScreen=mountScreen(customize,{signal:ctl.signal,query:new URLSearchParams('screening=1'),initialConfig:config});
  root.append(customize);
  function render(){
    clear(body);
    if(doc.status!=='ready'){
      body.append(el('p.data-notice',{role:'status'},s('screen.status_'+doc.status)),
        el('button.btn.btn-ghost',{type:'button',onclick:load},s('common.retry')));return;
    }
    body.append(el('p.small.muted',s('screen.as_of',{date:dateTime(doc.built_at)})));
    const choose=el('select.input',{'aria-label':s('opportunities.scope')},...['all','new','watchlist'].map(value=>
      el('option',{value,disabled:value!=='all'&&!watchReady},s('opportunities.scope_'+value))));choose.value=scope;
    const search=el('input.input',{type:'search',placeholder:s('opportunities.search'),'aria-label':s('opportunities.search'),value:query});
    const results=el('div.opportunity-grid'),count=el('p.small.muted',{role:'status'});
    function update(){scope=choose.value;query=search.value;clear(results);
      const rows=selectCandidates(doc.items,scope,watches,query);count.textContent=s('opportunities.results',{n:rows.length});
      for(const row of rows)results.append(candidateCard(row,watches));
      if(!rows.length)results.append(el('div.card',el('h2',s('opportunities.empty')),el('p.muted',s('opportunities.empty_note'))));
    }
    choose.addEventListener('change',update);search.addEventListener('input',update);
    body.append(el('div.opportunity-filters',el('label',el('span',s('opportunities.scope')),choose),el('label',el('span',s('opportunities.search')),search)),count,results);
    body.append(el('details.card.opportunity-coverage',el('summary',s('opportunities.coverage_title')),
      el('p.small.muted',s('opportunities.coverage',{n:doc.total,checked:doc.checked_tickers,unknown:doc.unknown_count,date:dateTime(doc.built_at)}))));
    if(!watchReady)body.append(el('p.data-notice',s('social.watchlist_error')));
    if(doc.total>doc.items.length)body.append(el('p.small.muted',s('screen.first_100')));
    if(doc.unknown_count){const unknown=el('details.card',el('summary',s('screen.unknown_count',{n:doc.unknown_count})),el('p',s('screen.unknown_note')));
      for(const row of doc.unknown||[])unknown.append(el('p.small',row.ticker+' · '+row.reasons.map(r=>s('screen.unknown_'+r)).join(' · ')));body.append(unknown);}
    update();
  }
  async function load(){
    clear(body).append(spinner());
    try {
      const [result,watch]=await Promise.allSettled([
        api.post('/screens/preview',{config},{signal:ctl.signal}),api.get('/watchlist',{signal:ctl.signal})]);
      if(!valid())return;if(result.status==='rejected')throw result.reason;
      doc=result.value;if(!Array.isArray(doc.items)||!['ready','warming','stale'].includes(doc.status))throw Error('invalid_response');
      const list=watch.status==='fulfilled'?(Array.isArray(watch.value)?watch.value:watch.value.tickers||watch.value.items):null;
      watchReady=Array.isArray(list);watches=watchReady?list:[];render();
    }catch(error){if(valid())clear(body).append(errorBox(error,load));}
  }
  if(!route.signal?.aborted)await load();
  return ()=>{disposeScreen();cleanup();};
}
