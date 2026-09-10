import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html lang="en"><body><main id="view"></main></body></html>',{url:'https://ducky.test/app/#/watchlist'});
for(const k of ['window','document','Node','location','history','localStorage'])globalThis[k]=dom.window[k];
globalThis.requestAnimationFrame=fn=>{fn();return 0;};
const copy=JSON.parse(readFileSync('i18n/en.json'));const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {treemap,weighted,changeClass,heatColor,overviewView,layoutOverview}=await import('../public/js/app/watchlist-overview.js');
const store=await import('../public/js/app/store.js');
const {mount}=await import('../public/js/app/views/watchlist.js');
const row=(ticker,cap,change=0)=>({ticker,company:ticker+' Company',market_cap:cap,market_cap_status:'ready',market_cap_currency:'USD',market_cap_as_of:'2026-09-07T00:00:00Z',price:100,price_status:'ready',change_pct:change});

test('recent provider quote is separate from the completed close and expires by its trade clock',async()=>{
 const {currentQuote}=await import('../public/js/app/watchlist-overview.js');
 const at=Date.now();const r={...row('NVDA',1e9),quote:{status:'current',price:105,change_pct:null,quote_at:new Date(at).toISOString(),provider:'alpaca',feed:'iex'}};
 assert.equal(currentQuote(r,at)?.price,105);
 assert.equal(currentQuote(r,at+180001),null);
 assert.equal(currentQuote(r,at-1),null);
 const list=overviewView([r],{view:'list',session:'2026-09-08',onSelect:()=>{}});
 assert.match(list.querySelector('.watch-row-price').textContent,/105/);
 assert.match(list.querySelector('.watch-quote').textContent,/Latest quote/);
 assert.doesNotMatch(list.querySelector('.watch-change').textContent,/0\.00/); // no inherited daily change
 const map=overviewView([r],{view:'heatmap',area:'equal',session:'2026-09-08',onSelect:()=>{}});
 assert.match(map.querySelector('.watch-tile-price').textContent,/100/);
 const stale=overviewView([{...r,quote:{...r.quote,status:'stale'}}],{view:'list',onSelect:()=>{}});
 assert.match(stale.querySelector('.watch-row-price').textContent,/100/);
});

test('missing YTD identifies the unavailable input instead of claiming a small sample',()=>{
 const r={...row('NVDA',1e9),metrics:{ytd:{status:'insufficient',reason:'adjustment_vintage_mismatch'}}};
 const list=overviewView([r],{view:'list',onSelect:()=>{}});
 assert.match(list.querySelector('[data-metric="ytd"]').textContent,/Adjusted prices awaiting update/);
});

test('shared price refresh updates the visible list while keeping selection, filters and open research intact',async()=>{
 const {sharedReadRefresh}=await import('../public/js/app/shared-read-refresh.js');
 Object.defineProperty(document,'visibilityState',{get:()=>'visible',configurable:true});
 store.bumpEpoch();store.set('me',{tier:'pro',watch_cap:50});store.set('watchlist',[]);store.set('snapshots',{});
 let value={items:['AVGO'],cap:50,overview:{items:[row('AVGO',1e9)],session:'2026-09-08'}};
 const calls=[];globalThis.fetch=async url=>{calls.push(String(url));return new Response(JSON.stringify(String(url)==='/watchlist'?value:{snapshot:{ok:false}}),{headers:{'content-type':'application/json'}});};
 const root=document.querySelector('main'),refresh=sharedReadRefresh(root,{reload:()=>assert.fail('automatic full page reload')});
 const dispose=await mount(root);
 const filter=root.querySelector('.watch-filter');filter.value='AVGO';filter.dispatchEvent(new window.Event('input'));
 root.querySelector('[data-open="AVGO"]').click();await new Promise(r=>setTimeout(r,0));
 const detail=root.querySelector('.watch-detail'),card=detail.firstElementChild;
 root.querySelector('.watch-metric-method').open=true;root.querySelector('.watch-metric-source').open=true;
 root.querySelector('.watch-map-link').focus();
 value={...value,overview:{...value.overview,items:[{...row('AVGO',1e9,2),price:102}]}};
 await refresh.check();
 assert.match(root.querySelector('.watch-overview').textContent,/102/);
 assert.equal(filter.value,'AVGO');assert.equal(detail.firstElementChild,card);assert.equal(detail.hidden,false);
 assert.equal(root.querySelector('aside').hidden,true);
 assert.equal(calls.filter(x=>x.startsWith('/snapshot/')).length,1);
 assert.equal(root.querySelector('.watch-metric-method').open,true);assert.equal(root.querySelector('.watch-metric-source').open,true);
 assert.equal(document.activeElement.dataset.mapOpen,'AVGO');
 // A remote deletion is not silently applied as a numeric update.
 value={...value,items:[],overview:{items:[]}};
 await refresh.check();await refresh.check();assert.equal(root.querySelector('aside').hidden,false);
 assert.deepEqual(store.get('watchlist'),['AVGO']);
 refresh.stop();dispose();root.replaceChildren();
});

