// Presentation only: the hero, the product preview and the creator cards are static build output
// (public snapshots + read-only counts). This script never fetches, never reads account state and
// never writes storage. It owns three things: the stock switcher in the hero, the product-preview
// tabs, and the animation pause control with the background duck's pointer parallax.
export function mountHomepage(root=document) {
 const hero=root.querySelector('[data-home-hero]');if(!hero)return()=>{};
 const win=root.defaultView||window,strings=root.querySelector('[data-home-strings]');
 const copy=strings?JSON.parse(strings.textContent):{};
 const remove=[],listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);remove.push(()=>node.removeEventListener(event,fn,options));};

 // Accessible tabs: every panel is already in the HTML; switching only toggles `hidden`.
 const mountTabs=(scope,tabAttr,panelAttr)=>{
  if(!scope)return;
  const tabs=[...scope.querySelectorAll(`[${tabAttr}]`)];
  const panelOf=tab=>scope.querySelector(`[${panelAttr}="${tab.getAttribute(tabAttr)}"]`);
  const select=(tab,focus=false)=>{
   tabs.forEach(t=>{const on=t===tab;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;const p=panelOf(t);if(p)p.hidden=!on;});
   if(focus)tab.focus({preventScroll:true});
  };
  tabs.forEach((tab,index)=>{
   listen(tab,'click',()=>select(tab));
   listen(tab,'keydown',e=>{
    let next=index;
    if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
    else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;
    e.preventDefault();select(tabs[next],true);
   });
  });
 };
 mountTabs(hero.querySelector('[data-home-signals]'),'data-signal-stock','data-signal-panel');
 mountTabs(root.querySelector('[data-product-preview]'),'data-preview-tab','data-preview-panel');

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
