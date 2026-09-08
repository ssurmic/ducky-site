const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
  Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

export function quoteModel(doc,ticker) {
  if(doc?.ticker!==ticker||!Array.isArray(doc.bars)||!doc.bars.length)return null;
  // Reject partial/bad sequences instead of drawing over gaps or substituting zero.
  const rows=doc.bars.slice(-30);
  if(rows.some((r,i)=>!day(r.t)||r.t>new Date().toISOString().slice(0,10)||
    !Number.isFinite(r.c)||r.c<=0||(i&&rows[i-1].t>=r.t)))return null;
  const last=rows.at(-1);if(doc.last_d!==last.t)return null;
  const lo=Math.min(...rows.map(r=>r.c)),hi=Math.max(...rows.map(r=>r.c));
  const context=doc.session_context;
  const checked=Date.parse(context?.checked_at),age=Date.now()-checked;
  const status=context?.price_session===last.t&&Number.isFinite(age)&&age>=0&&age<30*60*1000?context.status:'unchecked';
  return {price:last.c.toFixed(2),date:last.t,status,expected:context?.expected_session,
    points:rows.map((r,i)=>`${(i/(rows.length-1||1)*140).toFixed(1)},${(28-(r.c-lo)/(hi-lo||1)*24).toFixed(1)}`).join(' ')};
}

