// A portable image of one visible evidence card. No account data, API writes or new analysis.
import {el,modal,dateTime} from './ui.js';
import {s,LANG} from './strings.js';
import {eventLabel,eventDate} from './evidence-event.js';

const text=v=>typeof v==='string'?v.trim():'';
const pick=v=>text(v?.[LANG==='en'?'en':'zh']);
const day=v=>/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(v||'')?v.slice(0,10):'—';
function sourceURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}

export function shareCard(node,{ticker,recorded_at,archive=false,example=false,status}={}){
  if(!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker||'')||!pick(node?.title))throw Error('unavailable');
  const evidence=Array.isArray(node.evidence)?node.evidence:[];
  if(evidence.some(e=>['retracted','superseded'].includes(e.attribution_status)))throw Error('unavailable');
  const notes=[];
  if(archive||example)notes.push(s('share.historical'));
  if(status==='stale'||evidence.some(e=>e.freshness==='stale'))notes.push(s('share.dated'));
  if(node.conditional)notes.push(s('evidence.conditional'));
  if(text(node.condition_text))notes.push(s('creators.stated_condition')+': '+text(node.condition_text));
  if(text(node.horizon_text))notes.push(s('creators.stated_horizon')+': '+text(node.horizon_text));
  for(const e of evidence){
    if(e.basis==='self_reported_position_behavior')notes.push(s('creatorclaim.intent_self_reported'));
    if(text(e.condition_text))notes.push(s('creators.stated_condition')+': '+text(e.condition_text));
    if(text(e.horizon_text))notes.push(s('creators.stated_horizon')+': '+text(e.horizon_text));
    if(e.kind==='fact'){
      if(day(e.data?.as_of)!=='—')notes.push(s('comparison.as_of',{date:day(e.data.as_of)}));
      if(day(e.data?.start)!=='—'&&day(e.data?.end)!=='—')notes.push(s('comparison.window',{start:day(e.data.start),end:day(e.data.end)}));
    }
  }
  const sources=evidence.map(e=>({
    author:e.author?(e.kind==='creator'?s('evidence.creator_author',{name:text(e.author)}):text(e.author)):s('evidence.recorded_data'),
    published:day(e.published_at),url:sourceURL(e.source_url)
  }));
  // Allowlist only the selected card's public-facing fields. Never serialize the map or session.
  const recorded=recorded_at||node.recorded_at||node.observed_at;
  const result={ticker,title:pick(node.title),summary:pick(node.reason)!==pick(node.title)?pick(node.reason):'',
    label:eventLabel(node),stance:['support','counter','context'].includes(node.stance)?node.stance:'context',
    date:eventDate(node)?s('evidence.event_date',{at:eventDate(node)}):s('evidence.published',{at:day(node.published_at)}),
    recorded:s('share.saved',{at:recorded?.includes('T')?dateTime(recorded):day(recorded)}),
    notes:[...new Set(notes)],sources:sources.slice(0,3),
    more:Math.max(0,sources.length-3)+(Number.isInteger(node.evidence_omitted)?Math.max(0,node.evidence_omitted):0)};
  // A pathological source must not produce an unbounded canvas or silently lose qualifications.
  if(JSON.stringify(result).length>12000)throw Error('unavailable');
  return result;
}