test('treemap has exact market-cap areas without overlaps at 50 symbols',()=>{
 const rows=Array.from({length:50},(_,i)=>row('T'+i,10**(i/10)));
 const tiles=treemap(rows);const total=rows.reduce((n,r)=>n+r.market_cap,0);
 assert.equal(tiles.length,50);
 for(const a of tiles){assert.ok(Math.abs(a.w*a.h/600000-a.market_cap/total)<1e-10);assert.ok(a.x>=0 && a.y>=0 && a.x+a.w<=1000.00001 && a.y+a.h<=600.00001);
  for(const b of tiles)if(a!==b)assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<1e-8 || Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)<1e-8);
 }
 assert.equal(treemap([row('BAD',NaN),{...row('ETF',10),security_type:'ETF'}]).length,0);
});

test('zero, missing, losses and unweighted stocks stay distinguishable and clickable',()=>{
 const rows=[row('FLAT',10,0),row('LOSS',20,-2),row('MISSING',5,null),{...row('ETF',20,1),security_type:'ETF'}, {...row('OLD',10),market_cap_status:'stale'}];
 let selected;const view=overviewView(rows,{view:'heatmap',onSelect:t=>selected=t,session:'2026-09-04'});
 assert.equal(view.querySelectorAll('.watch-tile').length,3);
 assert.ok(view.querySelector('.watch-tile.watch-flat'));assert.ok(view.querySelector('.watch-tile.watch-unknown'));assert.ok(view.querySelector('.watch-tile.watch-down'));
 view.querySelector('[data-open="ETF"]').click();assert.equal(selected,'ETF');
 assert.equal(changeClass(null),'unknown');assert.equal(changeClass(0),'flat');
 assert.equal(view.querySelectorAll('.watch-unweighted .watch-row').length,2);
});

test('map legend uses the same scale as tiles; breadth retains flat and missing counts',()=>{
 const rows=[row('UP',30,5),row('DOWN',20,-5),row('FLAT',10,0),row('MISSING',5,null)];
 const view=overviewView(rows,{view:'heatmap',onSelect:()=>{}});
 const tile=view.querySelector('[data-open="UP"]');
 assert.equal(tile.style.getPropertyValue('--tile-color'),heatColor(5));
 assert.equal(view.querySelectorAll('.watch-color-scale span').length,5);
 assert.match(view.querySelector('.watch-breadth-labels').textContent,/1 up1 down1 flat1 unavailable/);
 assert.equal(heatColor(50),heatColor(5));assert.equal(heatColor(-50),heatColor(-5));
 assert.notEqual(heatColor(null),heatColor(0));assert.notEqual(heatColor(.21),heatColor(5));
});

