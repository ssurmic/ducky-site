import { eventKind } from './calendar-model.js';
export { eventKind } from './calendar-model.js';
import { el, clear, pct, num } from './ui.js';
import { s, LANG } from './strings.js';
import * as api from './api.js';
import * as store from './store.js';
import { predictionPanel } from './calendar-prediction.js';
import { earningsPanel } from './calendar-earnings.js';
import {isIndexChange, sourceEventHint} from './source-event.js';

export function safeSource(url) { try { const u=new URL(url);return u.protocol==='https:'?u.href:null; }catch{return null;} }
export function weekday(day){const d=new Date(day+'T12:00:00Z');return Number.isFinite(d.getTime())?new Intl.DateTimeFormat(LANG==='en'?'en-US':'zh-CN',{weekday:'short',timeZone:'America/New_York'}).format(d):'—';}
const family=k=>['cpi','ppi','pce'].includes(k)?'inflation':['nfp','claims','adp'].includes(k)?'jobs':['retail','gdp','pmi'].includes(k)?'growth':['opex','witching'].includes(k)?'expiry':k;
export const eventHint = e => isIndexChange(e)?sourceEventHint(e):s('event.hint_'+family(eventKind(e)));

// Request dedup lives for a view only; no private data survives account changes.
export function eventResearchSession(scopeTicker='') {
  const epoch=store.epoch(), controller=new AbortController(), cache=new Map(); let disposed=false;
  const valid=()=>!disposed&&epoch===store.epoch()&&!!store.get('me');
  function load(e,ticker='') {
    const params={kind:eventKind(e),date:e.date,issuer:(e.tickers||[])[0]||''};
    if(ticker) params.ticker=ticker;
    const key=JSON.stringify(params);
    if(!cache.has(key)) cache.set(key,api.calendar.context(params,{signal:controller.signal}));
    return cache.get(key);
  }
  function mount(e, {showHint=true}={}) {
    const kind=eventKind(e), box=el('section.event-insight');
    const hint=showHint?el('div.event-hint',el('span.event-eyebrow',s('event.watch_for')),el('p',eventHint(e))):null;
    const schedule=e.schedule_status==='source_scheduled'?s('event.schedule_source'):s('event.schedule_check');
    if(hint) box.append(hint);
    box.append(el('p.event-schedule.muted.small',schedule));
    if(!store.get('me')) { box.append(el('a.event-upgrade',{href:'#/login'},s('login.title')));return box; }
    const relevance=el('div.event-relevance',el('span.muted.small',s('event.matching')));
    const details=el('details.event-evidence',{open:kind==='ppi'},el('summary',s('event.history')));
    const prediction=el('div');
    const content=el('div.event-evidence-body');details.append(content);box.append(relevance,prediction);
    if(kind==='earnings'&&(e.tickers||[])[0]) {
      const financial=el('div',el('p.small.muted',s('event.matching')));box.append(financial);
      const query=new URLSearchParams({ticker:e.tickers[0],event_date:e.date});const key='earnings:'+query.toString();
      if(!cache.has(key))cache.set(key,api.get('/earnings/context?'+query,{signal:controller.signal,silent402:true}));
      cache.get(key).then(doc=>{if(valid()){clear(financial);financial.append(earningsPanel(doc));}})
        .catch(()=>{if(valid()){clear(financial);financial.append(earningsPanel(null));}});
    }
    box.append(details);
    let current=null,horizon='5',chosen=scopeTicker,version=0,historyYear='all';
    function renderHistory(doc) {
      clear(content);const history=doc.history||{}, summary=history.summary||{};
      content.append(el('p.event-evidence-caption',s('event.history_method')));
      if(kind==='earnings') content.append(el('p.muted.small',s('event.earnings_source')));
      if(kind==='gdp') content.append(el('p.muted.small',s('event.gdp_cohort')));
      else if(['cpi','ppi','pce','nfp','retail','claims'].includes(kind)) content.append(el('p.muted.small',s('event.release_cohort')));
      if(['opex','witching','month_end'].includes(kind)) content.append(el('p.muted.small',s('event.rule_cohort')));
      const toolbar=el('div.event-evidence-toolbar');
      const select=el('select.input.event-stock',{'aria-label':s('event.history_stock')});
      for(const t of [...new Set([...(doc.relations||[]).map(r=>r.ticker),'SPY'])]) {
        const option=el('option',{value:t},t==='SPY'?s('event.market_reference'):t);option.selected=t===doc.selected;select.append(option);
      }
      select.addEventListener('change',()=>{chosen=select.value;refresh();});toolbar.append(select);
      const tabs=el('div.event-horizons',{'aria-label':s('event.window')});
      for(const h of ['1','5','20']) tabs.append(el('button.btn.btn-ghost.btn-sm'+(h===horizon?'.active':''),
        {type:'button','aria-pressed':String(h===horizon),onclick:()=>{horizon=h;renderHistory(doc);}},s('event.days',{n:h})));
      toolbar.append(tabs);content.append(toolbar);
      if(!history.samples?.length) { content.append(el('p.data-notice',s('event.history_missing')));return; }
      const st=summary[horizon]||{}, skipped=st.excluded||{};
      content.append(el('p.muted.small',s('event.as_of',{date:history.price_as_of||'—'})));
      if(!st.n) content.append(el('p.data-notice',s('event.no_complete')));
      else {
        const stats=el('div.event-stats',
          el('div',el('span.muted.small',s('event.median')),el('strong.mono',{class:st.median_pct<0?'neg':'pos'},pct(st.median_pct))),
          el('div',el('span.muted.small',s('event.excess')),el('strong.mono',num(st.median_excess_pp,1)+' '+s('event.pp'))),
          el('div',el('span.muted.small',s('event.range')),el('strong.mono',pct(st.min_pct)+' / '+pct(st.max_pct))));
        content.append(stats);
        const dist=el('div.event-distribution',{'aria-hidden':'true'},
          el('span.event-up',{style:{width:(100*st.up/st.n)+'%'}}),
          el('span.event-flat',{style:{width:(100*st.flat/st.n)+'%'}}),
          el('span.event-down',{style:{width:(100*st.down/st.n)+'%'}}));
        content.append(dist,el('p.small',s('event.sample_counts',{n:st.n,up:st.up,down:st.down,flat:st.flat})));
      }
      content.append(el('p.muted.small',s('event.excluded',{immature:skipped.immature||0,missing:skipped.missing_prices||0,unknown:(skipped.unknown_time||0)+(skipped.unverified_date||0)})),
        el('p.event-caveat.small',s('event.caveat')));
      const recent=el('section.event-recent-history',el('h4',s('event.recent_events')));
      for(const sample of history.samples.slice(-3).reverse()){
        const w=sample.windows?.[horizon]||{},url=safeSource(sample.source);
        recent.append(el('article.event-past-card',
          el('div',el('strong',sample.date+' · '+weekday(sample.date)),el('span.small.muted',s('event.kind_'+kind))),
          el('p.small',s('event.reaction_session',{date:sample.reaction_session || '—'})+(sample.release_time_et?' · '+sample.release_time_et+' ET':'')),
          sample.reference_period?el('p.small.muted',s('event.reference_period',{period:sample.reference_period})):null,
          el('p.small',w.status==='ok'?s('event.past_returns',{ticker:doc.selected,n:horizon,value:pct(w.return_pct),benchmark:pct(w.benchmark_pct)}):s('event.status_'+w.status)),
          w.status==='ok'?el('p.mono.small.muted',w.start+' → '+w.end):null,
          url?el('a.small',{href:url,target:'_blank',rel:'noopener noreferrer'},s('event.source')+' ↗'):null));
      }
      content.append(recent);
      const all=el('details.event-samples',el('summary',s('event.all_samples',{n:history.samples.length})));
      const years=[...new Set(history.samples.map(r=>r.date.slice(0,4)))].sort().reverse();
      const year=el('select.input',{'aria-label':s('event.history_year')},el('option',{value:'all'},s('event.years_all')),...years.map(y=>el('option',{value:y},y)));
      if(!years.includes(historyYear))historyYear='all';year.value=historyYear;
      year.addEventListener('change',()=>{historyYear=year.value;renderHistory(doc);content.querySelector('.event-samples').open=true;});all.append(el('label.event-year-label',s('event.history_year'),year));
      const table=el('table.event-sample-table',el('thead',el('tr',...['date','window','return','benchmark','source'].map(k=>el('th',s('event.col_'+k))))));
      const tbody=el('tbody');
      for(const sample of history.samples.filter(r=>historyYear==='all'||r.date.startsWith(historyYear)).slice().reverse()) {
        const w=sample.windows?.[horizon]||{};const url=safeSource(sample.source);
        tbody.append(el('tr',el('td.mono',sample.date+' · '+weekday(sample.date),el('div.small.muted',s('event.reaction_session',{date:sample.reaction_session||'—'}))),el('td.small',w.status==='ok'?w.start+' → '+w.end:s('event.status_'+w.status)),
          el('td.mono',{class:w.return_pct<0?'neg':w.return_pct>0?'pos':''},w.status==='ok'?pct(w.return_pct):'—'),
          el('td.mono',w.status==='ok'?pct(w.benchmark_pct):'—'),
          el('td',url?el('a',{href:url,target:'_blank',rel:'noopener noreferrer'},s('event.source')):'—')));
      }
      table.append(tbody);all.append(el('div.event-table-scroll',{tabindex:0,'aria-label':s('event.history')},table));content.append(all);
      const sourceUrls=new Set(history.samples.map(r=>safeSource(r.source)).filter(Boolean));
      content.append(el('p.muted.small',s('event.sources_count',{n:sourceUrls.size})+' · '+'Yahoo Finance'));
    }
    function renderRelations(doc) {
      clear(relevance);const rows=doc.relations||[];
      relevance.append(el('span.event-eyebrow',s('event.scope')));
      if(!rows.length) relevance.append(el('p.muted.small',s('event.no_watches')));
      const matched=rows.filter(r=>r.relation!=='unmatched');
      if(rows.length&&!matched.length) relevance.append(el('p.muted.small',s('event.unmatched')));
      const chips=el('div.event-related-chips');
      for(const r of matched) {
        const allLanes=r.lanes||[];
        const lane=allLanes.slice(0,r.relation==='peer'?3:1).map(x=>LANG==='en'?x.en:x.zh).join(' / ');
        chips.append(el('a.event-related',{href:'#/chart/'+encodeURIComponent(r.ticker)},
          el('strong.mono',r.ticker),el('span',s('event.relation_'+r.relation)),
          lane?el('span.muted.small',lane):null));
      }
      relevance.append(chips);
      if(matched.some(r=>r.relation==='peer')) relevance.append(el('p.small',s('event.peer_channel')));
      if(matched.some(r=>r.relation==='market')) {
        relevance.append(el('p.small',s('event.market_channel')));
        if(matched.some(r=>(r.lanes||[]).some(x=>['gpu','custom_asic','copper_aec','optical_dsp','pcie_retimer'].includes(x.key)))) relevance.append(el('p.small',s('event.ai_channel')));
      }
      if(matched.some(r=>r.relation==='direct')) relevance.append(el('p.small',s('event.direct_channel')));
      const sources=[...new Set(matched.flatMap(r=>(r.sources||[]).map(x=>x.url)).concat(doc.mechanism_source||[]))].map(safeSource).filter(Boolean);
      if(sources.length) {
        const sourceBox=el('details.event-basis',el('summary',s('event.match_basis')));
        sourceBox.append(el('p.muted.small',s('event.current_classification')));
        sources.forEach((url,i)=>sourceBox.append(el('a.event-source-link',{href:url,target:'_blank',rel:'noopener noreferrer'},s('event.source')+' '+(i+1)+' · '+new URL(url).hostname)));
        relevance.append(sourceBox);
      }
    }
    async function refresh() {
      const v=++version;clear(content);content.append(el('p.muted',s('event.matching')));
      try {
        const doc=await load(e,chosen);
        if(!valid()||v!==version)return;
        current=doc;renderRelations(doc);renderHistory(doc);
        clear(prediction);
        if(['fomc','ppi','cpi','pce','nfp'].includes(kind))prediction.append(predictionPanel(doc.prediction_market));
      } catch(err) {
        if(!valid()||v!==version)return;
        clear(relevance);relevance.append(el('p.muted.small',s('event.context_unavailable')));
        clear(content);content.append(el('p.data-notice',s('event.context_unavailable')));
      }
    }
    refresh();return box;
  }
  return {mount,dispose(){disposed=true;controller.abort();cache.clear();}};
}
