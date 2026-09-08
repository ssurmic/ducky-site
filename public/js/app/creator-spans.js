import {el} from './ui.js';
import {evidenceLink} from './evidence-link.js';
import {s} from './strings.js';
import {groundedClaim,claimQualifications} from './views/creator-claim.js';

export function verifiedSpans(post){
  return (post.reviewed_spans||[]).filter(row=>['attributed_opinion','verified_mention_no_direction'].includes(row.basis));
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
export function spanSection(rows,tickers=null,focus='',{inline=false}={}){
  const items=verifiedSpans({reviewed_spans:rows}).filter(row=>!tickers||tickers.includes(row.ticker));
  if(!items.length)return null;
  const lang=document.documentElement.lang?.startsWith('en')?'en':'zh';
  const section=el('section.creator-reviewed-spans',{class:inline?'is-inline':''});
  if(!inline)section.append(el('h3',s('creators.shared_spans')));
  const more=items.length>6?el('details.creator-spans-more',el('summary',s('creators.more_spans',{n:items.length-6}))):null;
  for(const [i,row] of items.entries()){
    const card=el('article',{'data-point-id':row.point_id||'',class:row.point_id===focus?'is-focused':'','tabindex':row.point_id===focus?-1:null},el('span.small.muted',String(row.published_at||'').slice(0,10)+' · $'+row.ticker+(row.intent==='mention'?' · '+s('creators.mention_only'):'')),
      el('p',row.title?.[lang]||row.title?.zh||''));
    if(['support','counter'].includes(row.stance)){
      card.classList.add('is-'+row.stance);
      card.prepend(el('span.cr-take',{class:row.stance==='support'?'cr-bull':'cr-bear'},s('creators.take_'+(row.stance==='support'?'bull':'bear'))));
    }
    if(row.reason?.[lang])card.append(el('p.small',row.reason[lang]));
    const qualifications=claimQualifications(row);if(qualifications)card.append(qualifications);
    if(row.evidence)card.append(el('details',{open:row.point_id===focus},el('summary',s('creators.evidence')),el('blockquote',row.evidence)));
    try{const url=new URL(row.source_url);if(url.protocol==='https:'&&['youtube.com','www.youtube.com','youtu.be'].includes(url.hostname)&&!url.username&&!url.password){
      const seconds=Math.floor(row.start_seconds||0);card.append(el('a.small',{href:url.href,target:'_blank',rel:'noopener noreferrer'},Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' · '+s('creatorpage.source')+' ↗'));
    }}catch{}
    card.append(evidenceLink(row.ticker,row.point_id));
    (i>=6?more:section).append(card);
    if(i>=6&&row.point_id===focus)more.open=true;
  }
  if(more)section.append(more);
  return section;
}
