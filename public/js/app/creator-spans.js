import {el} from './ui.js';
import {s} from './strings.js';

export function verifiedSpans(post){
  return (post.reviewed_spans||[]).filter(row=>['attributed_opinion','verified_mention_no_direction'].includes(row.basis));
}
export function spanSection(rows,tickers=null){
  const items=verifiedSpans({reviewed_spans:rows}).filter(row=>!tickers||tickers.includes(row.ticker));
  if(!items.length)return null;
  const lang=document.documentElement.lang?.startsWith('en')?'en':'zh';
  const section=el('section.creator-reviewed-spans',el('h3',s('creators.shared_spans')),el('p.small.muted',s('creators.shared_spans_note')));
  for(const row of items.slice(0,6)){
    const card=el('article',el('span.small.muted',String(row.published_at||'').slice(0,10)+' · '+row.ticker+' · '+s(row.intent==='mention'?'creators.mention_only':'creators.verified_view')),
      el('p',row.title?.[lang]||row.title?.zh||''));
    try{const url=new URL(row.source_url);if(url.protocol==='https:'&&['youtube.com','www.youtube.com','youtu.be'].includes(url.hostname)&&!url.username&&!url.password){
      const seconds=Math.floor(row.start_seconds||0);card.append(el('a.small',{href:url.href,target:'_blank',rel:'noopener noreferrer'},Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' · '+s('creatorpage.source')+' ↗'));
    }}catch{}
    card.append(el('a.small',{href:'#/evidence/'+encodeURIComponent(row.ticker)},s('evidence.title')));
    section.append(card);
  }
  return section;
}
