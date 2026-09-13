// Presentation only: the hero is static build output (public snapshot + read-only counts).
// This script never fetches, never reads account state and never writes storage; it only
// owns the animation pause control and the pointer parallax of the background duck.
export function mountHomepage(root=document) {
 const hero=root.querySelector('[data-home-hero]');if(!hero)return()=>{};
 const win=root.defaultView||window,strings=root.querySelector('[data-home-strings]');
 const copy=strings?JSON.parse(strings.textContent):{};
 const remove=[],listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);remove.push(()=>node.removeEventListener(event,fn,options));};
 const reduce=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 const pause=hero.querySelector('[data-home-motion]');let paused=!!reduce?.matches,frame=0;
 const paint=()=>{
  hero.classList.toggle('motion-paused',paused);
  if(!pause)return;
  pause.disabled=!!reduce?.matches;pause.setAttribute('aria-pressed',String(paused));
  pause.textContent=reduce?.matches?(copy.reduced||pause.dataset.pause):paused?pause.dataset.play:pause.dataset.pause;
  if(paused){hero.style.removeProperty('--pointer-x');hero.style.removeProperty('--pointer-y');}
 };
 if(pause)listen(pause,'click',()=>{paused=!paused;paint();});
 paint();
 const suspended=()=>hero.classList.toggle('motion-suspended',root.hidden);listen(root,'visibilitychange',suspended);
 let observer;if(win.IntersectionObserver){observer=new win.IntersectionObserver(entries=>hero.classList.toggle('motion-suspended',!entries[0].isIntersecting||root.hidden),{threshold:0});observer.observe(hero);}
 if(reduce?.addEventListener)listen(reduce,'change',()=>{paused=reduce.matches;paint();});
 listen(hero,'pointermove',e=>{if(paused||reduce?.matches||e.pointerType==='touch'||frame)return;frame=win.requestAnimationFrame(()=>{frame=0;const r=hero.getBoundingClientRect();hero.style.setProperty('--pointer-x',((e.clientX-r.left)/r.width-.5)*14+'px');hero.style.setProperty('--pointer-y',((e.clientY-r.top)/r.height-.5)*10+'px');});},{passive:true});
 listen(hero,'pointerleave',()=>{hero.style.removeProperty('--pointer-x');hero.style.removeProperty('--pointer-y');});
 return()=>{remove.forEach(fn=>fn());observer?.disconnect();if(frame)win.cancelAnimationFrame(frame);};
}
if(typeof document!=='undefined')mountHomepage();
