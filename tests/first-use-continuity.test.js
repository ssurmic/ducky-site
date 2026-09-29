import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/#/today'});
for(const key of ['window','document','Node','location','history','localStorage','CustomEvent','Event'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const stock=await import('../public/js/app/views/stock.js');
const today=await import('../public/js/app/views/today.js');
const store=await import('../public/js/app/store.js');
const api=await import('../public/js/app/api.js');
const pause=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setTimeout(resolve,0));};
const fixture={ticker:'NVDA',price:{price:98,company:'Sample company',price_session:'2026-09-28'},evidence:{ticker:'NVDA',nodes:[],analysis_status:'pending'}};
function setup(hash='#/stock/NVDA?from=explore&tab=metrics'){
 store.bumpEpoch();store.set('me',{user_id:12,tier:'pro',access:{billing_enabled:false}});store.set('token','synthetic-only');store.set('watchlist',[]);
 history.replaceState(null,'',hash);document.querySelector('#toasts').replaceChildren();const root=document.querySelector('main');root.replaceChildren();return root;
}
function read(url){
 if(url.startsWith('/stock-research/'))return fixture;
 if(url.startsWith('/bars/'))return {bars:[]};
 if(url.startsWith('/snapshot/'))return {ticker:'NVDA',snapshot:{ok:true}};
 if(url==='/macro/beta')return {schema:'macro-beta/1',status:'ok',as_of:'2026-09-28',latest:{funding_score:50,metrics:{nominal_10y:4.12,vix:16}},history:[]};
 if(url==='/watchlist')return {items:[],overview:{items:[]}};
 if(url.startsWith('/kol/'))return {posts:[]};
 return {items:[],next_cursor:null};
}
function shared(root,value){root.dispatchEvent(new window.CustomEvent('ducky:shared-read',{detail:{path:'/me/stock-research',value}}));}

test('adding from each stock tab confirms in place and keeps the focused control and route',async()=>{
 for(const tab of ['overview','metrics','evidence','history']){
  const hash='#/stock/NVDA?from=explore&tab='+tab,root=setup(hash),calls=[];
  globalThis.fetch=async(url,opts)=>{calls.push([url,opts.method]);return Response.json(opts.method==='POST'?{ticker:'NVDA',added:true}:read(url));};
  const dispose=await stock.mount(root,{ticker:'NVDA',query:new URLSearchParams({from:'explore',tab})});
  try{
   const panel=root.querySelector('.stock-'+(tab==='overview'?'overview':tab==='evidence'?'map':tab)+'-panel');
   const notice=root.querySelector('.stock-watch-feedback'),button=root.querySelector('[data-stock-watch]');
   assert.equal(notice.hidden,true);button.focus();button.click();await pause();
   assert.equal(location.hash,hash);assert.equal(document.activeElement,button);assert.equal(panel.hidden,false);
   assert.equal(root.querySelector('[data-stock-tab="'+tab+'"]').getAttribute('aria-current'),'page');
   assert.deepEqual(store.get('watchlist'),['NVDA']);assert.equal(notice.hidden,false);
   assert.match(notice.textContent,/NVDA/);assert.equal(notice.querySelector('a').getAttribute('href'),'#/watchlist');
   assert.equal(notice.getAttribute('role'),'status');assert.doesNotMatch(notice.textContent,/notification|push|real.time/i);
   assert.equal(calls.filter(([,method])=>method==='POST').length,1);
   assert.equal(root.querySelector('.stock-'+(tab==='overview'?'overview':tab==='evidence'?'map':tab)+'-panel'),panel);
  }finally{dispose();}
 }
});

test('membership failures cannot report success or change watchlist/tab',async()=>{
 for(const status of [402,503]){
  const root=setup(),hash=location.hash;
  globalThis.fetch=async(url,opts)=>opts.method==='POST'?Response.json({error:status===402?'watchlist_limit':'unavailable'},{status}):Response.json(read(url));
  const dispose=await stock.mount(root,{ticker:'NVDA',query:new URLSearchParams({from:'explore',tab:'metrics'})});
  try{const button=root.querySelector('[data-stock-watch]');button.click();await pause();
   assert.deepEqual(store.get('watchlist'),[]);assert.equal(root.querySelector('.stock-watch-feedback').hidden,true);
   assert.equal(button.disabled,false);assert.equal(location.hash,hash);assert.equal(root.querySelector('.stock-metrics-panel').hidden,false);
  }finally{dispose();}
 }
});

test('one pending mutation cannot be duplicated and a late response cannot cross an account change',async()=>{
 const root=setup();let finish,calls=0;
 globalThis.fetch=async(url,opts)=>opts.method==='POST'?(calls++,await new Promise(resolve=>finish=resolve)):Response.json(read(url));
 const dispose=await stock.mount(root,{ticker:'NVDA'});
 try{const button=root.querySelector('[data-stock-watch]');button.click();button.click();await pause();assert.equal(calls,1);
  store.set('me',{user_id:99,tier:'pro'});store.set('token','other-synthetic');store.set('watchlist',['AMD']);
  finish(Response.json({ticker:'NVDA',added:true}));await pause();
  assert.deepEqual(store.get('watchlist'),['AMD']);assert.equal(root.querySelector('.stock-watch-feedback').hidden,true);assert.equal(button.disabled,true);
 }finally{dispose();}
});

