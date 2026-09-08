// Display recorded comparison relationships; never infer peers or ETF membership.
import {el} from './ui.js';
import {s,LANG} from './strings.js';

const roles=new Set(['broad_sector','industry','broad_market']);
const text=v=>typeof v==='string'?v:'';
const pick=v=>text(v?.[LANG==='en'?'en':'zh']);
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(v)?v.slice(0,10):'';
const symbol=v=>typeof v==='string'&&/^[A-Z][A-Z0-9.\-]{0,9}$/.test(v)?v:'';
function source(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function context(fact){const c=fact?.data?.comparison_context;return c&&roles.has(c.role)?c:null;}
const isPair=fact=>symbol(fact?.data?.left)&&symbol(fact?.data?.right);
const isBasket=fact=>fact?.topic==='business_peer_comparison';

export function comparisonLabel(fact){
  const d=fact?.data||{};
  if(isPair(fact))return s('comparison.'+(context(fact)?.role||'unspecified'))+' · '+d.right;
  if(isBasket(fact))return s('comparison.'+(d.scope==='business_peers'?'business_peers':d.scope==='thematic_reference'?'theme_basket':'unspecified'));
  return '';
}

export function comparisonBadge(fact){
  const label=comparisonLabel(fact);
  return label?el('span.comparison-label',label):null;
}

export function comparisonDetails(fact){
  const label=comparisonLabel(fact);if(!label)return null;
  const d=fact.data||{},c=context(fact),box=el('div.comparison-context',comparisonBadge(fact));
  if(isBasket(fact)){
    const symbols=Array.isArray(d.symbols)?d.symbols.filter(symbol):[];
    if(symbols.length)box.append(el('p.small',s('comparison.members',{symbols:symbols.join(' · ')})));
    if(d.scope==='thematic_reference')box.append(el('p.small.muted',s('comparison.theme_note')));
    if(date(d.as_of))box.append(el('p.small.muted',s('comparison.as_of',{date:date(d.as_of)})));
    return box;
  }
  if(pick(c?.label))box.append(el('p.small',pick(c.label)));
  if(pick(c?.reason))box.append(el('p.small',pick(c.reason)));
  if(date(d.start)&&date(d.end))box.append(el('p.small.muted',s('comparison.window',{start:date(d.start),end:date(d.end)})));
  const classification=c?.classification;
  if(classification){
    if(text(classification.sector))box.append(el('p.small',s('comparison.sector',{value:classification.sector})));
    if(text(classification.industry))box.append(el('p.small',s('comparison.industry_name',{value:classification.industry})));
    if(date(classification.observed_at))box.append(el('p.small.muted',s('comparison.classified_at',{date:date(classification.observed_at)})));
    const href=source(classification.source_url);
    if(href)box.append(el('a.comparison-source',{href,target:'_blank',rel:'noopener noreferrer'},s('comparison.classification_source')+' ↗'));
  }
  const m=c?.membership,href=source(m?.source_url),asOf=date(m?.as_of);
  if(m?.status==='verified_snapshot'&&asOf&&href){
    box.append(el('p.small',s('comparison.membership',{date:asOf})),
      el('p.small.muted',s('comparison.membership_note')),
      el('a.comparison-source',{href,target:'_blank',rel:'noopener noreferrer'},s('comparison.holdings_source')+' ↗'));
  }else box.append(el('p.small.muted',s('comparison.membership_unknown')));
  return box;
}
