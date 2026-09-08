import {el,modal,px,num} from './ui.js';
import {s} from './strings.js';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const date=v=>typeof v==='string'?v.slice(0,10):'—';
export function waterLevel(doc){
  const d=doc.market_context?.price_position?.data;
  if(doc.status==='stale'||!d||!finite(d.position)||d.position<0||d.position>1||!finite(d.low)||!finite(d.high)||d.high<=d.low)return null;
  return 1-d.position;
}
export function marketDetail(doc){
  const m=doc.market_context||{},quote=m.price,vol=m.volatility?.data||{},band=m.price_position?.data,level=waterLevel(doc);
  modal(s('evidence.market_title'),el('div.evidence-market-detail',
    el('p.evidence-market-price',finite(quote?.data?.price)?px(quote.data.price):'—'),
    el('p.small.muted',s('evidence.price_date',{date:date(quote?.data?.price_session)})),
    el('p.small.muted',s('evidence.quote_note')),
    el('p.small.muted',s('evidence.observed',{at:quote?.observed_at||'—'})),
    el('h3',s('evidence.water_title')),
    band?el('p',s('evidence.range_values',{low:px(band.low),high:px(band.high)})):null,
    el('p',level===null?s('evidence.water_unknown'):s('evidence.water_value',{n:num(level*100,0)})),
    el('p',s('evidence.water_note')),
    el('h3',s('evidence.iv_title')),
    el('p',s('evidence.iv_values',{iv:finite(vol.iv)?num(vol.iv,1):'—',hv:finite(vol.hv)?num(vol.hv,1):'—'})),
    el('p',s('evidence.iv_history_unknown')),
    el('a.btn.btn-ghost',{href:'#/chart/'+encodeURIComponent(doc.ticker)},s('radar.chart'))));
}
export function priceBadge(doc){
  const q=doc.market_context?.price;
  const status=doc.price_session_context?.status;
  const label=status==='current'?'evidence.quote_current':status==='stale'?'evidence.quote_stale':status==='missing'||status==='invalid'?'evidence.quote_missing':'evidence.price_date';
  return el('button.evidence-price',{type:'button',onclick:()=>marketDetail(doc),'aria-label':s('evidence.market_title')},
    el('strong.mono',finite(q?.data?.price)?px(q.data.price):'—'),
    el('span',s(label,{date:date(q?.data?.price_session)})));
}