test('map inspector works with focus, Escape and hover without fetching or selecting',()=>{
 let selected=false;const oldFetch=globalThis.fetch;globalThis.fetch=()=>assert.fail('hover never fetches');
 const view=overviewView([row('ONE',10,0),row('TWO',20,null)],{view:'heatmap',onSelect:()=>selected=true,session:'2026-09-04'});
 document.body.append(view);
 try{
  const tile=view.querySelector('[data-open="ONE"]'),tip=view.querySelector('[role="tooltip"]');
  assert.equal(tile.hasAttribute('title'),false);assert.equal(tip.hidden,true);
  tile.focus();assert.equal(tip.hidden,false);assert.equal(tile.getAttribute('aria-describedby'),tip.id);
  assert.match(tip.textContent,/ONE.*0.00%/);assert.match(tip.textContent,/2026-09-04/);
  tile.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(tip.hidden,true);
  view.querySelector('[data-open="TWO"]').dispatchEvent(new window.Event('pointerenter'));
  assert.equal(tip.hidden,false);assert.match(tip.textContent,/TWO—/);
  assert.equal(selected,false);
  view.querySelector('.watch-map-frame').dispatchEvent(new window.Event('pointerleave'));assert.equal(tip.hidden,true);
 }finally{globalThis.fetch=oldFetch;view.remove();}
});

test('touch focus does not open a hover layer before the first tap selects a stock',()=>{
 let selected;const view=overviewView([row('ONE',10),row('TWO',20)],{view:'heatmap',onSelect:t=>selected=t});document.body.append(view);
 try{
  const tile=view.querySelector('[data-open=ONE]'),other=view.querySelector('[data-open=TWO]'),tip=view.querySelector('[role=tooltip]');
  const touch=target=>{const e=new window.Event('pointerdown',{bubbles:true});Object.defineProperty(e,'pointerType',{value:'touch'});target.dispatchEvent(e);target.focus();};
  touch(tile);assert.equal(tip.hidden,true);tile.click();assert.equal(selected,'ONE');
  touch(other);assert.equal(tip.hidden,true);other.click();assert.equal(selected,'TWO');
  other.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));tile.focus();assert.equal(tip.hidden,false);
 }finally{view.remove();}
});

test('initial watchlist loading is not rendered as missing market data',async()=>{
 let complete;const pending=new Promise(resolve=>complete=resolve);
 globalThis.fetch=async()=>{await pending;return new Response(JSON.stringify({items:[row('ONE',10)],overview:{items:[row('ONE',10)],session:'2026-09-04'}}),{headers:{'content-type':'application/json'}});};
 store.set('me',{tier:'pro',watch_cap:50});store.set('watchlist',['ONE']);store.set('snapshots',{});
 const root=document.querySelector('main'),mounted=mount(root);
 assert.ok(root.querySelector('.spinner-row'));assert.equal(root.querySelector('.watch-summary'),null);
 complete();const dispose=await mounted;assert.ok(root.querySelector('.watch-summary'));
 dispose();root.replaceChildren();
});

