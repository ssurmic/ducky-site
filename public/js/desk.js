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
  return {price:last.c.toFixed(2),date:last.t,
    points:rows.map((r,i)=>`${(i/(rows.length-1||1)*140).toFixed(1)},${(28-(r.c-lo)/(hi-lo||1)*24).toFixed(1)}`).join(' ')};
}

export function mountTour(root) {
  const buttons=[...root.querySelectorAll('[data-tool]')],panels=[...root.querySelectorAll('.desk-feature')];
  const select=event=>{
    const button=event.currentTarget;
    for(const b of buttons)b.setAttribute('aria-pressed',String(b===button));
    for(const p of panels)p.hidden=p.id!==button.getAttribute('aria-controls');
  };
  buttons.forEach(b=>b.addEventListener('click',select));
  return()=>buttons.forEach(b=>b.removeEventListener('click',select));
}

export function mountDuck(root,{fetcher=fetch}={}) {
  const duck=root.querySelector('.desk-duck'),anchor=root.querySelector('.duck-anchor');
  const message=root.querySelector('[data-duck-message]'),toggle=root.querySelector('[data-motion-toggle]');
  const fine=window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)'),reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const ctl=new AbortController();let alive=true,paused=false,visible=true,frame=0,timer=0;
  const reset=()=>{root.style.setProperty('--duck-x','0px');root.style.setProperty('--duck-y','0px');};
  function apply(){
    const enabled=fine.matches&&!reduce.matches;
    root.classList.toggle('motion-paused',paused||!enabled||!visible);
    toggle.hidden=!enabled;toggle.textContent=paused?toggle.dataset.resume:toggle.dataset.pause;
    toggle.setAttribute('aria-pressed',String(paused));reset();
  }
  const pause=()=>{paused=!paused;apply();};
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
    root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',reset);duck.removeEventListener('focus',reset);
    duck.removeEventListener('click',hello);toggle.removeEventListener('click',pause);fine.removeEventListener('change',apply);reduce.removeEventListener('change',apply);};
}

if(typeof document!=='undefined'){
  document.querySelectorAll('[data-product-tour]').forEach(root=>mountTour(root));
  document.querySelectorAll('[data-duck-orbit]').forEach(root=>mountDuck(root));
}
