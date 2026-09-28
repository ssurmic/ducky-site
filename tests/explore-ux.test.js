import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<html data-lang="en"><body><main></main></body></html>',{url:'https://ducky.test/app/#/explore'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const copy=JSON.parse(readFileSync('i18n/en.json','utf8'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount}=await import('../public/js/app/views/explore.js');
const {discoveryRows,discoveryStockRow}=await import('../public/js/app/explore-discovery.js');
const tick=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setTimeout(resolve,0));};
const ranking={status:'ready',collected_at:'2026-09-25T20:00:00Z',items:[{ticker:'NVDA',rank:1,mentions:12,change_pct:-4,overall:{en:'Orders depend on customer spending.',zh:'订单取决于客户支出。'}}]};
function setup(){store.bumpEpoch();store.set('me',{user_id:1,tier:'pro',access:{billing_enabled:false}});store.set('token','synthetic-only');store.set('watchlist',[]);const root=document.querySelector('main');root.replaceChildren();return root;}

test('discussion rows keep attention separate from prices and missing values separate from zero',()=>{
 const rows=discoveryRows({status:'stale',items:[{ticker:'MU',rank:2,mentions:null,change_pct:null,overall:{zh:'仅中文'}},{ticker:'NVDA',rank:1,mentions:0,change_pct:0},{ticker:'NVDA',rank:4},{ticker:'bad symbol',rank:1}]},'en');
 assert.deepEqual(rows.map(row=>row.ticker),['NVDA','MU']);
 assert.equal(rows[0].mentions,0);assert.equal(rows[0].attentionChange,0);
 assert.equal(rows[1].mentions,null);assert.equal(rows[1].attentionChange,null);assert.equal(rows[1].summary,'');
 assert.match(discoveryStockRow(rows[0]).textContent,/0 mentions/);
 assert.ok(!Object.hasOwn(rows[0],'price'));
 assert.deepEqual(discoveryRows({status:'pending',items:ranking.items}),[]);
});

test('unfollowed companies have four direct research destinations and feed reads are optional',async()=>{
 const root=setup(),calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,method:options.method});return Response.json(url.startsWith('/radar/social.json')?ranking:{items:[]});};
 const dispose=await mount(root);
 assert.equal(calls.length,1);assert.ok(calls[0].url.startsWith('/radar/social.json'));
 assert.deepEqual([...root.querySelectorAll('.explore-stock-routes a')].map(a=>a.getAttribute('href')),['#/stock/NVDA?from=explore','#/stock/NVDA?from=explore&tab=metrics','#/stock/NVDA?from=explore&tab=evidence','#/boards?ticker=NVDA']);
 assert.deepEqual(store.get('watchlist'),[]);
 const weekly=root.querySelector('.explore-weekly');weekly.open=true;await tick();
 assert.equal(calls.length,2);assert.match(calls[1].url,/scope=all/);assert.ok(calls.every(call=>call.method==='GET'));
 weekly.open=false;await tick();weekly.open=true;await tick();assert.equal(calls.length,2);
 dispose();
});

test('failed refresh preserves dated data but access withdrawal removes it',async()=>{
 const root=setup();let mode='ready';
 globalThis.fetch=async()=>mode==='ready'?Response.json(ranking):Response.json({error:mode},{status:mode==='withdrawn'?403:503});
 const dispose=await mount(root);mode='offline';root.querySelector('.explore-section-heading button').click();await tick();
 assert.equal(root.querySelectorAll('.explore-stock-row').length,1);
 assert.match(root.querySelector('.explore-read-notice').textContent,/previous ranking/);
 assert.match(root.querySelector('.explore-data-date').textContent,/Sep 25/);
 mode='withdrawn';root.querySelector('.explore-section-heading button').click();await tick();
 assert.equal(root.querySelectorAll('.explore-stock-row').length,0);
 assert.equal(root.querySelector('.explore-data-date').textContent,'');
 assert.ok(root.querySelector('.symbol-picker input'));assert.ok(root.querySelector('a[href="#/boards"]'));
 dispose();
});

test('empty ranking keeps search usable and does not invent example stocks',async()=>{
 const root=setup();globalThis.fetch=async()=>Response.json({status:'pending',items:[]});
 const dispose=await mount(root);
 assert.equal(root.querySelectorAll('.explore-stock-row').length,0);
 root.querySelector('.explore-empty button').click();assert.equal(document.activeElement,root.querySelector('.symbol-picker input'));
 dispose();
});

test('aborted and old-account responses cannot populate the next view',async()=>{
 for(const boundary of ['abort','epoch']){
  const root=setup(),controller=new AbortController();let resolve;
  globalThis.fetch=async()=>new Promise(done=>{resolve=done;});
  const mounting=mount(root,{signal:controller.signal});await tick();
  if(boundary==='abort')controller.abort();else store.bumpEpoch();
  resolve(Response.json(ranking));const dispose=await mounting;
  assert.equal(root.querySelectorAll('.explore-stock-row').length,0,boundary);dispose();
 }
});

test('returning keeps the typed research query without replaying a search automatically',async()=>{
 const root=setup(),calls=[];globalThis.fetch=async url=>{calls.push(url);return Response.json(ranking);};
 const controller=new AbortController();let dispose=await mount(root,{signal:controller.signal});
 const input=root.querySelector('.symbol-picker input');input.value='semiconductor';input.dispatchEvent(new window.Event('input',{bubbles:true}));
 controller.abort();dispose();root.replaceChildren();dispose=await mount(root);
 assert.equal(root.querySelector('.symbol-picker input').value,'semiconductor');
 assert.ok(calls.every(url=>url.startsWith('/radar/social.json')));dispose();
});
