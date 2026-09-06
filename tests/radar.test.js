import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/boards'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {filterRecords,archivePath,mount}=await import('../public/js/app/views/boards.js');
const now=Date.parse('2026-09-06T00:00:00Z');
const sample=[
 {id:1,kind:'insider',open_market_value:200000,ticker:'TTMI',ts:'2026-09-05T00:00:00Z',summary:'Director purchase',extra:{message_text:'Filing evidence'},ret_5d:-8},
 {id:2,kind:'political',ticker:'TTMI',ts:'2026-09-04T12:00:00Z',summary:'Disclosure'},
 {id:3,kind:'insider',ticker:'NVDA',ts:'2026-09-04T12:00:00Z',summary:null},
 {id:4,kind:'insider',ticker:'TTMI',ts:'2026-08-20T12:00:00Z',summary:'Old purchase'}];
const response=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setTimeout(r,0));};
test('radar filters compose without treating historical excerpts, losses or missing text as new events',()=>{
 assert.deepEqual(filterRecords(sample,{mode:'recent',days:7,board:'insider',ticker:'$ttmi',q:'evidence',content:'readable'},now).map(r=>r.id),[1]);
 assert.deepEqual(filterRecords(sample,{mode:'archive',content:'missing'},now).map(r=>r.id),[3]);
 assert.deepEqual(filterRecords(sample,{mode:'archive',start:'2026-09-04',end:'2026-09-04'},now).map(r=>r.id),[3,2]);
 assert.equal(filterRecords(sample,{mode:'archive',content:'all'},now).length,4);
 assert.equal(filterRecords(sample,{mode:'recent',days:7},now)[0].ret_5d,-8);
});
test('full archive filters and pagination are sent to the server, not applied only to the visible page',()=>{
 const url=new URL(archivePath({board:'insider',q:'CEO & director',ticker:'TTMI',start:'2026-08-01',end:'2026-09-05',content:'missing'},42),'https://example.test');
 assert.equal(url.searchParams.get('kind'),'insider,cluster');
 assert.equal(url.searchParams.get('q'),'CEO & director');
 assert.equal(url.searchParams.get('start'),'2026-08-01');assert.equal(url.searchParams.get('end'),'2026-09-05');
 assert.equal(url.searchParams.get('before'),'42');assert.equal(url.searchParams.get('content'),'missing');
});
test('nine categories, combined search, keyboard disclosures and explicit excerpt mode stay usable',async()=>{
 globalThis.fetch=async url=>response(String(url).includes('radar-history')?{items:[{board:'insider',ticker:'TTMI',ts:'2026-08-26T12:00:00Z',summary:{en:'Historical receipt'},body:{en:'Identity unverified'}}]}:{items:sample});
 const root=document.createElement('section');document.body.append(root);const cleanup=await mount(root,{query:new URLSearchParams()});
 assert.equal(root.querySelectorAll('.radar-category').length,10);
 root.querySelector('[name="ticker"]').value='TTMI';root.querySelector('[name="ticker"]').dispatchEvent(new window.Event('input'));
 root.querySelector('[data-board="insider"]').click();assert.equal(root.querySelectorAll('.radar-record').length,1);
 const toggle=root.querySelector('.radar-record-toggle'),detail=root.querySelector('#'+toggle.getAttribute('aria-controls'));
 assert.equal(detail.hidden,true);toggle.click();assert.equal(detail.hidden,false);assert.equal(toggle.getAttribute('aria-expanded'),'true');
 assert.ok(detail.textContent.includes('Filing evidence'));assert.ok(detail.querySelector('a[href="#/alerts?ticker=TTMI"]'));
 root.querySelector('[data-mode="excerpts"]').click();assert.ok(root.textContent.includes('Identity unverified'));assert.ok(root.textContent.includes('2026-08-26'));
 assert.ok(!root.textContent.includes('radar.'));cleanup();root.remove();
});
test('late archive requests cannot overwrite a newer filter and pagination preserves losses',async()=>{
 let firstResolve,requests=[];
 globalThis.fetch=async url=>{url=String(url);if(!url.includes('archive.json') || url.includes('limit=200'))return response({filter_version:3,items:[]});requests.push(url);
  if(requests.length===1)return new Promise(r=>firstResolve=r);
  return response({filter_version:3,items:[{...sample[0],id:requests.length,base_d:'2026-09-05',base_px:100,ret_1d:-3}],next_cursor:requests.length===2?2:null});};
 const root=document.createElement('section');document.body.append(root);const cleanup=await mount(root,{query:new URLSearchParams()});
 root.querySelector('[data-mode="archive"]').click();await flush();
 root.querySelector('[name="ticker"]').value='TTMI';root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));await flush();
 firstResolve(response({filter_version:3,items:[{id:99,kind:'insider',summary:'Stale response'}]}));await flush();
 assert.ok(!root.textContent.includes('Stale response'));assert.ok(root.textContent.includes('-3.0%'));
 root.querySelector('.radar-more').click();await flush();assert.equal(root.querySelectorAll('.radar-record').length,2);
 assert.ok(requests[2].includes('before=2'));assert.ok(requests[2].includes('ticker=TTMI'));
 assert.equal(root.querySelectorAll('.radar-day').length,1);assert.equal(root.querySelector('.radar-more').hidden,true);
 cleanup();root.remove();
});
test('archive failure retains loaded records and retries the same cursor',async()=>{
 let attempt=0;
 globalThis.fetch=async url=>{if(!String(url).includes('archive.json') || String(url).includes('limit=200'))return response({filter_version:3,items:[]});attempt++;
  if(attempt===2)throw new Error('offline');
  return response({filter_version:3,items:[sample[0]],next_cursor:1});};
 const root=document.createElement('section');document.body.append(root);const cleanup=await mount(root,{query:new URLSearchParams('mode=archive')});
 root.querySelector('.radar-more').click();await flush();assert.equal(root.querySelectorAll('.radar-record').length,1);
 assert.ok(root.textContent.includes(copy['app.boards.load_error']));
 [...root.querySelectorAll('button')].find(b=>b.textContent===copy['app.common.retry']).click();await flush();
 assert.equal(attempt,3);assert.equal(root.querySelectorAll('.radar-record').length,1);cleanup();root.remove();
});
test('an older archive service cannot silently pretend to support new filters',async()=>{
 globalThis.fetch=async()=>response({items:sample});
 const root=document.createElement('section');const cleanup=await mount(root,{query:new URLSearchParams('mode=archive&q=director')});
 assert.ok(root.textContent.includes(copy['app.boards.load_error']));assert.equal(root.querySelectorAll('.radar-record').length,0);cleanup();
});

test('company and venue filters compose with search and unknown caps stay explicit',()=>{
 const rows=[{...sample[0],issuer_name:'ScanSource Inc',reporter_name:'Oaktree',sector:'Technology',market_cap:2e9},
 {...sample[0],id:9,open_market_value:0,sector:'Technology',market_cap:null,extra:{facts:{purchase_values:{unverified:200000}}}}];
 assert.deepEqual(filterRecords(rows,{mode:'archive',q:'ScanSource',sector:'Technology',cap:'mid',purchases:'open_market'}).map(r=>r.id),[1]);
 assert.deepEqual(filterRecords(rows,{mode:'archive',cap:'unknown',purchases:'unverified'}).map(r=>r.id),[9]);
 const url=new URL(archivePath({sector:'Technology',cap:'mid',purchases:'open_market'}),'https://example.test');
 assert.equal(url.searchParams.get('sector'),'Technology');assert.equal(url.searchParams.get('cap'),'mid');assert.equal(url.searchParams.get('purchases'),'open_market');
});
