import {el,clear,spinner,errorBox,num,pct} from '../ui.js';
import {s,LANG} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';

const pick=value=>value?.[LANG==='en'?'en':'zh']||'';
const time=value=>{const d=new Date(value);return value&&Number.isFinite(d.getTime())?d.toISOString().replace('T',' ').slice(0,16)+' UTC':'—';};
const safeTicker=value=>/^[A-Z][A-Z0-9.\-]{0,9}$/.test(value||'');
const n=(value,d=1)=>Number.isFinite(value)?num(value,d):'—';
function source(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}

export function factText(fact){
  const d=fact.data||{};
  if(fact.topic==='price')return '$'+n(d.price,2)+' · '+(d.price_session||'—');
  if(fact.topic==='technicals')return s('stockbrief.fact_technical',{daily:n(d.rsi_d),weekly:n(d.rsi_w),monthly:n(d.rsi_m),drawdown:n(d.dd_pct)});
  if(fact.topic==='rsi_change')return s('stockbrief.fact_rsi',{before:n(d.previous),after:n(d.current),date:d.previous_session||'—'});
  if(fact.topic==='volatility')return 'IV '+n(d.iv)+'% · HV '+n(d.hv)+'% · IV/HV '+n(d.ratio,2);
  if(fact.topic==='option_concentrations')return s('stockbrief.fact_options',{put:n(d.put_wall,2),call:n(d.call_wall,2),expiry:d.expiry||'—'});
  if(fact.topic==='reddit_attention')return s('stockbrief.fact_vibe',{mentions:n(d.mentions,0),prior:n(d.mentions_previous,0),score:n(d.index,0)});
  if(fact.topic==='reported_insider_purchase')return (d.owners||[]).map(o=>o.name).join(', ')+' · '+
    (d.transactions||[]).map(t=>`${t.date} · ${n(t.shares,0)} × $${n(t.price,2)}`).join(' / ');
  if(fact.topic==='business_peer_comparison')return (d.benchmark||'')+' · '+n(d.excess20)+' pp';
  if(d.left&&d.right)return `${d.left} ${pct(d.left_return_pct)} / ${d.right} ${pct(d.right_return_pct)} · ${n(d.excess_pp,2)} pp · ${d.start} → ${d.end}`;
  if(fact.topic==='macro_background')return s('stockbrief.fact_macro',{date:d.date||'—',regime:d.regime||'—',rate:n(d.metrics?.nominal_10y,2)});
  return [d.publisher||d.author||'',LANG==='en'?(d.summary_en||d.title||''):(d.summary||d.title||'')].filter(Boolean).join(' · ')||s('stockbrief.recorded_source');
}

export function reportCard(row,{onHistory,archive=false}={}){
  const ticker=safeTicker(row.ticker)?row.ticker:'';
  const card=el('article.card.stock-brief',{'data-ticker':ticker},
    el('div.stock-brief-head',el('h2',ticker?'$'+ticker:s('stockbrief.title')),
      el('span.chip',s('stockbrief.status_'+(row.status||'unavailable')))));
  if(!['ready','stale'].includes(row.status)||!row.report){
    card.append(el('p.muted',s('stockbrief.unready_'+(row.status==='source_changed'?'source_changed':row.refresh?.status==='failed'?'failed':'pending'))));
    if(ticker)card.append(el('a.btn.btn-ghost.btn-sm',{href:'#/research/'+ticker},s('stockbrief.evidence')));
    return card;
  }
  const report=row.report, facts=Array.isArray(row.evidence)?row.evidence:[];
  const evidence=el('details.stock-brief-evidence',el('summary',s('stockbrief.evidence')));
  const nodes=new Map();
  for(const fact of facts){
    const node=el('article.stock-brief-fact',{'tabindex':'-1'},el('h4',s('stockbrief.topic_'+fact.topic)),
      el('p',factText(fact)),el('p.small.muted',s('stockbrief.observed',{date:time(fact.observed_at)})),
      fact.source_at?el('p.small.muted',s('stockbrief.source_date',{date:fact.source_at})):null,
      fact.freshness==='stale'?el('p.data-notice',s('stockbrief.fact_stale')):null);
    if(fact.topic==='reported_insider_purchase')node.append(el('p.small.muted',s('stockbrief.insider_basis')));
    const href=source(fact.source_url);if(href)node.append(el('a',{href,target:'_blank',rel:'noopener noreferrer'},s('stockbrief.source')+' ↗'));
    nodes.set(fact.id,node);evidence.append(node);
  }
  const paragraph=(item,className='')=>{
    const p=el('p'+className,pick(item));
    for(const ref of item?.citations||[]){
      const index=facts.findIndex(f=>f.id===ref);if(index<0)continue;
      p.append(el('button.brief-citation',{type:'button','aria-label':s('stockbrief.citation',{n:index+1}),onclick:()=>{
        detail.open=true;evidence.open=true;nodes.get(ref)?.focus();nodes.get(ref)?.scrollIntoView?.({block:'nearest'});
      }},String(index+1)));
    }return p;
  };
  card.append(el('p.stock-brief-state',s('stockbrief.state_'+report.state)),paragraph(report.summary,'.stock-brief-summary'));
  if(row.status==='stale'||row.refresh?.status==='failed')card.append(el('p.data-notice',s('stockbrief.saved_report')));
  card.append(el('div.stock-brief-actions',el('section',el('h3',s('stockbrief.not_holding')),paragraph(report.not_holding)),
    el('section',el('h3',s('stockbrief.if_holding')),paragraph(report.if_holding))));
  const detail=el('details.stock-brief-reasoning',el('summary',s('stockbrief.reasoning')));
  for(const item of report.dimensions||[])detail.append(el('section',el('h3',s('stockbrief.dimension_'+item.dimension)),paragraph(item)));
  detail.append(el('h3',s('stockbrief.risk')),paragraph(report.risk),el('h3',s('stockbrief.next_check')),paragraph(report.next_check));
  if(row.missing?.length)detail.append(el('p.data-notice',s('stockbrief.missing')+' '+row.missing.map(k=>s('stockbrief.missing_'+k)).join(' · ')));
  detail.append(evidence);card.append(detail);
  card.append(el('p.small.muted',s('stockbrief.checked',{date:time(row.checked_at)})));
  if(row.reused)card.append(el('p.small.muted',s('stockbrief.reused')));
  evidence.append(el('p.small.muted',s('stockbrief.generated',{date:time(row.generated_at)})));
  if(!archive&&ticker){
    const links=el('div.stock-brief-links',el('a.btn.btn-ghost.btn-sm',{href:'#/chart/'+ticker},s('radar.chart')),
      el('a.btn.btn-ghost.btn-sm',{href:'#/vibe?ticker='+ticker},'Vibe Check'));
    if(onHistory)links.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:e=>onHistory(ticker,card,e.currentTarget)},s('stockbrief.history')));
    card.append(links);
  }
  return card;
}

