import { el, pct } from './ui.js';
import { s, LANG } from './strings.js';
import { readableDate } from './date-format.js';

const finite=v=>typeof v==='number'&&Number.isFinite(v);
const copy=key=>s('earnings.'+key);
const text=value=>value?.[LANG==='en'?'en':'zh']||value?.en||value?.zh||'';
function source(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}}
function link(url,label){const safe=source(url);return safe?el('a.small',{href:safe,target:'_blank',rel:'noopener noreferrer'},label+' ↗'):document.createDocumentFragment();}
export function earningsEstimateBasis(next,metric) {
  const basis=next.basis_by_metric?.[metric]||(metric==='eps'?next.basis:null);
  if(['provider_non_gaap','non-GAAP','non_gaap'].includes(basis))return copy('adjusted_basis');
  if(['provider_gaap','GAAP','gaap'].includes(basis))return 'GAAP';
  return copy('basis_unspecified');
}
export function earningsValue(value,unit='USD') {
  if(!finite(value))return '—';
  if(unit==='USD/shares')return '$'+value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
  const magnitude=Math.abs(value), divisor=magnitude>=1e9?1e9:magnitude>=1e6?1e6:1;
  return (value<0?'−':'')+'$'+(magnitude/divisor).toLocaleString('en-US',{maximumFractionDigits:divisor===1?0:2})+(divisor===1e9?'B':divisor===1e6?'M':'');
}

function factsFor(block,doc) {
  const ids=new Set(block?.fact_ids||[]);
  return (doc.evidence||[]).filter(f=>ids.has(f.id));
}
function cited(block,doc) {
  const box=el('div.earnings-observation',el('p',text(block)));
  const facts=factsFor(block,doc);
  if(facts.length){const sources=el('details.earnings-citations',el('summary',copy('basis')));
    for(const f of facts){const quote=f.kind==='primary_excerpt'?f.text:f.evidence;
      if(quote)sources.append(el('blockquote',{lang:'en'},quote));
      else if(f.kind==='reported_metric')sources.append(el('p.small',copy(f.metric)+' · '+f.basis+' · '+earningsValue(f.value,f.unit)));
      else if(f.kind==='consensus')sources.append(el('p.small',copy('next_consensus')+' · '+f.date+' · '+f.provider));
      const a=link(f.source_url,copy('source'));if(a)sources.append(a);
    }box.append(sources);
  }return box;
}

