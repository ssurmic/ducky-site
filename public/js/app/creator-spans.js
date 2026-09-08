import {el} from './ui.js';
import {s} from './strings.js';

export function verifiedSpans(post){
  return (post.reviewed_spans||[]).filter(row=>['attributed_opinion','verified_mention_no_direction'].includes(row.basis));
}
export function spanSection(rows,tickers=null,focus=''){
  const items=verifiedSpans({reviewed_spans:rows}).filter(row=>!tickers||tickers.includes(row.ticker));
  if(!items.length)return null;
  const lang=document.documentElement.lang?.startsWith('en')?'en':'zh';
  const section=el('section.creator-reviewed-spans',el('h3',s('creators.shared_spans')),el('p.small.muted',s('creators.shared_spans_note')));
  const more=items.length>6?el('details.creator-spans-more',el('summary',s('creators.more_spans',{n:items.length-6}))):null;
  for(const [i,row] of items.entries()){
    const card=el('article',{'data-point-id':row.point_id||'',class:row.point_id===focus?'is-focused':'','tabindex':row.point_id===focus?-1:null},el('span.small.muted',String(row.published_at||'').slice(0,10)+' · '+row.ticker+' · '+s(row.intent==='mention'?'creators.mention_only':'creators.verified_view')),
      el('p',row.title?.[lang]||row.title?.zh||''));
    if(['support','counter'].includes(row.stance)){
      card.classList.add('is-'+row.stance);
      card.prepend(el('span.cr-take',{class:row.stance==='support'?'bull':'bear'},s('creators.take_'+(row.stance==='support'?'bull':'bear'))));
    }
    if(row.reason?.[lang])card.append(el('p.small',row.reason[lang]));
    if(row.evidence)card.append(el('details',{open:row.point_id===focus},el('summary',s('creators.evidence')),el('blockquote',row.evidence)));
    try{const url=new URL(row.source_url);if(url.protocol==='https:'&&['youtube.com','www.youtube.com','youtu.be'].includes(url.hostname)&&!url.username&&!url.password){
      const seconds=Math.floor(row.start_seconds||0);card.append(el('a.small',{href:url.href,target:'_blank',rel:'noopener noreferrer'},Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' · '+s('creatorpage.source')+' ↗'));
    }}catch{}
    card.append(el('a.small',{href:'#/evidence/'+encodeURIComponent(row.ticker)},s('evidence.title')));
    (i>=6?more:section).append(card);
    if(i>=6&&row.point_id===focus)more.open=true;
  }
  if(more)section.append(more);
  return section;
}
