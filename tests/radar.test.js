import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/boards'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {filterRecords,archivePath,mount}=await import('../public/js/app/views/boards.js');
const store=await import('../public/js/app/store.js');store.set('me',{tier:'pro'});
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
test('twelve categories, combined search, keyboard disclosures and explicit excerpt mode stay usable',async()=>{
 globalThis.fetch=async url=>response(String(url).includes('radar-history')?{items:[{board:'insider',ticker:'TTMI',ts:'2026-08-26T12:00:00Z',summary:{en:'Historical receipt'},body:{en:'Identity unverified'}}]}:{items:sample});
 const root=document.createElement('section');document.body.append(root);const cleanup=await mount(root,{query:new URLSearchParams()});
 assert.equal(root.querySelector('.signal-screen').open,false);
 assert.equal(root.querySelector('.radar-market-panel'),null);
 assert.equal(document.activeElement,document.body);
 assert.equal(root.querySelectorAll('.radar-category').length,13);
 root.querySelector('[name="ticker"]').value='TTMI';root.querySelector('[name="ticker"]').dispatchEvent(new window.Event('input'));
 root.querySelector('[data-board="insider"]').click();assert.equal(root.querySelectorAll('.radar-record').length,1);
 const toggle=root.querySelector('.radar-record-toggle'),detail=root.querySelector('#'+toggle.getAttribute('aria-controls'));
 assert.equal(detail.hidden,true);toggle.click();assert.equal(detail.hidden,false);assert.equal(toggle.getAttribute('aria-expanded'),'true');
 assert.ok(detail.textContent.includes('Filing evidence'));assert.ok(detail.querySelector('a[href="#/alerts?ticker=TTMI"]'));
 root.querySelector('[data-mode="excerpts"]').click();assert.ok(root.textContent.includes('Identity unverified'));assert.ok(root.textContent.includes('2026-08-26'));
 assert.ok(!root.textContent.includes('radar.'));cleanup();root.remove();
});

test('screen deep links focus their open destination without loading unrelated market research',async()=>{
 const original=window.HTMLElement.prototype.scrollIntoView,scrolls=[];
 window.HTMLElement.prototype.scrollIntoView=function(options){scrolls.push({node:this,options});};
 try{
  for(const query of ['screen=insider-oversold','screen=institution-oversold','screening=1']){
   const methods=[],urls=[];
   globalThis.fetch=async(url,opts)=>{methods.push(opts?.method);urls.push(String(url));
    return response({items:[],sectors:[],filter_version:3});
   };
   const root=document.createElement('section');document.body.append(root);
   const pending=mount(root,{query:new URLSearchParams(query)}),target=root.querySelector('.signal-screen>summary');
   assert.equal(root.querySelector('.signal-screen').open,true);
   assert.equal(root.querySelector('.radar-market-panel'),null);
   assert.equal(document.activeElement,target);
   assert.equal(scrolls.at(-1).node,target);assert.equal(scrolls.at(-1).options.block,'start');
   const cleanup=await pending,control=root.querySelector('[name=scope]');control.focus();
   const before=scrolls.length;await flush();
   assert.equal(urls.some(url=>url.includes('/market/')),false);
   assert.equal(document.activeElement,control);assert.equal(scrolls.length,before);
   assert.equal(methods.includes('POST'),false);
   cleanup();root.remove();
  }
 }finally{if(original)window.HTMLElement.prototype.scrollIntoView=original;else delete window.HTMLElement.prototype.scrollIntoView;}
});

