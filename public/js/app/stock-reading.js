// Shared presentation of one reviewed stock conclusion, with its own clock.
import {el,clear,px,pct,dateTime,errorBox,closeModal,toast} from './ui.js';
import {s,LANG} from './strings.js';
import {displayQuote,quoteLabel,quoteTime} from './watchlist-overview.js';
import {detail} from './views/evidence.js';
import {material} from './shared-read-refresh.js';

export const pick=value=>value?.[LANG==='en'?'en':'zh']||'';
export const researchError=(error,retry)=>errorBox(error?.status===0?error:new Error(s('focus.research_read_failed')),retry);
export const stockHref=(ticker,from='watchlist')=>'#/stock/'+encodeURIComponent(ticker)+(['today','explore'].includes(from)?'?from='+from:'');
// An in-place update keeps the reader's disclosures, keyboard target and row.
export function replaceReading(host,...children){
  const active=host.contains(document.activeElement)?document.activeElement?.closest('[data-reading-key]')?.dataset.readingKey:null;
  const opened=new Set([...host.querySelectorAll('details[open][data-reading-key]')].map(n=>n.dataset.readingKey));
  const scroller=host.closest('.app-main'),bounds=scroller?.getBoundingClientRect();
  const anchor=scroller?.scrollTop>0?[...host.querySelectorAll('[data-reading-anchor]')].find(n=>{
    const box=n.getBoundingClientRect();return box.bottom>bounds.top&&box.top<bounds.bottom;
  }):null;
  const key=anchor?.dataset.readingAnchor,before=anchor?.getBoundingClientRect().top;
  clear(host).append(...children);
  for(const n of host.querySelectorAll('details[data-reading-key]'))if(opened.has(n.dataset.readingKey))n.open=true;
  if(active)[...host.querySelectorAll('[data-reading-key]')].find(n=>n.dataset.readingKey===active)?.focus({preventScroll:true});
  const after=key?[...host.querySelectorAll('[data-reading-anchor]')].find(n=>n.dataset.readingAnchor===key):null;
  if(after&&scroller)scroller.scrollTop+=after.getBoundingClientRect().top-before;
}
export function syncSourceDialog(ticker,sources){
  const dialog=document.querySelector('.evidence-detail[data-reading-ticker]');
  if(!dialog||dialog.dataset.readingTicker!==ticker)return;
  const valid=sources.some(n=>n.id===dialog.dataset.readingSource&&material(n,'/evidence/SOURCE')===dialog.dataset.readingProof);
  if(!valid){
    closeModal();toast(s('focus.source_updated'));
  }
}
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
    const state={read_pending:'summary_loading',read_failed:'summary_read_failed',failed:'analysis_unavailable',insufficient:'analysis_insufficient',
      source_changed:'analysis_source_changed',withdrawn:'analysis_withdrawn'}[item?.status];
    wrap.append(el('p.muted',s(state?'focus.'+state:item?.records===0?'focus.no_research':'focus.analysis_waiting')));
    return wrap;
  }
  const line=el('p.stock-one-sentence',pick(item.overview));
  if(citations)for(const id of item.overview.citations||[]){
    const source=item.sources?.find(n=>n.id===id);
    if(source)line.append(el('button.brief-citation',{type:'button',onclick:()=>detail(source,{readingTicker:item.ticker,...(item.status==='refresh_pending'?{analysisAt:item.as_of}:{})}),
      'data-reading-key':`${item.ticker}:citation:${id}`,'aria-label':s('focus.read_source')},String(item.sources.indexOf(source)+1)));
  }
  wrap.append(line,el('p.small.muted.stock-analysis-date',s(item.status==='refresh_pending'?'focus.previous_analysis':'focus.analysis_date',{date:localTime(item.as_of)})));
  return wrap;
}
export function compactPrice(row){
  if(!row)return el('p.small.muted',s('focus.price_missing'));
  const fresh=displayQuote(row),value=fresh||row;
  const valid=Number.isFinite(value.price)&&value.price>0;
  const wrap=el('div.stock-price',el('strong.mono',valid?px(value.price):'—'),
    Number.isFinite(value.change_pct)?el('span.mono',{class:value.change_pct>0?'pos':value.change_pct<0?'neg':''},pct(value.change_pct)):null);
  wrap.append(el('small.muted',fresh?quoteLabel(fresh)+' · '+quoteTime(fresh):
    valid?s(row.price_status==='retained'?'focus.saved_close_date':'focus.close_date',{date:row.price_session||'—'}):s('focus.price_missing')));
  if(fresh)wrap.append(el('details.stock-price-source',el('summary',s('focus.price_source')),
    el('p.small',fresh.provider+' · '+fresh.feed),el('p.small',s('focus.quote_date',{date:dateTime(fresh.quote_at)}))));
  return wrap;
}
export function researchRow(ticker,row,item){
  return el('article.stock-list-row',{'data-reading-anchor':ticker},
    el('header',el('a.stock-name',{href:stockHref(ticker),'data-reading-key':`${ticker}:name`},el('strong',ticker),el('span.muted',row?.company||'')),compactPrice(row)),
    reading({...item,ticker}),el('a.stock-open',{href:'#/evidence/'+encodeURIComponent(ticker),'data-reading-key':`${ticker}:map`,'data-tour':'stock.map','data-ticker':ticker},s('watch.open_map')+' →'),el('a.stock-open',{href:stockHref(ticker),'data-reading-key':`${ticker}:open`},s('focus.open_stock')+' →'));
}

export function dayWindow(now=new Date(),days=1){
  // Calendar boundaries belong to the viewer, not to a UTC ingestion batch.
  const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-days+1);
  return {since:start.toISOString(),until:now.toISOString()};
}