test('large watchlist fetches no details until selection and pending quote keeps research accessible',async()=>{
 const items=Array.from({length:50},(_,i)=>row('T'+i,(50-i)*1e9,i-25));
 const requests=[];globalThis.fetch=async url=>{requests.push(String(url));return new Response(JSON.stringify(String(url)==='/watchlist'?{items,overview:{items,session:'2026-09-04',previous_session:'2026-09-03'}}:{snapshot:{ok:false}}),{headers:{'content-type':'application/json'}});};
 store.set('me',{tier:'pro',watch_cap:50});store.set('watchlist',[]);store.set('snapshots',{});
 const root=document.querySelector('main');const dispose=await mount(root);
 assert.deepEqual(requests,['/watchlist']);assert.equal(root.querySelectorAll('article.snap').length,0);
 root.querySelector('[data-open="T0"]').click();await new Promise(r=>setTimeout(r,0));
 assert.equal(requests.filter(x=>x.startsWith('/snapshot/')).length,1);
 assert.equal(root.querySelectorAll('article.snap').length,1);assert.ok(root.querySelector('.watch-detail a[href="#/research/T0"]'));
 root.querySelector('[data-open="T1"]').click();await new Promise(r=>setTimeout(r,0));assert.equal(root.querySelectorAll('article.snap').length,1);
 root.querySelector('[data-mode="heatmap"]').click();assert.equal(root.querySelectorAll('.watch-tile').length,50);
 root.querySelector('.watch-close').click();assert.equal(root.querySelectorAll('article.snap').length,0);
 const filter=root.querySelector('.watch-filter');filter.value='Company';filter.dispatchEvent(new window.Event('input'));assert.equal(root.querySelectorAll('.watch-tile').length,50);
 filter.value='T49';filter.dispatchEvent(new window.Event('input'));assert.equal(root.querySelectorAll('.watch-tile').length,1);
 dispose();root.replaceChildren();
});

test('squarify preserves exact areas in phone and desktop shapes without turning similar caps into strips',()=>{
 const rows=Array.from({length:50},(_,i)=>row('TK'+i,1e10*(1-i/250))),total=rows.reduce((n,r)=>n+r.market_cap,0);
 for(const [width,height] of [[284,310],[356,356],[1000,600],[480,600]]){
  const tiles=treemap(rows,width,height);
  assert.equal(tiles.length,50);
  for(const a of tiles){assert.ok(Math.abs(a.w*a.h/(width*height)-a.market_cap/total)<1e-10);assert.ok(a.x>=0&&a.y>=0&&a.x+a.w<=width+1e-8&&a.y+a.h<=height+1e-8);
   for(const b of tiles)if(a!==b)assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<1e-8||Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)<1e-8);
  }
  assert.ok(tiles.filter(r=>r.w>=35&&r.h>=24).length>=45,'most phone cells have room for a short ticker at 12px');
 }
});
test('resizing repositions existing heatmap controls, preserves focus and never requests prices',()=>{
 const rows=Array.from({length:50},(_,i)=>row('TK'+i,1e10*(1-i/250))),view=overviewView(rows,{view:'heatmap',onSelect:()=>{}});
 document.body.append(view);const map=view.querySelector('.watch-treemap'),first=map.firstElementChild;
 let width=284,height=310;map.getBoundingClientRect=()=>({width,height});
 const original=globalThis.getComputedStyle,originalFetch=globalThis.fetch;globalThis.fetch=()=>{assert.fail('layout must not fetch');};globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
 try{
  first.focus();layoutOverview(view);const small=[first.style.left,first.style.top,first.style.width,first.style.height];
  width=1000;height=600;layoutOverview(view);
  assert.equal(document.activeElement,first);assert.equal(map.firstElementChild,first);
  assert.notDeepEqual([first.style.left,first.style.top,first.style.width,first.style.height],small);
  assert.equal(map.children.length,50);assert.equal(view.querySelectorAll('.watch-small-tiles button').length,50);
 }finally{globalThis.getComputedStyle=original;globalThis.fetch=originalFetch;view.remove();}
});

test('equal tiles include tiny issuers, ETFs and missing caps with dated prices',()=>{
 const rows=[row('NVDA',5.6e12,0.84),row('AVGO',1.7e12,.21),row('SMALL',1e7,-4),{...row('ETF',null,0),security_type:'ETF'}];
 const view=overviewView(rows,{view:'heatmap',area:'equal',onSelect:()=>{},session:'2026-09-04'});
 assert.equal(view.querySelectorAll('.watch-tile').length,4);
 assert.equal(view.querySelectorAll('.watch-tile-price').length,4);
 assert.equal(view.querySelector('.watch-tile').style.width,'');
 assert.match(view.textContent,/2026-09-04/);assert.match(view.textContent,/Equal size for comparison/);
});

