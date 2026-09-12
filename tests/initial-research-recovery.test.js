import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body><main></main><div id="modal" hidden></div></body></html>',{url:'https://ducky.test/app/#/watchlist'});
for(const key of ['window','document','Node','localStorage','location','history'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);
globalThis.cancelAnimationFrame=clearTimeout;
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
let hidden=false,online=true;
Object.defineProperty(document,'visibilityState',{get:()=>hidden?'hidden':'visible'});
Object.defineProperty(window.navigator,'onLine',{get:()=>online});
const api=await import('../public/js/app/api.js'),store=await import('../public/js/app/store.js');
const {sharedReadRefresh}=await import('../public/js/app/shared-read-refresh.js');
const {mount}=await import('../public/js/app/views/watchlist.js');
const reset=()=>{store.bumpEpoch();store.set('token','fixture');store.set('me',{tier:'pro',watch_cap:50});store.set('watchlist',['NVDA']);hidden=false;online=true;const root=document.querySelector('main');root.replaceChildren();return root;};
const row={ticker:'NVDA',status:'ready',as_of:'2026-09-09T22:00:00Z',overview:{en:'Orders may rise if spending recovers.',zh:'支出恢复时订单可能上升。',citations:['source']},sources:[{id:'source',kind:'creator',title:{en:'Conditional orders view'},published_at:'2026-09-09',evidence:[{author:'Sample Author',source_url:'https://example.com/source'}]}]};

test('first failed research read recovers in place without writes, lost focus or extra ticker fetches',async t=>{
 const root=reset(),warnings=[];t.mock.method(console,'warn',(...args)=>warnings.push(args));
 let healthy=false;const requests=[];
 globalThis.fetch=async(path,opts)=>{requests.push([path,opts.method]);return path==='/me/stock-research'?
  Response.json(healthy?{items:[row]}:{detail:'sensitive backend text must not be logged'},{status:healthy?200:503}):
  Response.json({items:['NVDA'],overview:{items:[{ticker:'NVDA',price:98,price_status:'ready'}]}});};
 const refresh=sharedReadRefresh(root,{reload:()=>assert.fail('must update in place')});
 const dispose=await mount(root);assert.equal(root.dataset.researchReadError,'http');
 assert.match(root.querySelector('.watch-compact-table tbody tr').textContent,/98/);
 const filter=root.querySelector('.watch-filter');filter.value='nvd';filter.dispatchEvent(new window.Event('input'));
 root.querySelector('[data-map-open]').focus();healthy=true;
 await refresh.check();await refresh.check();
 assert.match(root.querySelector('.watch-reading-preview').textContent,/Orders may rise/);
 assert.equal(root.dataset.researchReadError,undefined);assert.equal(filter.value,'nvd');
 assert.equal(document.activeElement.dataset.readingKey,'NVDA:map');
 assert.equal(root.querySelector('aside').hidden,true);
 assert.deepEqual(requests.filter(([path])=>path==='/me/stock-research'),[['/me/stock-research','GET'],['/me/stock-research','GET']]);
 // Signal columns add two shared read-only pages; still no writes and no per-ticker fetches.
 assert.ok(requests.every(([path,method])=>method==='GET'&&(['/watchlist','/me/stock-research'].includes(path)||path.startsWith('/briefing/stocks?')||path.startsWith('/radar/archive.json?'))));
 assert.doesNotMatch(JSON.stringify(warnings),/sensitive|fixture/);
 refresh.stop();dispose();
});

test('failed first read gets at most two attempts; hidden/offline pages pause them',async()=>{
 const root=reset(),refresh=sharedReadRefresh(root,{});let requests=0;
 globalThis.fetch=async()=>{requests++;throw new TypeError('fixture disconnected');};
 await assert.rejects(api.get('/me/stock-research'));
 hidden=true;await refresh.check();hidden=false;online=false;await refresh.check();assert.equal(requests,1);
 online=true;await refresh.check();await refresh.check();await refresh.check();assert.equal(requests,3);refresh.stop();
});

test('auth, cancellation, rate limits, searches, histories and writes never enroll as initial recovery',async()=>{
 for(const [path,status,method] of [['/me/stock-research',401,'GET'],['/me/stock-research',402,'GET'],['/me/stock-research',429,'GET'],['/me/stock-research',403,'GET'],['/me/stock-research?cursor=old',503,'GET'],['/public/symbols?q=NVDA',503,'GET'],['/watchlist',503,'POST']]){
  const root=reset(),refresh=sharedReadRefresh(root,{});let requests=0;
  globalThis.fetch=async()=>{requests++;return Response.json({}, {status});};
  await assert.rejects(api.request(method,path));await refresh.check();assert.equal(requests,1);refresh.stop();
 }
 for(const reason of ['cancelled','session_changed']){
  const root=reset(),refresh=sharedReadRefresh(root,{});let requests=0;
  globalThis.fetch=async()=>{requests++;if(reason==='session_changed'){store.set('token','renewed');return Response.json({});}throw new Error('aborted');};
  const ctl=new AbortController();if(reason==='cancelled')ctl.abort();
  await assert.rejects(api.get('/me/stock-research',{signal:ctl.signal}));await refresh.check();assert.equal(requests,1);refresh.stop();
 }
});

test('failed reads cannot migrate to a later route/account or complete after route abort',async()=>{
 const root=reset(),first=sharedReadRefresh(root,{});let reject,requests=0;
 globalThis.fetch=async()=>{requests++;return await new Promise((_,no)=>reject=no);};
 const work=api.get('/me/stock-research');first.stop();const second=sharedReadRefresh(root,{});
 reject(new Error('offline'));await assert.rejects(work);await second.check();assert.equal(requests,1);second.stop();
 for(const stop of ['epoch','abort']){
  reset();const ctl=new AbortController(),refresh=sharedReadRefresh(root,{signal:ctl.signal});
  globalThis.fetch=async()=>{requests++;throw new Error('offline');};await assert.rejects(api.get('/me/stock-research'));
  if(stop==='epoch')store.bumpEpoch();else ctl.abort();const before=requests;await refresh.check();assert.equal(requests,before);refresh.stop();
 }
});

test('a recovered read rejoins normal refresh including source withdrawal',async()=>{
 const root=reset(),refresh=sharedReadRefresh(root,{});let fail=true,value={items:[row]},calls=0;
 globalThis.fetch=async()=>{calls++;if(fail)throw new Error('offline');return Response.json(value);};
 await assert.rejects(api.get('/me/stock-research'));let delivered;
 root.addEventListener('ducky:shared-read',e=>{delivered=e.detail.value;e.detail.accepted=true;});
 fail=false;await refresh.check();assert.deepEqual(delivered,value);
 fail=true;for(let i=0;i<3;i++)await refresh.check();
 fail=false;value={items:[{ticker:'NVDA',status:'withdrawn',sources:[]}]};await refresh.check();
 assert.deepEqual(delivered,value);assert.equal(calls,6);refresh.stop();
});

test('request deadline includes the response body and distinguishes timeout from route abort',async()=>{
 reset();const failures=[],off=api.observeReadFailures((path,error)=>failures.push(error));
 globalThis.fetch=async(_path,{signal})=>({status:200,ok:true,headers:new Headers({'content-type':'application/json'}),json:()=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('body interrupted')),{once:true}))});
 await assert.rejects(api.get('/me/stock-research',{timeout:10}),e=>e.body.reason==='timeout');
 const ctl=new AbortController(),work=api.get('/me/stock-research',{signal:ctl.signal});
 await Promise.resolve();ctl.abort();await assert.rejects(work,e=>e.body.reason==='cancelled');
 assert.deepEqual(failures,[{status:0,reason:'timeout'},{status:0,reason:'cancelled'}]);off();
});

