// Public, cached snapshots only. No watchlist/account data, provider work or invented ticks.
export function snapshotQuote(doc, ticker) {
  const s=doc?.snapshot, price=s?.spot, built=doc?.built_at, epoch=doc?.snapshot_epoch;
  if(doc?.ticker!==ticker || s?.ticker!==ticker || s?.ok!==true || typeof price!=='number' || !Number.isFinite(price) || price<=0) return null;
  if(typeof built!=='string' || !Number.isFinite(Date.parse(built)) || typeof epoch!=='string' || !/^\d{4}-\d{2}-\d{2}:(CLOSED|RTH)$/.test(epoch)) return null;
  if(epoch.slice(0,10)>built.slice(0,10) || Date.parse(built)>Date.now()+60000) return null;
  return {ticker,price,built,epoch};
}
export function paintQuote(root, quote) {
  let changed=false;
  for(const card of root.querySelectorAll('[data-quote]')) {
    if(card.dataset.quote!==quote.ticker || Date.parse(card.dataset.built)>Date.parse(quote.built)) continue;
    card.querySelector('[data-quote-price]').textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(quote.price);
    card.querySelector('[data-quote-date]').textContent=quote.epoch.slice(0,10)+' · '+(quote.epoch.endsWith(':CLOSED')?root.dataset.close:root.dataset.snapshot);
    card.dataset.built=quote.built;changed=true;
  }
  return changed;
}
export function mountDuckTape(root) {
  const button=root.querySelector('[data-motion-toggle]'),body=root.ownerDocument.body;
  const hero=root.ownerDocument.querySelector('[data-home-hero]');
  let reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let paused=reduced||!!hero?.classList.contains('motion-paused'),onscreen=true,last=0,controller=null,timer=null,destroyed=false;
  const tickers=[...new Set([...root.querySelectorAll('[data-quote]')].map(n=>n.dataset.quote))].filter(t=>/^[A-Z][A-Z0-9.-]{0,9}$/.test(t)).slice(0,6);
  const api=String(window.DUCKY?.API_BASE||'').replace(/\/$/,'');
  function motion() {body.toggleAttribute('data-home-paused',paused);body.toggleAttribute('data-home-hidden',document.hidden||!onscreen);button.disabled=reduced;button.textContent=paused?root.dataset.resume:root.dataset.pause;button.setAttribute('aria-pressed',String(paused));}
  function toggle() {if(reduced)return;if(hero)document.dispatchEvent(new window.CustomEvent('ducky:homepage-motion-request',{detail:{paused:!paused}}));else {paused=!paused;motion();}}
  function sharedMotion(event){paused=event.detail.paused;reduced=event.detail.reduced;motion();}
  async function refresh() {
    if(destroyed||document.hidden||!onscreen||controller||!api||Date.now()-last<60000)return;
    last=Date.now();controller=new AbortController();const current=controller;
    const timeout=setTimeout(()=>current.abort(),6000);
    await Promise.allSettled(tickers.map(async ticker=>{
      const response=await fetch(api+'/public/ticker/'+encodeURIComponent(ticker)+'/snapshot.json',{signal:current.signal,credentials:'omit'});
      if(!response.ok)return;
      const quote=snapshotQuote(await response.json(),ticker);
      if(quote&&!destroyed)paintQuote(root,quote);
    }));
    clearTimeout(timeout);if(controller===current)controller=null;
  }
  function visibility(){motion();if(document.hidden)controller?.abort();else refresh();}
  button.hidden=false;button.addEventListener('click',toggle);body.classList.add('home-motion-ready');motion();
  document.addEventListener('visibilitychange',visibility);
  document.addEventListener('ducky:homepage-motion',sharedMotion);
  let observer=null;
  if(typeof IntersectionObserver!=='undefined') {observer=new IntersectionObserver(entries=>{onscreen=entries.some(e=>e.isIntersecting);motion();if(onscreen)refresh();else controller?.abort();});observer.observe(root);} else refresh();
  timer=setInterval(refresh,60000);
  function cleanup(){destroyed=true;clearInterval(timer);controller?.abort();observer?.disconnect();button.removeEventListener('click',toggle);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('ducky:homepage-motion',sharedMotion);body.classList.remove('home-motion-ready');body.removeAttribute('data-home-hidden');body.removeAttribute('data-home-paused');window.removeEventListener('pagehide',pagehide);}
  function pagehide(event){if(event.persisted)controller?.abort();else cleanup();}
  window.addEventListener('pagehide',pagehide);
  return cleanup;
}
if(typeof document!=='undefined')document.querySelectorAll('[data-duck-tape]').forEach(mountDuckTape);