test('filter autocomplete requires an explicit add and retains the selected stock after success',async()=>{
 const items=[row('NVDA',5.6e12,.84)],requests=[];
 globalThis.fetch=async(url,opts={})=>{requests.push([String(url),opts.method||'GET']);
  if(String(url).startsWith('/public/symbols?'))return Response.json({items:[{ticker:'CEG',name:'Constellation Energy',exchange:'NASDAQ'}]});
  if(opts.method==='POST'){items.push(row('CEG',1e11,0));return Response.json({added:true,ticker:'CEG'});}
  return Response.json({items,overview:{items,session:'2026-09-04'}});
 };
 store.set('me',{tier:'pro',watch_cap:50});store.set('watchlist',['NVDA']);store.set('snapshots',{});
 const root=document.querySelector('main'),dispose=await mount(root),filter=root.querySelector('.watch-filter');
 filter.value='ceg';filter.dispatchEvent(new window.Event('input'));
 await new Promise(r=>setTimeout(r,220));
 assert.equal(root.querySelector('.watch-search-offer').hidden,false);
 assert.match(root.querySelector('.watch-search-offer').textContent,/CEG.*Constellation Energy/);
 root.querySelector('.watch-search [role="option"]').click();
 assert.equal(filter.value,'CEG');assert.equal(requests.filter(([,m])=>m==='POST').length,0);
 root.querySelector('.watch-search-offer button').click();await new Promise(r=>setTimeout(r,0));
 assert.equal(requests.filter(([,m])=>m==='POST').length,1);
 assert.deepEqual(store.get('watchlist'),['NVDA','CEG']);
 assert.equal(root.querySelector('.watch-search-offer').hidden,true);
 assert.ok(root.querySelector('[data-open="CEG"]'));assert.equal(filter.value,'CEG');
 dispose();root.replaceChildren();
});

test('each of fifty stock rows has a separate direct map link without opening details',()=>{
 let selected=0;const rows=Array.from({length:50},(_,i)=>row('T'+i,50-i));
 const view=overviewView(rows,{view:'list',onSelect:()=>selected++});
 assert.equal(view.querySelectorAll('a.watch-map-link').length,50);
 assert.equal(view.querySelectorAll('button a, a button').length,0);
 const last=view.querySelector('a[href="#/evidence/T49"]');assert.ok(last);
 assert.match(last.getAttribute('aria-label'),/T49/);last.click();assert.equal(selected,0);
});

test('list and heatmap label retained exact-session closes without turning missing into zero',()=>{
 const saved={...row('SAVED',10,-10),price:90,price_status:'retained',price_session:'2026-09-08',price_recorded_at:'2026-09-08T21:00:00Z'};
 const missing={...row('MISSING',20,null),price:null,price_status:'missing'};
 for(const mode of ['list','heatmap']){
  const view=overviewView([saved,missing],{view:mode,area:'equal',session:'2026-09-08',previous:'2026-09-04',onSelect:()=>{}});
  assert.match(view.querySelector('[role="status"]').textContent,/Using saved closes/);
  assert.match(view.querySelector('[data-open="SAVED"]').textContent,/90\.00/);
  assert.match(view.querySelector('[data-open="SAVED"]').textContent,/Saved close/);
  assert.match(view.querySelector('[data-open="MISSING"]').textContent,/—/);
  assert.match(view.querySelector('.watch-method').textContent,/2026-09-08T21:00:00Z/);
 }
});