test('malformed research is classified without hiding usable prices or claiming model progress',async t=>{
 const root=reset();t.mock.method(console,'warn',()=>{});
 globalThis.fetch=async path=>Response.json(path==='/me/stock-research'?{items:[null]}:{items:['NVDA'],overview:{items:[{ticker:'NVDA',price:98,price_status:'ready'}]}});
 const dispose=await mount(root);assert.equal(root.dataset.researchReadError,'invalid_response');
 assert.match(root.querySelector('.watch-compact-table tbody tr').textContent,/98/);assert.ok(root.querySelector('[data-map-open]'));
 assert.doesNotMatch(root.querySelector('.watch-reading-preview').textContent,/summary is not ready|Loading/);dispose();
});

test('a rendering exception cannot erase an accepted research response',async t=>{
 const root=reset();t.mock.method(console,'warn',()=>{});let finish;
 globalThis.fetch=async path=>path==='/me/stock-research'?await new Promise(resolve=>finish=resolve):Response.json({items:['NVDA'],overview:{items:[{ticker:'NVDA',price:98}]}});
 const work=mount(root);for(let i=0;i<3;i++)await new Promise(resolve=>setTimeout(resolve,0));
 const list=root.querySelector('#watch-cards'),original=list.querySelectorAll.bind(list);let fail=true;
 t.mock.method(list,'querySelectorAll',(...args)=>{if(fail){fail=false;throw new Error('fixture render error');}return original(...args);});
 finish(Response.json({items:[row]}));const dispose=await work;
 assert.equal(root.dataset.researchReadError,'render');
 root.querySelector('[data-mode="reading"]').click();assert.match(root.textContent,/Orders may rise/);
 assert.doesNotMatch(root.textContent,/stock summary could not be loaded/);dispose();
});