test('success notice clears on membership removal, account loss and route disposal',async()=>{
 for(const action of ['remove','account','dispose','abort']){
  const root=setup(),controller=new AbortController();
  globalThis.fetch=async(url,opts)=>Response.json(opts.method==='POST'?{ticker:'NVDA',added:true}:read(url));
  const dispose=await stock.mount(root,{ticker:'NVDA',signal:controller.signal});
  const button=root.querySelector('[data-stock-watch]');button.click();await pause();
  const notice=root.querySelector('.stock-watch-feedback');assert.equal(notice.hidden,false);
  if(action==='remove')store.set('watchlist',[]);
  else if(action==='account'){store.bumpEpoch();store.set('me',null);}
  else if(action==='abort')controller.abort();
  else dispose();
  assert.equal(notice.hidden,true);assert.equal(notice.textContent,'');if(action!=='dispose')dispose();
 }
});

test('route abort while adding discards late membership confirmation',async()=>{
 const root=setup(),controller=new AbortController();let finish;
 globalThis.fetch=async(url,opts)=>opts.method==='POST'?await new Promise(resolve=>finish=resolve):Response.json(read(url));
 const dispose=await stock.mount(root,{ticker:'NVDA',signal:controller.signal});
 root.querySelector('[data-stock-watch]').click();await pause();controller.abort();dispose();
 finish(Response.json({ticker:'NVDA',added:true}));await pause();
 assert.deepEqual(store.get('watchlist'),[]);assert.equal(root.querySelector('.stock-watch-feedback').hidden,true);
});

test('Today offers research before the unchanged macro only after explicit zero-watch confirmation',async()=>{
 const root=setup('#/today');let finish;
 globalThis.fetch=async url=>url==='/me/stock-research'?await new Promise(resolve=>finish=resolve):Response.json(read(url));
 const pending=today.mount(root);await pause();
 const start=root.querySelector('.today-research-start'),macro=root.querySelector('.today-macro-host');
 assert.equal(start.hidden,true);assert.ok(macro);const macroContent=macro.firstElementChild;
 finish(Response.json({items:[],watchlist_count:0}));const dispose=await pending;
 try{
  assert.equal(start.hidden,false);assert.equal(start.querySelector('a').getAttribute('href'),'#/explore');
  assert.ok(start.compareDocumentPosition(macro)&window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(macro.firstElementChild,macroContent);assert.ok(root.querySelector('.today-heading a[href="#/calendar"]'));
  shared(root,{items:[],watchlist_count:2});assert.equal(start.hidden,true);
  shared(root,{items:[]});assert.equal(start.hidden,true);
  shared(root,{items:[],watchlist_count:0});assert.equal(start.hidden,false);
  store.set('watchlist',['NVDA']);assert.equal(start.hidden,true);
  shared(root,{items:[],watchlist_count:0});assert.equal(start.hidden,true);
 }finally{dispose();}
});

test('Today late zero-watch response cannot restore the starter after membership was added',async()=>{
 const root=setup('#/today');let finish;
 globalThis.fetch=async url=>url==='/me/stock-research'?await new Promise(resolve=>finish=resolve):Response.json(read(url));
 const pending=today.mount(root);await pause();
 store.set('watchlist',['NVDA']);
 finish(Response.json({items:[],watchlist_count:0}));const dispose=await pending;
 try{assert.equal(root.querySelector('.today-research-start').hidden,true);assert.deepEqual(store.get('watchlist'),['NVDA']);}
 finally{dispose();}
});

test('Today unknown or failed research does not claim an empty watchlist; embedded feed has no starter',async()=>{
 for(const state of ['unknown','failed','embedded']){
  const root=setup('#/today');
  globalThis.fetch=async url=>url==='/me/stock-research'?(state==='failed'?Response.json({error:'unavailable'},{status:503}):Response.json({items:[]})):Response.json(read(url));
  const dispose=await today.mount(root,{embedded:state==='embedded',scope:state==='embedded'?'all':'watchlist'});
  try{const start=root.querySelector('.today-research-start');assert.ok(state==='embedded'?!start:start.hidden);}finally{dispose();}
 }
});

test('Today zero-watch entrance clears with account epoch or abort and cannot accept an old-account read',async()=>{
 for(const action of ['epoch','abort']){
  const root=setup('#/today'),controller=new AbortController();let finish;
  globalThis.fetch=async url=>url==='/me/stock-research'?await new Promise(resolve=>finish=resolve):Response.json(read(url));
  const pending=today.mount(root,{signal:controller.signal});await pause();
  if(action==='epoch'){store.bumpEpoch();store.set('me',{user_id:99,tier:'pro'});}else controller.abort();
  finish(Response.json({items:[],watchlist_count:0}));const dispose=await pending;
  assert.equal(root.querySelector('.today-research-start').hidden,true);dispose();
 }
});