export function earningsPanel(doc) {
  const box=el('section.earnings-panel',el('div.earnings-heading',el('span.event-eyebrow',copy('eyebrow')),el('h3',copy('title'))));
  if(!doc?.previous_release){box.append(el('p.small.muted',copy(doc?.status==='not_recorded_before_event'?'not_then':'missing')));return box;}
  const release=doc.previous_release,next=doc.next_event||{};
  box.append(el('p.small.muted',copy('observed')+' '+readableDate(doc.as_of)));
  if(doc.stale)box.append(el('p.data-notice',{role:'status'},copy('stale')));
  if(doc.historical)box.append(el('p.small.data-notice',copy('historical')));
  const columns=el('div.earnings-columns');
  const previous=el('article.earnings-card',el('span.event-eyebrow',copy('previous')),
    el('h4',(release.fiscal_year?'FY '+release.fiscal_year:'')+(release.fiscal_quarter?' · Q'+release.fiscal_quarter:'')),
    el('p.small.muted',copy('period_end')+' '+release.period_end+' · '+copy('released')+' '+release.release_date));
  const metrics=el('dl.earnings-metrics');
  for(const m of release.metrics||[]) {
    const row=el('div',el('dt',copy(m.metric)+' · '+m.basis),el('dd.mono',{title:finite(m.value)?String(m.value):''},earningsValue(m.value,m.unit)));
    if(['annual_minus_nine_months','ytd_difference'].includes(m.method))row.append(el('span.small.muted',copy('derived')));
    metrics.append(row);
  }
  previous.append(metrics,link(release.source_url,copy('release_link')));
  if(!release.metrics?.length)previous.append(el('p.small.muted',copy('metrics_missing')));
  const upcoming=el('article.earnings-card',el('span.event-eyebrow',copy('next')),
    el('h4',next.date||'—'),el('p.small.muted',copy('next_consensus')));
  if(next.fiscal_year&&next.fiscal_quarter)upcoming.append(el('p.small.mono','FY '+next.fiscal_year+' · Q'+next.fiscal_quarter));
  const estimates=el('dl.earnings-metrics');
  for(const metric of ['eps','revenue'])estimates.append(el('div',el('dt',copy(metric)+' · '+earningsEstimateBasis(next,metric)),el('dd.mono',earningsValue(next[metric+'_estimate'],metric==='eps'?'USD/shares':'USD'))));
  upcoming.append(estimates,el('p.small',copy('beat_rule')),
    el('details.earnings-estimate-basis',el('summary',copy('estimate_method')),
      el('p.small',copy('consensus_basis')),
      el('p.small.muted',copy('consensus_time')+' '+readableDate(next.observed_at)),
      el('p.small.muted',copy('provider_update_unknown'))),
    link(next.source_url,next.provider||copy('source')));
  if(!finite(next.eps_estimate)&&!finite(next.revenue_estimate))upcoming.append(el('p.data-notice.small',copy('consensus_missing')));
  columns.append(previous,upcoming);box.append(columns);
  if(doc.explanation){const business=doc.explanation.scope==='business_context';
    const explanation=el('div.earnings-explanation',{'data-provenance':'ducky_inference'},el('span.event-eyebrow',copy('interpretation')));
    if(business)explanation.append(el('p.small.muted',copy('business_scope')));
    else if(doc.explanation.overview)explanation.append(cited(doc.explanation.overview,doc));
    const groups=el('div.earnings-context-groups');
    for(const key of business?['drivers','risks']:['drivers','watchpoints','risks']) {
      const blocks=doc.explanation[key];
      if(Array.isArray(blocks)&&blocks.length)groups.append(el('section',{'data-section':key},el('h4',copy(key)),...blocks.map(b=>cited(b,doc))));
    }
    explanation.append(groups);box.append(explanation);
  }else box.append(el('p.small.data-notice',copy('explanation_missing')));
  const guidance=(doc.evidence||[]).filter(e=>e.kind==='primary_excerpt'&&/guidance|outlook|expected|expects/i.test(e.text||'')).slice(0,6);
  if(guidance.length){const guide=el('details.earnings-guidance',el('summary',copy('guidance')),
      el('p.small.muted',copy('guidance_basis')));
    guidance.forEach(g=>guide.append(el('blockquote',{lang:'en'},g.text),link(g.source_url,copy('release_link'))));box.append(guide);
  }
  const comparisons=release.comparisons||[];
  if(comparisons.length){const compare=el('details.earnings-comparison',el('summary',copy('past_compare')),
      el('p.small.muted',copy('comparison_basis')));
    const table=el('table.event-sample-table',el('thead',el('tr',...['metric','actual','estimate','surprise'].map(k=>el('th',copy(k))))));
    const rows=el('tbody');for(const r of comparisons)rows.append(el('tr',el('td',copy(r.metric)),
      el('td.mono',earningsValue(r.actual,r.metric==='eps'?'USD/shares':'USD')),
      el('td.mono',earningsValue(r.estimate,r.metric==='eps'?'USD/shares':'USD')),
      el('td.mono',{class:r.surprise_pct<0?'neg':''},finite(r.surprise_pct)?pct(r.surprise_pct):'—')));
    table.append(rows);compare.append(el('div.event-table-scroll',{tabindex:0,'aria-label':copy('past_compare')},table));box.append(compare);
  }
  const reaction=doc.reaction||{},windows=reaction.sample?.windows||{};
  const move=el('div.earnings-reaction',el('h4',copy('reaction')),el('p.small.muted',copy('reaction_basis')));
  if(reaction.price_as_of)move.append(el('p.small.muted',copy('price_asof')+' '+reaction.price_as_of+' · '+(reaction.source||'Yahoo Finance')));
  const chips=el('div.earnings-reaction-chips');
  for(const h of ['1','5','20']){const w=windows[h]||{};chips.append(el('div',el('strong',h+' '+copy(h==='1'?'session':'sessions')),
    el('span.mono',{class:w.return_pct<0?'neg':w.return_pct>0?'pos':''},w.status==='ok'?pct(w.return_pct):'—'),
    el('span.small.muted',w.status==='ok'?'SPY '+pct(w.benchmark_pct):copy('reaction_missing')),
    ...(w.status==='ok'&&w.start&&w.end?[el('span.small.muted',w.start+' → '+w.end)]:[])));}
  move.append(chips);box.append(move);
  const method=el('details.earnings-method',el('summary',copy('coverage')),
    el('p.small',copy('coverage_note')),el('p.small.muted',copy('filing_time')+' '+(release.filed_at||'—')),
    el('p.small.muted',copy('time_rules')));
  for(const item of doc.sources||[]){const a=link(item.url,copy('source')+' · '+(source(item.url)?new URL(item.url).hostname:''));if(a)method.append(el('p.small',a,' · '+item.observed_at));}
  box.append(method,el('a.small',{href:'#/creators?ticker='+encodeURIComponent(doc.ticker)},copy('creator_link')+' →'));
  return box;
}
