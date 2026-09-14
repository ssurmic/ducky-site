import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body><main></main></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));
document.body.append(strings);
const store=await import('../public/js/app/store.js');
const manager=await import('../public/js/app/views/watchlist-manager.js');
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
const wait=()=>new Promise(resolve=>setTimeout(resolve,220));
const stock={ticker:'META',name:'Meta Platforms',instrument_type:'stock',instrument_tags:['stock'],watch_eligible:true};
const leveraged={ticker:'METU',name:'Daily META 2x ETF',instrument_type:'etf',instrument_tags:['etf','leveraged','2x'],watch_eligible:false,watch_reason:'leveraged_instrument'};
async function setup({items=[stock,leveraged],cap=50,watches=['NVDA'],write}={}){
 store.bumpEpoch();store.set('me',{watch_cap:cap,entitlement:{capabilities:{research:false}},access:{billing_enabled:false}});
 store.set('token','synthetic-manager');store.set('watchlist',watches);
 const root=document.querySelector('main');root.replaceChildren();const requests=[];let server=[...watches];
 globalThis.fetch=async(url,opts={})=>{
  const method=opts.method||'GET';requests.push({url,method});
  if(method==='POST'){
   if(write)return write(url,opts);
   const {ticker}=JSON.parse(opts.body);server.push(ticker);return Response.json({ticker,added:true});
  }
  if(method==='DELETE'){server=server.filter(t=>t!==url.split('/').at(-1));return Response.json({removed:true});}
  return Response.json(url.startsWith('/public/symbols')?{items}:{cap,items:server.map(ticker=>({ticker}))});
 };
 const dispose=await manager.mount(root),input=root.querySelector('input');
 async function search(value='meta'){input.focus();input.value=value;input.dispatchEvent(new window.Event('input'));await wait();}
 return {root,input,search,requests,dispose};
}

test('restricted-access watchlist manager supports direct autocomplete addition and source labels',async()=>{
 const h=await setup();try{
  await h.search();assert.match(h.root.querySelector('.symbol-option').textContent,/META.*Stock.*Meta Platforms/);
  assert.equal(h.root.querySelectorAll('.symbol-add').length,1);h.root.querySelector('.symbol-add').click();
  for(let i=0;i<5;i++)await pause();
  assert.equal(h.requests.filter(r=>r.method==='POST').length,1);assert.deepEqual(store.get('watchlist'),['NVDA','META']);
  assert.equal(h.input.value,'');assert.match(h.root.querySelector('ul').textContent,/META/);assert.equal(document.activeElement,h.input);
 }finally{h.dispose();}
});

test('known leveraged candidates block both picker and selected manual submit; backend errors use typed copy',async()=>{
 const h=await setup({items:[leveraged],write:async()=>Response.json({error:'watch_ineligible',reason:'leveraged_instrument'},{status:400})});
 try{
  await h.search('METU');assert.equal(h.root.querySelector('.symbol-add'),null);
  h.root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));await pause();
  assert.equal(h.requests.filter(r=>r.method==='POST').length,0);assert.match(h.root.textContent,/Leveraged products cannot be added/);
  h.input.value='SOXL';h.input.dispatchEvent(new window.Event('input'));
  h.root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));await pause();
  assert.equal(h.requests.filter(r=>r.method==='POST').length,1);assert.match(h.root.textContent,/Leveraged products cannot be added/);
  assert.doesNotMatch(h.root.textContent,/watch_ineligible/);assert.equal(h.input.value,'SOXL');
 }finally{h.dispose();}
});

test('manager capacity, duplicates and in-flight requests suppress repeated writes',async()=>{
 let finish;const h=await setup({write:()=>new Promise(resolve=>{finish=resolve;})});try{
  await h.search();const add=h.root.querySelector('.symbol-add');add.click();add.click();await pause();
  assert.equal(h.requests.filter(r=>r.method==='POST').length,1);assert.equal(add.disabled,true);
  store.bumpEpoch();store.set('watchlist',[]);finish(Response.json({ticker:'META',added:true}));await pause();
  assert.deepEqual(store.get('watchlist'),[]);assert.equal(h.input.value,'meta');
 }finally{h.dispose();}
 const full=await setup({cap:1});try{
  await full.search();assert.equal(full.root.querySelector('.symbol-add').disabled,true);
  full.root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));await pause();
  assert.equal(full.requests.filter(r=>r.method==='POST').length,0);
 }finally{full.dispose();}
 const existing=await setup({items:[{...stock,ticker:'NVDA'}]});try{
  await existing.search('NVDA');assert.equal(existing.root.querySelector('.symbol-add').disabled,true);
  existing.root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));await pause();
  assert.equal(existing.requests.filter(r=>r.method==='POST').length,0);
 }finally{existing.dispose();}
});
