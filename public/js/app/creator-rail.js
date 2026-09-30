// Four source previews per page; state belongs to the caller's account/scope.
import {el} from './ui.js';
import {s} from './strings.js';

export function creatorRail(items,{key,label,state={}}={}){
  const pages=[];
  for(let i=0;i<items.length;i+=4)pages.push(items.slice(i,i+4));
  const found=items.findIndex(item=>item.id===state.anchor);
  let index=found<0?0:Math.floor(found/4),disposed=false;
  const track=el('div.creator-rail-track',{tabindex:0,'aria-label':label,'data-reading-key':key+':track'});
  pages.forEach((page,i)=>track.append(el('ol.creator-view-list.creator-rail-page',{'aria-label':s('creatorrail.page',{page:i+1,total:pages.length})},...page.map(item=>item.node))));
  const position=el('span.creator-rail-position',{'aria-live':'polite','aria-atomic':'true'});
  const prev=el('button.creator-rail-nav',{type:'button','aria-label':s('creatorrail.previous'),'data-reading-key':key+':previous',onclick:()=>show(index-1)},'‹');
  const next=el('button.creator-rail-nav',{type:'button','aria-label':s('creatorrail.next'),'data-reading-key':key+':next',onclick:()=>show(index+1)},'›');
  const controls=el('div.creator-rail-controls',prev,position,next);
  const node=el('div.creator-rail',{'data-rail-key':key},controls,track);
  function paint(){
    state.anchor=pages[index]?.[0]?.id||null;
    node.dataset.page=String(index);prev.disabled=index===0;next.disabled=index===pages.length-1;
    position.textContent=s('creatorrail.page',{page:index+1,total:pages.length});
    controls.hidden=pages.length<2;
  }
  function show(value){
    index=Math.max(0,Math.min(value,pages.length-1));paint();
    // Immediate movement keeps button, reduced-motion and swipe behavior consistent.
    track.scrollLeft=index*track.clientWidth;
  }
  track.addEventListener('scroll',()=>{if(disposed||!track.clientWidth)return;
    const value=Math.max(0,Math.min(Math.round(track.scrollLeft/track.clientWidth),pages.length-1));
    if(value!==index){index=value;paint();}
  },{passive:true});
  track.addEventListener('keydown',event=>{if(event.target!==track)return;
    if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();show(event.key==='Home'?0:event.key==='End'?pages.length-1:index+(event.key==='ArrowRight'?1:-1));
    }
  });
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{if(!disposed)track.scrollLeft=index*track.clientWidth;}):null;
  observer?.observe(track);paint();
  const mounted=()=>{if(!disposed)track.scrollLeft=index*track.clientWidth;};
  if(window.requestAnimationFrame)window.requestAnimationFrame(mounted);else queueMicrotask(mounted);
  return {node,dispose:()=>{disposed=true;observer?.disconnect();}};
}
