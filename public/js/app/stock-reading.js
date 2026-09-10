// Shared presentation of one reviewed stock conclusion, with its own clock.
import {el,px,pct,dateTime,errorBox} from './ui.js';
import {s,LANG} from './strings.js';
import {currentQuote} from './watchlist-overview.js';
import {detail} from './views/evidence.js';

export const pick=value=>value?.[LANG==='en'?'en':'zh']||'';
export const researchError=(error,retry)=>errorBox(error?.status===0?error:new Error(s('focus.research_read_failed')),retry);
export const stockHref=(ticker,from='watchlist')=>'#/stock/'+encodeURIComponent(ticker)+(['today','explore'].includes(from)?'?from='+from:'');
export function localTime(value){
  if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const date=new Date(value);
  return value&&Number.isFinite(date.getTime())?new Intl.DateTimeFormat(LANG==='en'?'en-US':'zh-CN',
    {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(date):'—';
}
export function reading(item,{citations=true}={}){
  const refs=item?.overview?.citations;
  const accepted=['ready','refresh_pending'].includes(item?.status)&&pick(item?.overview)&&
    Array.isArray(refs)&&refs.length&&refs.every(id=>item.sources?.some(n=>n.id===id));
  const wrap=el('div.stock-reading');
  if(!accepted){
    wrap.append(el('p.muted',s(item?.status==='read_failed'?'focus.summary_read_failed':item?.records?'focus.analysis_waiting':'focus.no_research')));
    return wrap;
  }
  const line=el('p.stock-one-sentence',pick(item.overview));
  if(citations)for(const id of item.overview.citations||[]){
    const source=item.sources?.find(n=>n.id===id);
    if(source)line.append(el('button.brief-citation',{type:'button',onclick:()=>detail(source,item.status==='refresh_pending'?{analysisAt:item.as_of}:{}),
      'aria-label':s('focus.read_source')},String(item.sources.indexOf(source)+1)));
  }
  wrap.append(line,el('p.small.muted',s(item.status==='refresh_pending'?'focus.previous_analysis':'focus.analysis_date',{date:localTime(item.as_of)})));
  return wrap;
}
export function compactPrice(row){
  if(!row)return el('p.small.muted',s('focus.price_missing'));
  const fresh=currentQuote(row),value=fresh||row;
  const valid=Number.isFinite(value.price)&&value.price>0;
  const wrap=el('div.stock-price',el('strong.mono',valid?px(value.price):'—'),
    Number.isFinite(value.change_pct)?el('span.mono',{class:value.change_pct>0?'pos':value.change_pct<0?'neg':''},pct(value.change_pct)):null);
  wrap.append(el('small.muted',fresh?s('focus.quote_date',{date:localTime(fresh.quote_at)}):
    valid?s(row.price_status==='retained'?'focus.saved_close_date':'focus.close_date',{date:row.price_session||'—'}):s('focus.price_missing')));
  if(fresh)wrap.append(el('details.stock-price-source',el('summary',s('focus.price_source')),
    el('p.small',fresh.provider+' · '+fresh.feed),el('p.small',s('focus.quote_date',{date:dateTime(fresh.quote_at)}))));
  return wrap;
}
export function researchRow(ticker,row,item){
  return el('article.stock-list-row',
    el('header',el('a.stock-name',{href:stockHref(ticker)},el('strong',ticker),el('span.muted',row?.company||'')),compactPrice(row)),
    reading(item),el('a.stock-open',{href:stockHref(ticker)},s('focus.open_stock')+' →'));
}

export function dayWindow(now=new Date(),days=1){
  // Calendar boundaries belong to the viewer, not to a UTC ingestion batch.
  const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-days+1);
  return {since:start.toISOString(),until:now.toISOString()};
}