export async function mountStockBriefs(root,route={}){
  const params=route.query instanceof URLSearchParams?route.query:new URLSearchParams(route.query||'');
  const ticker=String(params.get('ticker')||'').toUpperCase();
  const ctl=new AbortController(),epoch=store.epoch();let alive=true,request=0;
  const valid=id=>alive&&!ctl.signal.aborted&&epoch===store.epoch()&&(id==null||id===request);
  root.append(el('div.view-head',el('h1',s('stockbrief.title')),
    el('a.btn.btn-ghost.btn-sm',{href:'#/briefing?period=daily'},s('stockbrief.events'))),
    el('p.view-intro',s('stockbrief.intro')));
  const search=el('input.input',{type:'search',value:ticker,placeholder:s('social.search'),'aria-label':s('social.search'),maxlength:10});
  root.append(el('form.add-row',{onsubmit:e=>{e.preventDefault();const t=search.value.trim().toUpperCase().replace(/^\$/,'');
    if(safeTicker(t))location.hash='#/briefing?ticker='+encodeURIComponent(t);}},search,
    el('button.btn.btn-ghost',{type:'submit'},s('research.load')),ticker?el('a.btn.btn-ghost',{href:'#/briefing'},s('stockbrief.all')):null));
  const host=el('div.stock-briefs');root.append(host);
  async function load(){
    const id=++request;clear(host);
    if(!store.isPro()){
      host.append(el('section.card',el('h2',s('stockbrief.lock_title')),el('p',s('stockbrief.lock_note')),
        el('a.btn.btn-primary',{href:'#/billing'},s('radar.access_upgrade'))));return;
    }
    host.append(spinner());
    try{
      const doc=await api.get('/briefing/stocks'+(safeTicker(ticker)?'?ticker='+encodeURIComponent(ticker):''),{signal:ctl.signal,silent402:true});
      if(!valid(id))return;
      if(!Array.isArray(doc?.items))throw Error('invalid_response');
      clear(host);
      host.append(el('p.small.muted',s('stockbrief.cadence')));
      if(!doc.items.length)host.append(el('section.card',el('h2',s('briefing.add_title')),
        el('p',s('stockbrief.empty')),el('a.btn.btn-primary',{href:'#/watchlist'},s('briefing.edit_watchlist'))));
      for(const row of doc.items.slice(0,3))host.append(reportCard(row,{onHistory:history}));
      if(doc.items.length>3)host.append(el('details.card.stock-brief-more',el('summary',s('briefing.show_all',{n:doc.items.length,more:doc.items.length-3})),
        ...doc.items.slice(3).map(row=>reportCard(row,{onHistory:history}))));
      host.append(el('details',el('summary',s('stockbrief.delivery_details')),el('p.small.muted',s('stockbrief.notification_note'))));
    }catch(error){if(valid(id)){clear(host);host.append(errorBox(error,load));}}
  }
  async function history(tk,card,button){
    button.disabled=true;let panel=card.querySelector('.stock-brief-history');
    if(!panel){panel=el('div.stock-brief-history');card.append(panel);}
    try{
      const query=new URLSearchParams({limit:'3'});if(panel.dataset.cursor)query.set('before',panel.dataset.cursor);
      const doc=await api.get('/briefing/stocks/'+tk+'/history?'+query,{signal:ctl.signal,silent402:true});
      if(!valid()||!card.isConnected||!store.isPro())return;
      panel.querySelector('.error')?.remove();
      for(const row of doc.items||[])panel.append(reportCard(row,{archive:true}));
      panel.dataset.cursor=doc.next_cursor||'';button.hidden=!doc.next_cursor;button.textContent=s('creators.load_more');
    }catch(error){if(valid()&&card.isConnected)panel.append(el('p.error',s('social.history_error')));}
    finally{button.disabled=false;}
  }
  const unsubs=[store.subscribe('watchlist',load),store.subscribe('me',load)];
  const cleanup=()=>{alive=false;request++;ctl.abort();unsubs.forEach(fn=>fn());};
  route.signal?.addEventListener('abort',cleanup,{once:true});
  if(route.signal?.aborted)cleanup();else await load();
  return cleanup;
}
