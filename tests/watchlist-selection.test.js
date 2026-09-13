import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const watch=await import('../public/js/app/views/watchlist.js');
const api=await import('../public/js/app/api.js');
const pause=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,0));};
const choose=(root,ticker)=>root.querySelector(`[data-watch-select="${ticker}"]`).click();
const remove=root=>root.querySelector('.watch-remove-selected').click();
const members=root=>[...root.querySelectorAll('tbody tr')].map(n=>n.dataset.readingAnchor).sort();
async function setup(tickers=['AAA','BBB','CCC'],{cap=50,write,signal}={}){
 store.bumpEpoch();store.set('me',{user_id:123,tier:'pro',watch_cap:cap,access:{billing_enabled:false}});store.set('token','synthetic-only');store.set('watchlist',tickers);
 const root=document.querySelector('main');root.replaceChildren();document.querySelector('#toasts').replaceChildren();
 let server=[...tickers];const requests=[];
 globalThis.fetch=async(url,opts={})=>{
  const method=opts.method||'GET';
  // Signal columns read two shared pages; membership tests count only list/research/write requests.
  if(!/^\/(briefing|radar)\//.test(url))requests.push({url,method});
  if(method!=='GET'){
   if(write)return write(url,opts);
   if(method==='DELETE'){const ticker=url.split('/').at(-1);server=server.filter(t=>t!==ticker);return Response.json({ticker,removed:true});}
   const {ticker}=JSON.parse(opts.body);server.push(ticker);return Response.json({ticker,added:true});
  }
  return Response.json(url==='/me/stock-research'?{items:server.map(ticker=>({ticker,status:'pending'})),watchlist_count:server.length}:
   url.startsWith('/public/symbols')?{items:[]}:{cap,items:server,overview:{items:server.map((ticker,i)=>({ticker,company:ticker+' Company',price:100+i,market_cap:(i+1)*1e9}))}});
 };
 return {root,requests,dispose:await watch.mount(root,{signal})};
}

test('50 stocks show capacity and selection before attempting an add; each success releases space without refetching',async()=>{
 const tickers=Array.from({length:50},(_,i)=>'T'+String(i).padStart(2,'0'));
 const {root,requests,dispose}=await setup(tickers);
 try{
  assert.match(root.querySelector('#watch-count').textContent,/50.*50/);
  assert.equal(root.querySelector('.watch-capacity').hidden,false);
  assert.match(root.querySelector('.watch-capacity').textContent,/50-stock limit/);
  assert.equal(root.querySelector('form button').disabled,true);
  assert.equal(root.querySelectorAll('[data-watch-select]').length,51);
  assert.equal(root.querySelector('.watch-remove-selected').disabled,true);
  choose(root,'T00');choose(root,'T49');
  assert.equal(requests.length,2);
  assert.match(root.querySelector('.watch-selection-review').textContent,/T00 · T49/);
  assert.equal(root.querySelector('[data-watch-select=all]').indeterminate,true);
  remove(root);await pause();
  assert.deepEqual(requests.filter(r=>r.method==='DELETE').map(r=>r.url),['/watchlist/T00','/watchlist/T49']);
  assert.equal(requests.filter(r=>r.method==='GET').length,2);
  assert.equal(store.get('watchlist').length,48);assert.equal(members(root).length,48);
  assert.equal(root.querySelector('.watch-capacity').hidden,true);
  assert.equal(root.querySelector('form button').disabled,false);
  assert.match(root.querySelector('#watch-count').textContent,/48.*50/);
  assert.match(root.querySelector('.watch-remove-result').textContent,/Removed 2/);
  const form=root.querySelector('form');form.querySelector('input').value='NEW';form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await pause();
  assert.equal(store.get('watchlist').length,49);assert.ok(store.get('watchlist').includes('NEW'));
 }finally{dispose();}
});

test('select visible respects filtering, keeps hidden selections reviewable and survives sorting and shared refresh',async()=>{
 const {root,requests,dispose}=await setup();
 try{
  choose(root,'CCC');const filter=root.querySelector('.watch-filter');filter.value='AAA';filter.dispatchEvent(new window.Event('input'));
  choose(root,'all');assert.deepEqual(members(root),['AAA']);
  assert.equal(root.querySelector('[data-watch-select=all]').checked,true);
  assert.match(root.querySelector('.watch-selection-names').textContent,/CCC · AAA/);
  filter.value='';filter.dispatchEvent(new window.Event('input'));
  root.querySelector('[data-sort=ticker]').click();
  root.dispatchEvent(new window.CustomEvent('ducky:shared-read',{detail:{path:'/me/stock-research',value:{items:[]}}}));
  assert.equal(root.querySelector('[data-watch-select=CCC]').checked,true);
  assert.equal(root.querySelector('[data-watch-select=AAA]').checked,true);
  assert.equal(root.querySelector('[data-watch-select=BBB]').checked,false);
  const checkbox=root.querySelector('[data-watch-select=BBB]');checkbox.focus();checkbox.click();
  assert.equal(document.activeElement.dataset.readingKey,'select:BBB');
  assert.equal(root.querySelector('[data-watch-select=all]').checked,true);
  assert.equal(requests.length,2);
  root.querySelector('.watch-bulk-actions .btn-sm:not([hidden])').click();
  assert.equal(root.querySelector('.watch-remove-selected').disabled,true);
 }finally{dispose();}
});

test('partial failure stops the batch, keeps every unconfirmed row selected and supports deliberate retry',async()=>{
 let fail=true;
 const {root,requests,dispose}=await setup(undefined,{write:async url=>url.endsWith('BBB')&&fail?Response.json({error:'offline'},{status:503}):Response.json({ticker:url.split('/').at(-1),removed:true})});
 try{
  choose(root,'all');remove(root);await pause();
  // Default market-cap sort is descending, so CCC is removed before BBB fails.
  assert.deepEqual(members(root),['AAA','BBB']);
  assert.equal(requests.filter(r=>r.method==='DELETE').length,2);
  assert.match(root.querySelector('.watch-remove-result').textContent,/Removed 1; 2 removals are unconfirmed/);
  for(const ticker of ['AAA','BBB'])assert.equal(root.querySelector(`[data-watch-select=${ticker}]`).checked,true);
  fail=false;remove(root);await pause();
  assert.deepEqual(store.get('watchlist'),[]);assert.equal(root.querySelector('.watch-bulk').hidden,true);
  assert.match(root.querySelector('.watch-remove-result').textContent,/Removed 2/);
 }finally{dispose();}
});

test('failed first removal and malformed responses retain membership and expose retry, never a success receipt',async()=>{
 for(const body of [null,{ticker:'WRONG',removed:true}]){
  const {root,dispose}=await setup(['AAA'],{write:async()=>body?Response.json(body):Response.json({error:'offline'},{status:503})});
  try{choose(root,'AAA');remove(root);await pause();assert.deepEqual(store.get('watchlist'),['AAA']);assert.equal(root.querySelector('[data-watch-select=AAA]').checked,true);assert.match(root.querySelector('.watch-remove-result').textContent,/1 removals are unconfirmed/);}finally{dispose();}
 }
});

test('already absent is an idempotent success; an over-cap account remains full after one removal',async()=>{
 const {root,dispose}=await setup(['AAA','BBB','CCC'],{cap:2,write:async url=>Response.json({ticker:url.split('/').at(-1),removed:false})});
 try{choose(root,'AAA');remove(root);await pause();assert.deepEqual(members(root),['BBB','CCC']);assert.equal(root.querySelector('.watch-capacity').hidden,false);assert.equal(root.querySelector('form button').disabled,true);assert.doesNotMatch(root.querySelector('.watch-remove-result').textContent,/add stocks again/);}finally{dispose();}
});

test('repeated remove clicks cannot duplicate a write, and logout during a batch stops subsequent writes',async()=>{
 let complete;const {root,requests,dispose}=await setup(undefined,{write:async()=>new Promise(r=>{complete=r;})});
 try{
  choose(root,'all');remove(root);remove(root);await pause();
  assert.equal(requests.filter(r=>r.method==='DELETE').length,1);
  assert.ok([...root.querySelectorAll('[data-watch-select]')].every(n=>n.disabled));
  store.bumpEpoch();store.set('token','new-account-synthetic');store.set('me',{user_id:456,tier:'pro',watch_cap:50});store.set('watchlist',['NEW']);
  complete(Response.json({ticker:'CCC',removed:true}));await pause();
  assert.deepEqual(store.get('watchlist'),['NEW']);assert.equal(requests.filter(r=>r.method==='DELETE').length,1);
 }finally{dispose();}
});

test('route abort during removal stops remaining writes and does not mutate the disposed view',async()=>{
 let complete;const controller=new AbortController();const {root,requests,dispose}=await setup(undefined,{signal:controller.signal,write:async()=>new Promise(r=>{complete=r;})});
 choose(root,'all');remove(root);await pause();controller.abort();dispose();complete(Response.json({ticker:'CCC',removed:true}));await pause();
 assert.equal(requests.filter(r=>r.method==='DELETE').length,1);assert.equal(store.get('watchlist').length,3);
});

test('stale membership reads cannot resurrect a stock after successful deletion',async()=>{
 const {root,dispose}=await setup();
 try{
  let complete;globalThis.fetch=async(url,opts)=>opts.method==='DELETE'?Response.json({ticker:'AAA',removed:true}):new Promise(r=>{complete=r;});
  const stale=api.watchlist.list().then(()=>null,error=>error);
  choose(root,'AAA');remove(root);await pause();
  complete(Response.json({items:['AAA','BBB','CCC']}));
  assert.equal(api.readFailure(await stale).reason,'cancelled');
  assert.deepEqual(store.get('watchlist'),['BBB','CCC']);assert.deepEqual(members(root),['BBB','CCC']);
 }finally{dispose();}
});

test('other layouts offer a direct way back to selection; server quota rejection shows the actual cap without upsell',async()=>{
 const {root,dispose}=await setup(['AAA'],{cap:2});let upsells=0;
 api.setPaymentRequiredHandler(()=>upsells++);
 try{
  root.querySelector('[data-mode=reading]').click();root.querySelector('.watch-bulk-actions button').click();assert.ok(root.querySelector('[data-watch-select=AAA]'));
  globalThis.fetch=async(url,opts)=>opts.method==='POST'?Response.json({error:'watch_limit',cap:1},{status:402}):Response.json(url==='/watchlist'?{items:['AAA'],cap:1,overview:{items:[{ticker:'AAA'}]}}:{items:[]});
  const form=root.querySelector('form');form.querySelector('input').value='BBB';form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await pause();
  assert.equal(store.get('me').watch_cap,1);assert.equal(root.querySelector('.watch-capacity').hidden,false);assert.equal(root.querySelector('form button').disabled,true);assert.equal(upsells,0);
 }finally{dispose();api.setPaymentRequiredHandler(null);}
});

test('adding a stock found by the search box shows the whole list again with the new row in it',async()=>{
 const {root,dispose}=await setup();
 try{
  const inner=globalThis.fetch;
  globalThis.fetch=async(url,opts)=>String(url).startsWith('/public/symbols')?Response.json({items:[{ticker:'COIN',name:'Coinbase Global, Inc.',exchange:'NASDAQ'}]}):inner(url,opts);
  const filter=root.querySelector('.watch-filter');filter.value='coin';filter.dispatchEvent(new window.Event('input'));
  assert.deepEqual(members(root),[]);   // nothing on the list matches while the search is open
  await new Promise(r=>setTimeout(r,220));
  root.querySelector('.watch-search [role="option"]').click();
  assert.equal(filter.value,'COIN');assert.equal(root.querySelector('.watch-search-offer').hidden,false);
  root.querySelector('.watch-search-offer button').click();await new Promise(r=>setTimeout(r,30));
  assert.deepEqual(store.get('watchlist'),['AAA','BBB','CCC','COIN']);
  // Before the fix the search text survived the add and the list showed COIN alone under "4/50".
  assert.deepEqual(members(root),['AAA','BBB','CCC','COIN']);
  assert.equal(filter.value,'');assert.equal(root.querySelector('.watch-overview').classList.contains('is-filtered'),false);
  assert.equal(root.querySelector('.watch-search-offer').hidden,true);
  assert.match(root.querySelector('#watch-count').textContent,/4.*50/);
  assert.equal(document.activeElement?.dataset.readingKey,'COIN:name');
 }finally{dispose();}
});