test('six comparison metrics retain zero, missing samples, losses and individual clocks',()=>{
 const r={...row('AVGO',1e9),metrics:{
  ytd:{value:0,status:'ready',as_of:'2026-09-08',start:'2025-12-31'},
  drawdown:{value:-24.2,status:'stale',as_of:'2026-09-04:CLOSED'},
  relative:{value:-7.3,status:'ready',symbols:['MRVL','CRDO']},
  iv_hv:{value:.73,status:'ready',iv:32.1,hv:44.2,expiry:'2026-09-16'},
  attention:{value:16,status:'ready'},degen:{value:null,status:'insufficient'}}};
 const view=overviewView([r],{view:'list',onSelect:()=>{}});
 const cells=view.querySelectorAll('.watch-metric');assert.equal(cells.length,6);
 assert.match(cells[0].textContent,/0.0%/);assert.match(cells[1].textContent,/-24.2%.*Earlier data.*2026-09-04/);
 assert.match(cells[2].textContent,/-7.3 pp.*MRVL \/ CRDO/);
 assert.match(cells[3].textContent,/0.73×.*IV below HV.*09\/16/);
 assert.match(cells[5].textContent,/—.*Insufficient data/);assert.doesNotMatch(cells[5].textContent,/0 \/ 100/);
 assert.match(view.querySelector('.watch-metric-method').textContent,/IV 32.1% \/ HV20 44.2%.*2026-09-16/);
 assert.match(view.querySelector('.watch-row[data-open]').getAttribute('aria-label'),/YTD return · 0.0%/);
 assert.equal(view.querySelectorAll('button a, a button').length,0);
});

test('metric sorting puts valid zero and losses ahead of missing or stale comparisons',()=>{
 const rows=[['LOSS',-5,'ready'],['MISSING',null,'missing'],['FLAT',0,'ready'],['OLD',50,'stale']].map(([t,v,status])=>({...row(t,1e9),metrics:{ytd:{value:v,status}}}));
 const view=overviewView(rows,{view:'list',sort:'ytd',onSelect:()=>{}});
 assert.deepEqual([...view.querySelectorAll('button.watch-row')].map(n=>n.dataset.open),['FLAT','LOSS','MISSING','OLD']);
});


test('long reference baskets stay compact while all members remain in the disclosure',()=>{
 const symbols=['AAA','BBB','CCC','DDD','EEE','FFF'];
 const view=overviewView([{...row('BASKET',1e9),metrics:{relative:{value:1,status:'ready',symbols}}}],{view:'list',onSelect:()=>{}});
 assert.match(view.querySelector('[data-metric=relative]').textContent,/AAA \/ BBB \+4/);
 assert.match(view.querySelector('.watch-metric-source').textContent,/AAA \/ BBB \/ CCC \/ DDD \/ EEE \/ FFF/);
});


test('collapsed list exposes the analysis clock and distinguishes retained text from a pending read',async()=>{
 const {reading,pick}=await import('../public/js/app/stock-reading.js');
 const base={ticker:'NVDA',as_of:'2026-09-09T20:00:00Z',overview:{en:'An attributed previous view.',zh:'已核对观点。',citations:['e1']},sources:[{id:'e1'}]};
 for(const status of ['ready','refresh_pending','read_pending','read_failed']){
  const view=overviewView([row('NVDA',10)],{view:'list',renderResearch:()=>reading({...base,status}),onSelect:()=>{}});
  const details=view.querySelector('.watch-inline-reading'),summary=details.querySelector('summary');
  assert.equal(details.open,false);
  if(['ready','refresh_pending'].includes(status)){
   assert.equal(summary.querySelector('.watch-reading-date').textContent,details.querySelector('.stock-analysis-date').textContent);
   assert.match(summary.textContent,status==='ready'?/Analysis as of.*2026/:/Previous analysis.*2026.*newer sources are under review/);
   assert.equal(summary.querySelector('.watch-reading-preview').textContent,pick(base.overview));
   assert.equal(view.querySelectorAll('.brief-citation').length,1);
  }else{
   assert.equal(summary.querySelector('.watch-reading-date'),null);
   assert.doesNotMatch(summary.textContent,/An attributed previous view|2026/);
  }
 }
});
