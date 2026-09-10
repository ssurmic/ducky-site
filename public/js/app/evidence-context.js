import {el,modal,px,num,dateTime} from './ui.js';
import {s} from './strings.js';
import {displayQuote,quoteLabel,quoteTime} from './watchlist-overview.js';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const date=v=>typeof v==='string'?v.slice(0,10):'—';
const savedQuote=q=>q?.data?.basis==='saved_provider_quote_not_live_tick'||/:(RTH|CLOSED)$/.test(q?.data?.price_session||'');
const hasPrice=q=>finite(q?.data?.price)&&q.data.price>0;
function priceLabel(doc){
  const q=doc.market_context?.price,status=doc.price_session_context?.status;
  if(!hasPrice(q))return 'evidence.quote_missing';
  if(status==='missing'||status==='invalid')return 'evidence.quote_time_unknown';
  if(status==='stale')return 'evidence.quote_stale';
  if(savedQuote(q))return 'evidence.quote_saved';
  return status==='current'?'evidence.quote_current':'evidence.price_date';
}
export function waterLevel(doc){
  const d=doc.market_context?.price_position?.data;
  if(doc.status==='stale'||!d||!finite(d.position)||d.position<0||d.position>1||!finite(d.low)||!finite(d.high)||d.high<=d.low)return null;
  return 1-d.position;
}
export function marketDetail(doc){
  const m=doc.market_context||{},quote=m.price,vol=m.volatility?.data||{},band=m.price_position?.data,level=waterLevel(doc);
  const row=doc.display_price,latest=displayQuote(row);
  modal(s('evidence.market_title'),el('div.evidence-market-detail',
    latest?el('section',el('p.evidence-market-price',px(latest.price)),el('p.small',quoteLabel(latest)+' · '+quoteTime(latest)),el('p.small.muted',latest.provider+' · '+latest.feed)):null,
    row?el('h3',s('watch.analysis_price')):null,
    el('p.evidence-market-price',hasPrice(quote)?px(quote.data.price):'—'),
    el('p.small.muted',s(priceLabel(doc),{date:date(quote?.data?.price_session)})),
    el('p.small.muted',s(savedQuote(quote)?'evidence.saved_quote_note':'evidence.quote_note')),
    el('p.small.muted',s('evidence.observed',{at:dateTime(quote?.observed_at)})),
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
  const row=doc.display_price,latest=displayQuote(row);
  if(latest||finite(row?.price)&&row.price>0)return el('button.evidence-price',{type:'button',onclick:()=>marketDetail(doc),'aria-label':s('evidence.market_title')},
    el('strong.mono',px(latest?.price||row.price)),el('span',latest?quoteLabel(latest)+' · '+quoteTime(latest):s('watch.close_session',{date:row.price_session||'—'})));
  const q=doc.market_context?.price;
  return el('button.evidence-price',{type:'button',onclick:()=>marketDetail(doc),'aria-label':s('evidence.market_title')},
    el('strong.mono',hasPrice(q)?px(q.data.price):'—'),
    el('span',s(priceLabel(doc),{date:date(q?.data?.price_session)})));
}
