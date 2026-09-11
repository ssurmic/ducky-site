import {el} from './ui.js';
import {evidenceLink} from './evidence-link.js';
import {s} from './strings.js';
import {groundedClaim,claimQualifications} from './views/creator-claim.js';
import {readingOrder} from './reading-order.js';
import {spanGroups} from './creator-span-groups.js';

export function verifiedSpans(post){
  return (post.reviewed_spans||[]).filter(row=>['attributed_opinion','verified_mention_no_direction','self_reported_position_behavior'].includes(row.basis));
}
// The API retains extraction revisions separately. Readers see one set of
// viewpoints; the current source projection supersedes legacy calls per ticker.
export function legacyCalls(post){
  const covered=new Set(verifiedSpans(post).map(row=>row.ticker));
  return (post.calls||[]).filter(call=>groundedClaim(call)&&!covered.has(call.sym));
}
export function tickerViews(post){
  const byTicker=new Map();
  const add=(ticker,stance,pointId)=>{
    if(!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker||''))return;
    if(!byTicker.has(ticker))byTicker.set(ticker,{ticker,directions:new Set(),pointId});
    const value=byTicker.get(ticker);
    if(['bull','bear'].includes(stance)){value.directions.add(stance);value.pointId=pointId||value.pointId;}
  };
  for(const row of verifiedSpans(post))add(row.ticker,{support:'bull',counter:'bear'}[row.stance],row.point_id);
  for(const row of legacyCalls(post))add(row.sym,row.stance,row.point_id);
  return [...byTicker.values()].map(({ticker,directions,pointId})=>({ticker,pointId,
    stance:directions.size===1?[...directions][0]:directions.size>1?'mixed':'neutral'}));
}
export function viewpointTake(post,focus=''){
  const rows=verifiedSpans(post),focused=rows.find(row=>row.point_id===focus);
  if(focused)return {support:'bull',counter:'bear'}[focused.stance]||'neutral';
  const directions=new Set([...rows.map(row=>({support:'bull',counter:'bear'}[row.stance])),...legacyCalls(post).map(row=>row.stance)].filter(x=>['bull','bear'].includes(x)));
  return directions.size===1?[...directions][0]:'neutral';
}
export function spanSection(rows,tickers=null,focus='',{inline=false,preferredTickers=null}={}){
  const items=spanGroups(readingOrder(verifiedSpans({reviewed_spans:rows}).filter(row=>!tickers||tickers.includes(row.ticker)),{point:focus,tickers:preferredTickers}));
  if(!items.length)return null;
  const lang=document.documentElement.lang?.startsWith('en')?'en':'zh';
  const section=el('section.creator-reviewed-spans',{class:inline?'is-inline':''});
  if(!inline)section.append(el('h3',s('creators.shared_spans')));
  const more=items.length>6?el('details.creator-spans-more',el('summary',s('creators.more_spans',{n:items.slice(6).reduce((n,records)=>n+records.length,0)}))):null;
  for(const [i,records] of items.entries()){
    const row=records[0];
    const title=row.title?.[lang]||row.title?.zh||'',reason=row.reason?.[lang];
    const card=el('article',{'data-point-id':row.point_id||'',class:row.point_id===focus?'is-focused':'','tabindex':row.point_id===focus?-1:null},el('span.small.muted',String(row.published_at||'').slice(0,10)+' · $'+row.ticker+(row.intent==='mention'?' · '+s('creators.mention_only'):'')),
      el('p',title));
    if(['support','counter'].includes(row.stance)){
      card.classList.add('is-'+row.stance);
      card.prepend(el('span.cr-take',{class:row.stance==='support'?'cr-bull':'cr-bear'},s('creators.take_'+(row.stance==='support'?'bull':'bear'))));
    }
    // Omit only repeated display text; distinct qualifications and source rows remain.
    const text=value=>value.trim().replace(/\s+/g,' ');
    if(reason&&text(reason)!==text(title))card.append(el('p.small',reason));
    const qualifications=claimQualifications(row);if(qualifications)card.append(qualifications);
    if(records.length===1&&row.evidence)card.append(sourceExcerpt(row,{open:row.point_id===focus}));
    const jump=sourceJump(row);if(jump)card.append(jump);
    card.append(evidenceLink(row.ticker,row.point_id));
    if(records.length>1){
      const saved=el('details.creator-spans-more.creator-span-records',{open:records.some(r=>r.point_id===focus)},
        el('summary',s('creators.same_view_records',{n:records.length})),el('p.small.muted',s('creators.same_view_source')));
      for(const [n,record] of records.entries()){
        const receipt=el('article',{'data-source-point-id':record.point_id},
          el('p.small.muted',s('creators.source_record',{n:n+1})+(passage(record)?' · '+passage(record):'')));
        if(record.evidence)receipt.append(sourceExcerpt(record,{open:record.point_id===focus}));
        const original=sourceJump(record);if(original)receipt.append(original);
        receipt.append(evidenceLink(record.ticker,record.point_id));saved.append(receipt);
      }
      card.append(saved);
    }
    (i>=6?more:section).append(card);
    if(i>=6&&row.point_id===focus)more.open=true;
  }
  if(more)section.append(more);
  return section;
}

const timestamp=value=>Number.isFinite(value)&&value>=0?Math.floor(value/60)+':'+String(Math.floor(value)%60).padStart(2,'0'):'';
function passage(row){
  const start=timestamp(row.start_seconds),end=timestamp(row.end_seconds);
  return start+(start&&end&&row.end_seconds>=row.start_seconds?'–'+end:'');
}
function sourceJump(row){
  try{const url=new URL(row.source_url);if(url.protocol==='https:'&&['youtube.com','www.youtube.com','youtu.be'].includes(url.hostname)&&!url.username&&!url.password){
    const start=timestamp(row.start_seconds);
    return el('a.small',{href:url.href,target:'_blank',rel:'noopener noreferrer'},(start?start+' · ':'')+s('creatorpage.source')+' ↗');
  }}catch{}
  return null;
}

export function sourceExcerpt(row,{open=false}={}){
  if(!row.evidence)return null;
  const reading=row.evidence_reading;
  const corrected=reading?.version==='creator-terminology/2' && typeof reading.text==='string' && reading.text && reading.terms?.length;
  const details=el('details',{open},el('summary',s(corrected?'creators.corrected_excerpt':'creators.evidence')));
  if(corrected){
    details.append(el('p.small.muted',s('creators.caption_term_corrected',{terms:reading.terms.map(t=>t.term).join(', ')})),
      el('blockquote',reading.text),el('details',el('summary',s('creators.original_caption')),el('blockquote',row.evidence)));
  }else details.append(el('blockquote',row.evidence));
  return details;
}