test('leaving a pending deep link prevents late responses from moving focus in the next route',async()=>{
 const pending=[];
 globalThis.fetch=async()=>new Promise(resolve=>pending.push(()=>resolve(response({items:[],sectors:[],filter_version:3}))));
 const root=document.createElement('section');document.body.append(root);
 const ctl=new AbortController(),mounted=mount(root,{query:new URLSearchParams('screening=1'),signal:ctl.signal});
 ctl.abort();root.remove();
 const next=document.createElement('button');document.body.append(next);next.focus();
 for(const resolve of pending)resolve();const cleanup=await mounted;await flush();
 assert.equal(document.activeElement,next);cleanup();next.remove();
});
test('late archive requests cannot overwrite a newer filter and pagination preserves losses',async()=>{
 let firstResolve,requests=[];
 globalThis.fetch=async url=>{url=String(url);if(!url.includes('archive.json') || url.includes('limit=200'))return response({filter_version:3,items:[]});requests.push(url);
  if(requests.length===1)return new Promise(r=>firstResolve=r);
  return response({filter_version:3,items:[{...sample[0],id:requests.length,base_d:'2026-09-05',base_px:100,ret_1d:-3}],next_cursor:requests.length===2?2:null});};
 const root=document.createElement('section');document.body.append(root);const cleanup=await mount(root,{query:new URLSearchParams()});
 root.querySelector('[data-mode="archive"]').click();await flush();
 root.querySelector('[name="ticker"]').value='TTMI';root.querySelector('form.radar-filters').dispatchEvent(new window.Event('submit',{cancelable:true}));await flush();
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

test('LIVE observations keep unknown publication separate from archive dates and delivery',async()=>{
 const records=[
  {id:101,kind:'political',ticker:'BE',provenance:'LIVE',ts:'2026-09-07T01:00:00Z',observed_at:'2026-09-07T01:00:00Z',event_date:'2026-09-04',summary:'Fresh source observation',extra:{publication_basis:'first_observed',source_published_at:null}},
  {id:102,kind:'political',ticker:'INTC',provenance:'LIVE',ts:'2026-09-07T01:00:00Z',observed_at:'2026-09-07T01:00:00Z',summary:'Known publication',extra:{source_published_at:'2026-09-02T13:30:00Z'}},
  {id:103,kind:'political',ticker:'BE',provenance:'INGESTED',ts:'2026-08-04T00:00:00Z',observed_at:'2026-09-07T01:00:00Z',summary:'Historical filing',extra:{date_precision:'day'}},
 ];
 globalThis.fetch=async url=>response(String(url).includes('archive.json')?{items:records,filter_version:3}:{items:[],sources:[],sectors:[]});
 const root=document.createElement('section');document.body.append(root);
 const cleanup=await mount(root,{query:new URLSearchParams('mode=archive&board=political')});
 try{
  const detail=id=>root.querySelector('[data-record-id="'+id+'"] .radar-detail');
  const unknown=detail(101),known=detail(102),historical=detail(103);
  assert.ok(unknown.textContent.includes(copy['app.radar.observation_note']));
  assert.ok(!unknown.textContent.includes(copy['app.radar.backfill_note']));
  const sourceFacts=id=>[...detail(id).querySelectorAll('.radar-detail-facts')].find(row=>row.textContent.includes(copy['app.radar.published_date']));
  assert.equal(sourceFacts(101).querySelector('strong:last-child').textContent,copy['app.radar.publication_unknown']);
  assert.ok(sourceFacts(101).textContent.includes('2026-09-04'));
  assert.equal(sourceFacts(102).querySelector('strong:last-child').textContent,'2026-09-02');
  assert.ok(known.textContent.includes(copy['app.radar.observation_note']));
  assert.ok(historical.textContent.includes(copy['app.radar.backfill_note']));
  assert.equal(sourceFacts(103).querySelector('strong:last-child').textContent,'2026-08-04');
  assert.ok(!root.textContent.includes('radar.observation_note'));
 }finally{cleanup();root.remove();}
});

test('index and news archive categories retain official timing, meaning and stock links',async()=>{
 const index={id:301,kind:'index',ticker:'BE',ts:'2026-09-05T12:00:00Z',provenance:'LIVE',summary:'BE added',extra:{event_type:'index_constituent_change',action:'add',index_name:'S&P 500',effective_at:'2026-09-21',effective_session:'before_open',effective_timezone:'America/New_York',source_published_at:'2026-09-04'}};
 const news={id:302,kind:'news',ticker:'BE',ts:'2026-09-05T13:00:00Z',provenance:'LIVE',summary:'Company announcement',extra:{event_type:'issuer_news',source_published_at:null,publication_basis:'first_observed'}};
 const url=new URL(archivePath({board:'all'}),'https://ducky.test');assert.ok(url.searchParams.get('kind').split(',').includes('index'));assert.ok(url.searchParams.get('kind').split(',').includes('news'));
 assert.deepEqual(filterRecords([index,news],{mode:'archive',board:'news'}).map(row=>row.id),[302]);
 globalThis.fetch=async url=>response(String(url).includes('archive.json')?{items:[index,news],filter_version:3}:{items:[],sources:[],sectors:[]});
 const root=document.createElement('section');document.body.append(root);const cleanup=await mount(root,{query:new URLSearchParams('mode=archive')});
 try {
  const event=root.querySelector('[data-record-id="301"]');assert.match(event.textContent,/Before market open · ET/);assert.match(event.textContent,/Funds tracking/);
  assert.ok(event.querySelector('a[href="#/research/BE"]'));assert.equal(event.querySelector('a[href^="#/calendar?"]').getAttribute('href'),'#/calendar?ticker=BE&date=2026-09-21');
  const release=root.querySelector('[data-record-id="302"]');assert.match(release.textContent,/headline alone/);assert.ok(release.textContent.includes(copy['app.radar.publication_unknown']));
  assert.ok(release.querySelector('a[href="#/calendar?ticker=BE"]'));assert.ok(!root.textContent.includes('radar.kind_index'));
 }finally{cleanup();root.remove();}
});

test('official lowercase live and revision provenance never reuse a historical-backfill claim',async()=>{
 const records=['live','source_revision','source_corroboration'].map((provenance,i)=>({id:401+i,kind:'news',ticker:'BE',ts:'2026-09-05T12:00:00Z',provenance,summary:'Official source record',extra:{event_type:'issuer_news',source_published_at:null}}));
 globalThis.fetch=async url=>response(String(url).includes('archive.json')?{items:records,filter_version:3}:{items:[],sources:[],sectors:[]});
 const root=document.createElement('section');const cleanup=await mount(root,{query:new URLSearchParams('mode=archive')});
 try{for(const [i,key] of ['observation_note','revision_note','corroboration_note'].entries()){const row=root.querySelector('[data-record-id="'+(401+i)+'"]');assert.ok(row.textContent.includes(copy['app.radar.'+key]));assert.ok(!row.textContent.includes(copy['app.radar.backfill_note']));}}
 finally{cleanup();}
});
