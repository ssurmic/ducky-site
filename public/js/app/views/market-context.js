import {evidenceLink} from '../evidence-link.js';
import { el, clear, modal } from '../ui.js';
import { s, LANG, has } from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import { readableDate as marketDate } from '../date-format.js';

function source(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}}
function localized(value,key){return value?.[key+'_'+(LANG==='en'?'en':'zh')]||value?.[key+'_en']||'';}

export function renderMarketContext(doc,{preview=false,watches=[],compact=false}={}) {
  const box=el('section.card.market-context',el('div.market-context-heading',
    el('h2',s('market.title'))));
  box.classList.toggle('market-compact',compact);
  if(doc.status==='unavailable'||!doc.topics?.length) {
    box.append(el('p.data-notice',s('market.unavailable')));return box;
  }
  box.append(el('p.small.muted',s('market.observed',{date:marketDate(doc.observed_at)})));
  if(doc.status==='stale')box.append(el('p.data-notice',{role:'status'},s('market.stale')));
  const coverage=doc.coverage||{};
  const notes=el('details.market-notes',el('summary',s('market.details')),
    el('p.small.market-coverage',s('market.coverage',{news:coverage.headlines??'—',creators:coverage.creator_views??'—',contracts:coverage.prediction_contracts??'—',sources:coverage.distinct_publishers??'—'})),
    el('p.small.muted',s('market.scope')));
  if(coverage.news_failed||coverage.creators_unavailable)box.append(el('p.small.data-notice',s('market.partial_sources')));
  const evidence=new Map((doc.evidence||[]).map(e=>[e.id,e]));
  const watchSet=new Set(watches.map(t=>String(t?.ticker||t).toUpperCase()));
  const relevant=t=>(t.tickers||[]).filter(ticker=>watchSet.has(ticker));
  if(!preview)notes.append(el('p.small.market-watch-context',s(watchSet.size?(doc.topics.some(t=>relevant(t).length)?'market.watch_matches':'market.watch_unmatched'):'market.watch_empty')));
  const grid=el('div.market-topics');
  for(const topic of [...doc.topics].sort((a,b)=>Number(relevant(b).length>0)-Number(relevant(a).length>0))) {
    const card=el('article.market-topic',el('h3',localized(topic,'label')));
    if(relevant(topic).length)card.prepend(el('span.event-eyebrow',s('market.watch_related',{tickers:relevant(topic).join(' · ')})));
    const synthesis=topic.synthesis;
    if(synthesis&&!preview) {
      card.append(el('span.event-eyebrow',s('market.ducky_inference')),el('p',localized(synthesis,'summary')));
    } else if(!preview)card.append(el('p.small.muted',s('market.source_only')));
    const refs=(topic.fact_ids||[]).map(id=>evidence.get(id)).filter(Boolean);
    if(!preview) {
      const details=el('details.market-evidence',el('summary',s('market.evidence',{n:refs.length})),
        el('p.small.muted',s('market.topic_sources',{n:topic.source_count??'—'})+' · '+marketDate(topic.latest_at)));
      if(synthesis)details.append(el('h4',s('market.counter')),el('p.small',localized(synthesis,'unknown')),
        el('h4',s('market.next_check')),el('p.small',localized(synthesis,'next_check')));
      for(const item of refs) {
        const url=source(item.source_url);const row=el('article.market-evidence-item',
          el('span.event-eyebrow',has('market.kind_'+item.kind)?s('market.kind_'+item.kind):s('market.title')),
          el('p.small.muted',item.publisher+' · '+marketDate(item.published_at)),
          url?el('a',{href:url,target:'_blank',rel:'noopener noreferrer'},item.title+' ↗'):el('p',item.title));
        if(item.kind==='creator_view')row.append(el('p.small',localized(item,'summary')),
          el('p.small.muted',s('market.creator_attribution')));
        if(item.kind==='prediction_market')row.append(el('p.small',s('market.event_date',{date:item.event_date})),
          el('p.small.mono',(item.outcomes||[]).map(o=>o.label+': '+(o.probability*100).toFixed(1)+'%').join(' · ')),
          el('p.small.muted',s('market.probability_method')));
        if(synthesis?.counter_fact_ids?.includes(item.id))row.append(el('span.small',s('market.counter_source')));
        details.append(row);
      }
      if(topic.tickers?.length)details.append(el('p.small.muted',s('market.ticker_basis')));
      for(const edge of topic.ticker_links||[])details.append(el('p.small',el('strong',edge.ticker+' · '),edge.excerpt||''));
      card.append(details);
    }
    const tickers=el('div.event-related-chips');
    for(const ticker of topic.tickers||[])tickers.append(evidenceLink(ticker),el('a.event-related',{href:'#/chart/'+encodeURIComponent(ticker)},ticker));
    if(tickers.childElementCount)card.append(tickers);
    if(compact) {
      const trigger=el('button.market-topic-trigger',{type:'button','aria-haspopup':'dialog',onclick:()=>{
        const host=modal(localized(topic,'label'),card.cloneNode(true));
        host.querySelector('.modal-box').classList.add('market-dialog');
      }},el('span',localized(topic,'label')),el('span.market-topic-status',s(preview?'market.preview_label':synthesis?'market.summary_label':'market.pending_label')),el('span.market-topic-arrow',{'aria-hidden':'true'},'↗'));
      grid.append(trigger);
    } else grid.append(card);
  }
  box.append(grid,notes);
  if(preview)box.append(el('a.btn.btn-primary.btn-sm',{href:'#/billing'},s('market.open_research')));
  if(!compact)box.append(el('a.small',{href:'#/calendar'},s('market.calendar_link')+' →'));
  return box;
}

export function mountMarketContext(root,{compact=false}={}) {
  const epoch=store.epoch(), ctl=new AbortController();let disposed=false;
  const placeholder=el('section.card.market-context',el('h2',s('market.title')),el('p.muted',s('market.loading')));
  root.append(placeholder);
  const pro=store.isPro();
  api.get(pro?'/market/context':'/public/market-preview.json',{signal:ctl.signal,auth:pro,silent402:true}).then(doc=>{
    if(disposed||epoch!==store.epoch())return;
    placeholder.replaceWith(renderMarketContext(doc,{preview:!pro,watches:store.get('watchlist')||[],compact}));
  }).catch(()=>{
    if(disposed||epoch!==store.epoch())return;
    clear(placeholder);placeholder.append(el('h2',s('market.title')),el('p.data-notice',s('market.unavailable')));
  });
  return ()=>{disposed=true;ctl.abort();};
}
