// card-deck.js — a small flashcard deck for the Overview cell: one card visible at a time, dots
// underneath, previous/next buttons, arrow keys while the deck has focus, and a horizontal swipe
// on touch. Pure DOM, no library; the cards are whatever nodes the caller gives it.
import {el} from './ui.js';
import {s} from './strings.js';

const SWIPE_PX=40;

export function cardDeck(cards,{label='',initial=0}={}){
  const items=cards.filter(c=>c&&c.node);
  if(items.length<2)return items[0]?.node||null;
  let index=Math.min(Math.max(0,initial),items.length-1);
  const stage=el('div.card-deck-stage',{'aria-live':'polite'});
  const dots=el('div.card-deck-dots',{role:'tablist'});
  const title=el('span.card-deck-title');
  const prev=el('button.card-deck-nav.is-prev',{type:'button','aria-label':s('watch.deck_prev')},'‹');
  const next=el('button.card-deck-nav.is-next',{type:'button','aria-label':s('watch.deck_next')},'›');
  const deck=el('div.card-deck',{tabindex:0,role:'group','aria-label':label||s('watch.deck_label'),'data-cards':String(items.length)},
    el('div.card-deck-head',prev,title,next),stage,dots);
  for(const [i,card] of items.entries())dots.append(el('button.card-deck-dot',{type:'button',role:'tab','aria-label':card.title,'data-index':String(i),
    onclick:event=>{event.stopPropagation();show(i);}}));
  function show(i){
    index=(i+items.length)%items.length;
    stage.replaceChildren(items[index].node);
    title.textContent=items[index].title;
    deck.dataset.index=String(index);
    dots.querySelectorAll('.card-deck-dot').forEach((dot,j)=>{dot.classList.toggle('is-active',j===index);dot.setAttribute('aria-selected',String(j===index));});
  }
  prev.onclick=event=>{event.stopPropagation();show(index-1);};
  next.onclick=event=>{event.stopPropagation();show(index+1);};
  deck.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();show(index-1);}
    else if(event.key==='ArrowRight'){event.preventDefault();show(index+1);}
  });
  let startX=null,startY=null;
  deck.addEventListener('touchstart',event=>{const t=event.touches[0];startX=t.clientX;startY=t.clientY;},{passive:true});
  deck.addEventListener('touchend',event=>{
    if(startX===null)return;const t=event.changedTouches[0],dx=t.clientX-startX,dy=t.clientY-startY;startX=startY=null;
    if(Math.abs(dx)>SWIPE_PX&&Math.abs(dx)>Math.abs(dy)*1.5)show(dx<0?index+1:index-1);
  },{passive:true});
  show(index);
  return deck;
}
