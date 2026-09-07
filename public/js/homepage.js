// Presentation only: static public examples, no API requests, account writes or analytics.
const designs=new Set(['focus','flow','brief']);
export function mountHomepage(root=document) {
 const hero=root.querySelector('[data-home-hero]');if(!hero)return()=>{};
 const win=root.defaultView||window,html=root.documentElement,copy=JSON.parse(root.querySelector('[data-home-strings]').textContent);
 const remove=[],listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);remove.push(()=>node.removeEventListener(event,fn,options));};
 const params=new URLSearchParams(win.location.search),review=root.querySelector('[data-home-review]');
 let design=designs.has(params.get('design'))?params.get('design'):'focus';
 const explicitTheme=()=>['light','dark'].includes(params.get('theme'))?params.get('theme'):null;
 const dark=win.matchMedia?.('(prefers-color-scheme: dark)'),reduce=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 const themeButton=root.querySelector('[data-home-theme]');
 const languageLinks=[...root.querySelectorAll('[data-lang-toggle],[data-lang-toggle-footer]')];
 const syncLinks=()=>languageLinks.forEach(link=>{const url=new URL(link.href,win.location.href);for(const key of ['design','theme']){params.has(key)?url.searchParams.set(key,params.get(key)):url.searchParams.delete(key);}link.href=url.href;});
 const setTheme=()=>{const chosen=explicitTheme()||(design==='brief'?'light':null);if(chosen)html.dataset.theme=chosen;else html.removeAttribute('data-theme');const isDark=chosen?chosen==='dark':!!dark?.matches;themeButton.textContent=isDark?themeButton.dataset.light:themeButton.dataset.dark;themeButton.setAttribute('aria-pressed',String(!isDark));};
 const applyDesign=()=>{html.dataset.homeDesign=design;const prefix=design==='focus'?'':design+'.';root.querySelector('[data-home-headline]').textContent=copy[prefix+'h1a'];root.querySelector('[data-home-headline-end]').textContent=copy[prefix+'h1b'];root.querySelector('[data-home-eyebrow]').textContent=copy[prefix+'eyebrow'];root.querySelectorAll('a[data-home-design]').forEach(link=>{if(link.dataset.homeDesign===design)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});setTheme();syncLinks();};
 review.hidden=!designs.has(params.get('design'));applyDesign();
 listen(win,'hashchange',syncLinks);languageLinks.forEach(link=>listen(link,'click',syncLinks));
 const updateURL=()=>{const url=new URL(win.location.href);url.search=params.toString();win.history.replaceState(null,'',url.href);syncLinks();};
 root.querySelectorAll('a[data-home-design]').forEach(link=>listen(link,'click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();design=link.dataset.homeDesign;params.set('design',design);applyDesign();updateURL();hero.scrollIntoView({block:'start',behavior:'instant'});}));
 listen(themeButton,'click',()=>{const isDark=html.dataset.theme==='dark'||(!html.dataset.theme&&dark?.matches);params.set('theme',isDark?'light':'dark');setTheme();updateURL();});
 const tabs=[...hero.querySelectorAll('[data-home-stock]')];
 const dialog=hero.querySelector('[data-home-dialog]'),dossier=root.getElementById('home-dossier');
 const placeholder=root.createElement('div');placeholder.hidden=true;placeholder.setAttribute('aria-hidden','true');
 dossier.before(placeholder);
 let opener=null,scrollPosition=[0,0],previousHash='',evidenceState=[];
 const openResearch=source=>{
  if(dialog.open||typeof dialog.showModal!=='function')return;
  opener=source||hero.querySelector('[data-home-open]');scrollPosition=[win.scrollX,win.scrollY];
  previousHash=win.location.hash==='#home-dossier'?'':win.location.hash;
  evidenceState=[...dossier.querySelectorAll('details')].map(d=>[d,d.open]);
  placeholder.style.height=dossier.getBoundingClientRect().height+'px';placeholder.hidden=false;
  dialog.append(dossier);dossier.querySelectorAll('details').forEach(d=>d.open=true);
  html.classList.add('home-dialog-open');dialog.showModal();dialog.scrollTop=0;
  dialog.querySelector('[data-home-close]').focus({preventScroll:true});
  if(win.location.hash!=='#home-dossier'){const url=new URL(win.location.href);url.hash='home-dossier';win.history.pushState(null,'',url.href);}
  syncLinks();
 };
 const restoreResearch=()=>{
  if(!placeholder.isConnected||placeholder.hidden)return;
  placeholder.after(dossier);placeholder.hidden=true;evidenceState.forEach(([d,open])=>d.open=open);
  html.classList.remove('home-dialog-open');
  if(win.location.hash==='#home-dossier'){const url=new URL(win.location.href);url.hash=previousHash;win.history.replaceState(null,'',url.href);}
  win.scrollTo(...scrollPosition);opener?.focus({preventScroll:true});syncLinks();
 };
 hero.querySelectorAll('[data-home-open]').forEach(link=>listen(link,'click',e=>{
  if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||typeof dialog.showModal!=='function')return;
  e.preventDefault();openResearch(link);
 }));
 listen(dialog.querySelector('[data-home-close]'),'click',()=>dialog.close());
 listen(dialog,'close',restoreResearch);
 let backdropDown=false;
 listen(dialog,'pointerdown',e=>{backdropDown=e.target===dialog;});
 listen(dialog,'click',e=>{if(backdropDown&&e.target===dialog)dialog.close();backdropDown=false;});
 const syncResearch=()=>{if(win.location.hash==='#home-dossier')openResearch();else if(dialog.open)dialog.close();};
 listen(win,'hashchange',syncResearch);listen(win,'popstate',syncResearch);
 syncResearch();
 const select=tab=>{tabs.forEach(t=>{const on=t===tab;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;root.getElementById(t.getAttribute('aria-controls')).hidden=!on;});hero.classList.remove('story-enter');void hero.offsetWidth;hero.classList.add('story-enter');};
 tabs.forEach((tab,index)=>{listen(tab,'click',()=>select(tab));listen(tab,'keydown',e=>{let next=index;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();select(tabs[next]);tabs[next].focus();});});
 const pause=hero.querySelector('[data-home-motion]');let paused=!!reduce?.matches,frame=0;
 const paint=()=>{hero.classList.toggle('motion-paused',paused);pause.disabled=!!reduce?.matches;pause.setAttribute('aria-pressed',String(paused));pause.textContent=reduce?.matches?copy.reduced:paused?pause.dataset.play:pause.dataset.pause;if(paused){hero.style.removeProperty('--pointer-x');hero.style.removeProperty('--pointer-y');}};
 listen(pause,'click',()=>{paused=!paused;paint();});paint();
 const suspended=()=>hero.classList.toggle('motion-suspended',root.hidden);listen(root,'visibilitychange',suspended);
 let observer;if(win.IntersectionObserver){observer=new win.IntersectionObserver(entries=>hero.classList.toggle('motion-suspended',!entries[0].isIntersecting||root.hidden),{threshold:0});observer.observe(hero);}
 if(reduce?.addEventListener)listen(reduce,'change',()=>{paused=reduce.matches;paint();});
 if(dark?.addEventListener)listen(dark,'change',setTheme);
 listen(hero,'pointermove',e=>{if(paused||reduce?.matches||e.pointerType==='touch'||frame)return;frame=win.requestAnimationFrame(()=>{frame=0;const r=hero.getBoundingClientRect();hero.style.setProperty('--pointer-x',((e.clientX-r.left)/r.width-.5)*14+'px');hero.style.setProperty('--pointer-y',((e.clientY-r.top)/r.height-.5)*10+'px');});},{passive:true});
 listen(hero,'pointerleave',()=>{hero.style.removeProperty('--pointer-x');hero.style.removeProperty('--pointer-y');});
 return()=>{if(dialog.open){dialog.close();restoreResearch();}placeholder.remove();remove.forEach(fn=>fn());observer?.disconnect();if(frame)win.cancelAnimationFrame(frame);};
}
if(typeof document!=='undefined')mountHomepage();