export function wrapText(ctx,value,width){
  const lines=[];
  // Keep words together in English; CJK and long URLs can wrap at character boundaries.
  for(const paragraph of String(value).split('\n')){
    let line='';
    for(const token of paragraph.match(/[A-Za-z0-9’'.,:%$+−-]+\s*|[^\x00-\x7F]|\s+|./gu)||[]){
      if(ctx.measureText(line+token).width<=width){line+=token;continue;}
      if(line.trim())lines.push(line.trimEnd());line='';
      for(const char of token){
        if(line&&ctx.measureText(line+char).width>width){lines.push(line.trimEnd());line='';}
        line+=char;
      }
    }
    if(line.trim())lines.push(line.trimEnd());
  }
  return lines;
}

export async function renderCardImage(card){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  if(!ctx)throw Error('unavailable');
  const width=960,pad=64,content=width-2*pad,font='-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const blocks=[];let y=176;
  function block(value,size=27,color='#374151',gap=20,weight=400){
    if(!value)return;
    ctx.font=`${weight} ${size}px ${font}`;
    const lines=wrapText(ctx,value,content),height=Math.ceil(size*1.5);
    blocks.push({lines,size,color,weight,y,height});y+=lines.length*height+gap;
  }
  block(card.ticker+' · '+card.label,25,card.stance==='counter'?'#a33934':card.stance==='support'?'#27663c':'#525f71',22,650);
  block(card.title,40,'#16251d',24,700);
  block(card.summary,29,'#37463d',24);
  for(const note of card.notes)block(note,24,'#765c32',16);
  block(card.date,23,'#647166',6);block(card.recorded,23,'#647166',22);
  const divider=y;y+=26;
  for(const source of card.sources){
    const host=source.url?new URL(source.url).hostname.replace(/^www\./,''):'';
    block(source.author+' · '+source.published+(host?' · '+host:''),22,'#59675f',10);
  }
  if(card.more)block(s('evidence.more_sources',{n:card.more}),22,'#59675f',10);
  const source=card.sources.find(v=>v.url)?.url;
  let qr=null;
  if(source&&typeof window.qrcode==='function'){
    try{qr=window.qrcode(0,'M');qr.addData(source);qr.make();}catch{qr=null;}
  }
  const qrUnit=qr?Math.max(2,Math.floor(170/(qr.getModuleCount()+8))):0;
  const qrSize=qr?(qr.getModuleCount()+8)*qrUnit:0;
  const footer=y+20,height=footer+(qr?Math.max(220,qrSize+72):120);
  if(height>6000)throw Error('unavailable');
  canvas.width=width;canvas.height=height;
  ctx.fillStyle='#f8faf5';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#c7dfb2';ctx.fillRect(0,0,width,10);
  ctx.textBaseline='top';ctx.fillStyle='#16251d';ctx.font=`700 29px ${font}`;ctx.fillText('Ducky Bot',pad+70,64);
  ctx.fillStyle='#68776b';ctx.font=`400 20px ${font}`;ctx.fillText(s('share.card_type'),pad+70,104);
  const mark=new Image();mark.src='/duck-head-cutout-v1.png';
  try{await mark.decode();ctx.drawImage(mark,pad,60,54,64);}catch{/* Text brand remains readable offline. */}
  for(const b of blocks){ctx.font=`${b.weight} ${b.size}px ${font}`;ctx.fillStyle=b.color;b.lines.forEach((line,i)=>ctx.fillText(line,pad,b.y+i*b.height));}
  ctx.fillStyle='#dbe3d6';ctx.fillRect(pad,divider,content,1);
  ctx.fillStyle='#526254';ctx.font=`400 22px ${font}`;
  const footerWidth=qr?content-qrSize-35:content;
  wrapText(ctx,s('share.snapshot_note'),footerWidth).forEach((line,i)=>ctx.fillText(line,pad,footer+i*32));
  ctx.font=`600 22px ${font}`;ctx.fillText('duckybot.app',pad,footer+(qr?130:50));
  if(qr){
    const count=qr.getModuleCount(),unit=qrUnit,size=qrSize,x=width-pad-size,top=footer;
    ctx.fillStyle='#fff';ctx.fillRect(x,top,size,size);ctx.fillStyle='#16251d';
    for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(qr.isDark(row,col))ctx.fillRect(x+(col+4)*unit,top+(row+4)*unit,unit,unit);
    ctx.font=`400 19px ${font}`;ctx.fillText(s('share.scan_source'),x,top+size+10);
  }
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw Error('unavailable');
  return {blob,url:canvas.toDataURL('image/png')};
}

export async function openCardShare(node,context){
  const body=el('div.card-share-preview'),status=el('p.small.muted',{role:'status'},s('share.preparing'));
  body.append(el('p',s('share.hint')),status);modal(s('share.title'),body);
  try{
    const card=shareCard(node,context),{blob,url}=await renderCardImage(card);
    if(!body.isConnected)return;
    status.textContent='';
    const filename=`Ducky-${card.ticker}-${day(context.recorded_at||node.observed_at)}.png`;
    const image=el('img.card-share-image',{src:url,alt:card.ticker+' · '+card.title});
    const actions=el('div.card-share-actions');
    let file,canShare=false;
    try{file=new File([blob],filename,{type:'image/png'});canShare=Boolean(navigator.share&&navigator.canShare?.({files:[file]}));}catch{/* Saving the PNG remains available in older webviews. */}
    if(canShare){
      const button=el('button.btn.btn-primary',{type:'button',onclick:async()=>{
        button.disabled=true;status.textContent='';
        try{await navigator.share({files:[file],title:card.ticker+' · Ducky Bot'});}
        catch(error){if(error?.name!=='AbortError')status.textContent=s('share.failed');}
        finally{button.disabled=false;}
      }},s('share.send'));actions.append(button);
    }
    actions.append(el('a.btn.btn-ghost',{href:url,download:filename},s('share.save')));
    body.insertBefore(actions,status);body.append(image);
  }catch{if(body.isConnected)status.textContent=s('share.unavailable');}
}