export function mountTour(root) {
  const buttons=[...root.querySelectorAll('[data-tool]')],panels=[...root.querySelectorAll('.desk-feature')];
  const picker=root.querySelector('[data-tool-select]');
  const doc=root.ownerDocument,win=doc.defaultView,remove=[];
  const listen=(node,event,fn)=>{node.addEventListener(event,fn);remove.push(()=>node.removeEventListener(event,fn));};
  const select=(button,{scroll=false,focus=false}={})=>{
    for(const b of buttons)b.setAttribute('aria-pressed',String(b===button));
    if(picker)picker.value=button.dataset.tool;
    for(const p of panels)p.hidden=p.id!==button.getAttribute('aria-controls');
    const panel=panels.find(p=>!p.hidden);
    if(scroll)panel?.scrollIntoView?.({block:'start',behavior:win.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    if(focus)panel?.focus({preventScroll:true});
  };
  const forHash=hash=>buttons.find(b=>'#'+b.getAttribute('aria-controls')===hash);
  const fromURL=()=>{const button=forHash(win.location.hash);if(button)select(button,{scroll:true});};
  const choose=button=>{
    select(button);
    // Keep a selected preview shareable without filling browser history on every tab.
    if(win.location.origin!=='null'){const url=new URL(win.location.href);url.hash=button.getAttribute('aria-controls');win.history.replaceState(null,'',url.href);}
  };
  buttons.forEach(button=>listen(button,'click',()=>choose(button)));
  if(picker)listen(picker,'change',()=>{const button=buttons.find(b=>b.dataset.tool===picker.value);if(button)choose(button);});
  listen(doc,'click',event=>{
    const link=event.target.closest('a[href]');if(!link||event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    let url;try{url=new URL(link.href,win.location.href);}catch{return;}
    if(url.origin!==win.location.origin||url.pathname!==win.location.pathname||(url.search&&url.search!==win.location.search))return;
    const button=forHash(url.hash);if(!button)return;
    // Feature links keep the visitor's selected homepage concept and theme.
    if(!url.search)url.search=win.location.search;
    event.preventDefault();if(win.location.hash!==url.hash)win.history.pushState(null,'',url.href);
    select(button,{scroll:true,focus:true});
  });
  listen(win,'hashchange',fromURL);listen(win,'popstate',fromURL);fromURL();
  return()=>remove.forEach(fn=>fn());
}

export function mountDuck(root,{fetcher=fetch}={}) {
  const duck=root.querySelector('.desk-duck'),anchor=root.querySelector('.duck-anchor');
  const message=root.querySelector('[data-duck-message]'),toggle=root.querySelector('[data-motion-toggle]');
  const sharedToggle=root.closest('[data-home-hero]')?.querySelector('[data-home-motion]');
  const fine=window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)'),reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const ctl=new AbortController();let alive=true,paused=false,visible=true,frame=0,timer=0;
  const reset=()=>{root.style.setProperty('--duck-x','0px');root.style.setProperty('--duck-y','0px');};
  function apply(){
    const enabled=fine.matches&&!reduce.matches;
    root.classList.toggle('motion-paused',paused||!enabled||!visible);
    toggle.hidden=!enabled||!!sharedToggle;toggle.textContent=paused?toggle.dataset.resume:toggle.dataset.pause;
    toggle.setAttribute('aria-pressed',String(paused));reset();
  }
  const pause=()=>{paused=!paused;apply();};
  const sharedPause=()=>{queueMicrotask(()=>{if(alive){paused=sharedToggle.getAttribute('aria-pressed')==='true';apply();}});};
  sharedToggle?.addEventListener('click',sharedPause);
  const move=e=>{
    if(paused||!visible||!fine.matches||reduce.matches||document.activeElement===duck)return;
    if(frame)cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      const r=anchor.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
      const distance=Math.hypot(dx,dy),strength=Math.max(0,1-distance/180)*14;
      root.style.setProperty('--duck-x',`${(-dx/(distance||1)*strength).toFixed(1)}px`);
      root.style.setProperty('--duck-y',`${(-dy/(distance||1)*strength).toFixed(1)}px`);
    });
  };
  const hello=()=>{clearTimeout(timer);message.textContent=root.dataset.reply;reset();timer=setTimeout(()=>{message.textContent=root.dataset.greeting;},2200);};
  root.addEventListener('pointermove',move);root.addEventListener('pointerleave',reset);duck.addEventListener('focus',reset);
  duck.addEventListener('click',hello);toggle.addEventListener('click',pause);fine.addEventListener('change',apply);reduce.addEventListener('change',apply);
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting!==false;apply();}):null;
  observer?.observe(root);apply();
  const timeout=setTimeout(()=>ctl.abort(),8000);
  let saved={};try{saved=JSON.parse(root.querySelector('[data-desk-quotes]')?.textContent||'{}');}catch{}
  function draw(card,model){
    if(!model)return;
    card.querySelector('[data-quote-price]').textContent='$'+model.price;
    card.querySelector('[data-quote-date]').textContent=model.date;
    const label=card.querySelector('[data-quote-status]');
    if(label)label.textContent=(label.dataset[model.status==='current'?'current':model.status==='stale'?'stale':'unchecked']||'').replace('{date}',model.expected||'');
    card.querySelector('polyline').setAttribute('points',model.points);
  }
  // Public daily-price cache only; never request a snapshot build or member research.
  const jobs=[...root.querySelectorAll('[data-quote]')].map(async card=>{
    draw(card,quoteModel(saved[card.dataset.quote],card.dataset.quote));
    try {
      const ticker=card.dataset.quote,url=root.dataset.api.replace(/\/$/,'')+'/public/prices/'+encodeURIComponent(ticker)+'.json?limit=30';
      const response=await fetcher(url,{credentials:'omit',signal:ctl.signal});if(!response.ok)return;
      const model=quoteModel(await response.json(),ticker);if(!alive||!model)return;
      draw(card,model);
    }catch{/* The rest of the homepage works without the data origin. */}
  });
  Promise.allSettled(jobs).then(()=>clearTimeout(timeout));
  return()=>{alive=false;ctl.abort();clearTimeout(timeout);clearTimeout(timer);cancelAnimationFrame(frame);observer?.disconnect();
    sharedToggle?.removeEventListener('click',sharedPause);
    root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',reset);duck.removeEventListener('focus',reset);
    duck.removeEventListener('click',hello);toggle.removeEventListener('click',pause);fine.removeEventListener('change',apply);reduce.removeEventListener('change',apply);};
}

if(typeof document!=='undefined'){
  document.querySelectorAll('[data-product-tour]').forEach(root=>mountTour(root));
  document.querySelectorAll('[data-duck-orbit]').forEach(root=>mountDuck(root));
}
