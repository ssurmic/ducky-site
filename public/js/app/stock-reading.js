// Shared presentation of one reviewed stock conclusion, with its own clock.
import {cardDeck} from './card-deck.js';
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
const asOf=views=>typeof views?.generated_at==='string'&&/^\d{4}-\d{2}-\d{2}/.test(views.generated_at)?views.generated_at.slice(0,10):views?.session||'';
// When the reading was written, short: today's readings show the clock time, older ones the day.
export function writtenAt(views,now=new Date()){
  const at=new Date(views?.generated_at||'');
  if(!Number.isFinite(at.getTime()))return views?.session||'';
  const sameDay=at.toDateString()===now.toDateString();
  return new Intl.DateTimeFormat(LANG==='en'?'en-US':'zh-CN',sameDay?{hour:'2-digit',minute:'2-digit'}:{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(at);
}
// The one-line verdict (总评): the newest creator view or record first, then where the stock sits.
// It never goes blank once written: a reading whose facts have moved on keeps its own date under it.
export function overallLine(views){
  const text=pick(views?.overall);
  if(!text)return null;
  return el('div.stock-overall',views.stale?{class:'is-stale'}:{},el('p.stock-overall-text',text),
    views.stale?el('p.small.muted.stock-overall-date',s('watch.view_as_of',{date:asOf(views)})):null);
}
// One side of the reading as a table cell: the plain-language sentence with its side's colour,
// a date caption when the facts moved since it was written, and a pending note before the first one.
export function viewCell(views,side){
  const text=pick(views?.[side]);
  if(!text)return el('p.small.muted.watch-view-pending',s('watch.view_pending'));
  return el('div.watch-view',{class:'is-'+side},el('p.watch-view-text',text),
    el('p.small.muted.watch-view-date',s(views.stale?'watch.view_as_of':'watch.view_written',views.stale?{date:asOf(views)}:{time:writtenAt(views)})));
}
// The day's note: two readings written after the close from the row's facts, or nothing at all.
export function noteCard(views){
  if(!views||!pick(views.right)||!pick(views.left))return null;
  return el('div.stock-views.stock-card',
    el('p.stock-view.is-right',el('span.stock-view-label',s('watch.view_right')),pick(views.right)),
    el('p.stock-view.is-left',el('span.stock-view-label',s('watch.view_left')),pick(views.left)),
    el('p.small.muted.stock-views-note',s('watch.views_note')));
}
// A summary counts only when it is reviewed, has text and every citation resolves to a saved source.
export function hasSummary(item){
  const refs=item?.overview?.citations;
  return !!(['ready','refresh_pending'].includes(item?.status)&&pick(item?.overview)&&Array.isArray(refs)&&refs.length&&refs.every(id=>item.sources?.some(n=>n.id===id)));
}
// `columns`: the table shows the two sides in their own cells, so the note card stays out of the deck there.
export function reading(item,{citations=true,digest='',views=null,columns=false}={}){
  const accepted=hasSummary(item);
  const wrap=el('div.stock-reading');
  const overall=overallLine(views);
  if(overall)wrap.append(overall);
  if(!accepted){
    const state={read_pending:'summary_loading',read_failed:'summary_read_failed',failed:'analysis_unavailable',insufficient:'analysis_insufficient',
      source_changed:'analysis_source_changed',withdrawn:'analysis_withdrawn'}[item?.status];
    // Until a reviewed summary exists the row's own signal columns speak in one line; the
    // pending state stays visible underneath as a caption instead of taking the whole cell.
    const line=Array.isArray(digest)?digest:digest?[digest]:[];
    if(line.length){
      // Flashcards: the day's note (right side in blue, left side in amber) first, the digest line as
      // the facts behind it second; arrows, dots, keys and a swipe move between them.
      const digest=el('div.stock-card.is-digest',el('p.stock-digest',...line),el('p.small.muted.stock-digest-note',s(state?'focus.'+state:'watch.digest_note')));
      const note=columns?null:noteCard(views);
      wrap.append(note?cardDeck([{title:s('watch.card_note'),node:note},{title:s('watch.card_digest'),node:digest}],{label:s('watch.deck_label')}):digest);
      return wrap;
    }
    if(!overall)wrap.append(el('p.muted',s(state?'focus.'+state:item?.records===0?'focus.no_research':'focus.analysis_waiting')));
    return wrap;
  }
  const line=el('p.stock-one-sentence',pick(item.overview));
  const cited=[];
  if(citations)for(const id of item.overview.citations||[]){
    const source=item.sources?.find(n=>n.id===id);
    if(!source)continue;cited.push(source);
    line.append(el('button.brief-citation',{type:'button',onclick:()=>detail(source,{readingTicker:item.ticker,...(item.status==='refresh_pending'?{analysisAt:item.as_of}:{})}),
      'data-reading-key':`${item.ticker}:citation:${id}`,'aria-label':s('focus.read_source')},String(item.sources.indexOf(source)+1)));
  }
  const summary=el('div.stock-card.is-summary',line);
  if(cited.length)summary.append(citationList(item,cited));
  summary.append(el('p.small.muted.stock-analysis-date',s(item.status==='refresh_pending'?'focus.previous_analysis':'focus.analysis_date',{date:localTime(item.as_of)})));
  const note=columns?null:noteCard(views);
  wrap.append(note?cardDeck([{title:s('watch.card_summary'),node:summary},{title:s('watch.card_note'),node:note}],{label:s('watch.deck_label')}):summary);
  return wrap;
}
const dateOnly=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):'—';
// The cited records spelled out under the sentence: who, which way, when, and which one is newest.
// Each row is the same stored source the inline number opens; nothing is re-fetched or inferred.
export function citationList(item,cited){
  const stamp=n=>Date.parse(n.published_at||n.observed_at)||0,newest=Math.max(0,...cited.map(stamp));
  const list=el('ol.stock-citations',{'aria-label':s('focus.cited_sources')});
  for(const source of cited){
    const authors=[...new Set((source.evidence||[]).map(e=>e.author).filter(Boolean))];
    const stance=['support','counter','context'].includes(source.stance)?source.stance:'context';
    list.append(el('li',el('button.stock-citation',{type:'button','data-reading-key':`${item.ticker}:cited:${source.id}`,
      onclick:()=>detail(source,{readingTicker:item.ticker,...(item.status==='refresh_pending'?{analysisAt:item.as_of}:{})})},
      el('span.stock-citation-n',String(item.sources.indexOf(source)+1)),
      el('span.stock-citation-text',el('span.stock-citation-who',el('span.stock-citation-stance',{class:'is-'+stance},s('evidence.'+stance)),el('span',authors.join(' · ')||s('evidence.recorded_data'))),
        el('span.stock-citation-title',pick(source.title))),
      el('span.stock-citation-when',el('span',dateOnly(source.published_at||source.observed_at)),
        cited.length>1&&newest&&stamp(source)===newest?el('span.stock-citation-latest',s('focus.latest_source')):null))));
  }
  return list;
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
export function researchRow(ticker,row,item,{digest='',views=null}={}){
  return el('article.stock-list-row',{'data-reading-anchor':ticker},
    el('header',el('a.stock-name',{href:stockHref(ticker),'data-reading-key':`${ticker}:name`},el('strong',ticker),el('span.muted',row?.company||'')),compactPrice(row)),
    reading({...item,ticker},{digest,views}),el('a.stock-open',{href:'#/evidence/'+encodeURIComponent(ticker),'data-reading-key':`${ticker}:map`,'data-tour':'stock.map','data-ticker':ticker},s('watch.open_map')+' →'),el('a.stock-open',{href:stockHref(ticker),'data-reading-key':`${ticker}:open`},s('focus.open_stock')+' →'));
}

export function dayWindow(now=new Date(),days=1){
  // Calendar boundaries belong to the viewer, not to a UTC ingestion batch.
  const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-days+1);
  return {since:start.toISOString(),until:now.toISOString()};
}
