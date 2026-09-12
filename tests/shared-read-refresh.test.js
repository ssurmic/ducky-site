import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(
 Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
let hidden=false;Object.defineProperty(document,'visibilityState',{get:()=>hidden?'hidden':'visible'});
const api=await import('../public/js/app/api.js'),store=await import('../public/js/app/store.js');
const {refreshable,material,sharedReadRefresh}=await import('../public/js/app/shared-read-refresh.js');
const response=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});

test('only shared read endpoints qualify; history, settings, search and mutations never replay',()=>{
 for(const path of ['/evidence/AVGO','/briefing/stocks?ticker=NVDA','/kol/talk/page','/kol/touzi-talk/posts/3E-HXC2HUvg','/public/calendar.json','/watchlist','/public/radar/archive.json?start=2026-09-01&limit=200','/public/radar/coverage.json','/public/radar/facets.json'])assert.ok(refreshable(path));
 for(const path of ['/evidence/AVGO?version=old','/kol/talk/history','/kol/talk/posts','/kol/talk/posts/abc?version=old','/kol/talk/posts/abc/review','/me/profile','/auth/poll?nonce=secret','/public/symbols?q=AVGO','//external/path','/screens/preview','/radar/social/history.json','/public/radar/archive.json?before=record-1','/public/radar/archive.json?cursor=old','/public/radar/archive.json?version=old','/public/radar/archive.json?offset=20','/public/radar/archive.json?before_id=1','/public/radar/social.json','/public/radar/history.json'])assert.ok(!refreshable(path));
});

const evidence=()=>({id:'stored-graph',ticker:'AVGO',checked_at:'check-1',recorded_at:'build-1',
 coverage:{jobs:{pending:12}},ticker_coverage:{jobs:{ready:2}},
 nodes:[{id:'point-1',stance:'support',recorded_at:'projection-1',evidence:[{
  source_hash:'original',published_at:'2026-09-03',observed_at:'2026-09-08',verification:'source_reviewed',
  title:{zh:'博主认为估值便宜'},condition_text:'2028年盈利预测兑现'}]}],
 market_context:{price:{data:{price:357.9,price_session:'2026-09-04:CLOSED'},freshness:'recorded'}},
 missing:['options'],withheld:0,analysis_status:'pending',analysis:null});

test('evidence rechecks and unrelated queue progress do not announce new research',async()=>{
 store.bumpEpoch();store.set('me',{tier:'pro'});hidden=false;
 const root=document.createElement('main'),watch=sharedReadRefresh(root,{reload:()=>{}});
 let value=evidence();globalThis.fetch=async()=>response(value);await api.get('/evidence/AVGO');
 value=structuredClone(value);value.checked_at='check-2';value.recorded_at='build-2';value.id='reprojected-graph';
 value.nodes[0].recorded_at='projection-2';value.coverage.jobs.pending=10;value.ticker_coverage.jobs.ready=4;
 await watch.check();assert.equal(root.querySelector('aside').hidden,true);
 for(const state of ['retry','waiting','building','pending']){
  value.analysis_status=state;value.summary_status=state;
  await watch.check();assert.equal(root.querySelector('aside').hidden,true);
 }
 // A source can be withdrawn at read time, even if no graph has been rebuilt.
 value.nodes=[];value.withheld=1;await watch.check();assert.equal(root.querySelector('aside').hidden,false);watch.stop();
});

test('evidence signatures retain attribution, corrections, market state and saved analysis',()=>{
 const original=evidence(),signature=material(original,'/evidence/AVGO');
 const edits=[
  x=>x.nodes[0].stance='counter',x=>x.nodes[0].evidence[0].source_hash='corrected',
  x=>x.nodes[0].evidence[0].published_at='2026-09-04',x=>x.nodes[0].evidence[0].observed_at='2026-09-09',
  x=>x.nodes[0].evidence[0].verification='withdrawn',x=>x.nodes[0].evidence[0].condition_text=null,
  x=>x.nodes[0].evidence[0].title.zh='博主认为估值偏高',
  x=>x.market_context.price.data.price=0,x=>x.market_context.price.data.price=null,
  x=>x.market_context.price.data.price_session='2026-09-08:CLOSED',x=>x.market_context.price.freshness='stale',
  x=>x.missing=[],x=>x.analysis_status='source_changed',x=>x.analysis_status='refresh_pending',x=>x.analysis_evidence_version='new-version',
  x=>{x.analysis_status='ready';x.analysis={overview:{zh:'有来源的已保存分析',citations:['point-1']}};},
 ];
 for(const edit of edits){const next=structuredClone(original);edit(next);assert.notEqual(material(next,'/evidence/AVGO'),signature);}
 assert.equal(material(Object.fromEntries(Object.entries(original).reverse()),'/evidence/AVGO'),signature);
 // Other endpoint versions/coverage remain meaningful under their own contract.
 const next=structuredClone(original);next.id='new';next.coverage.jobs.pending=0;
 assert.notEqual(material(next,'/briefing'),material(original,'/briefing'));
});

test('changed shared data gets one notice without replacing disclosures; hidden pages and abort stop reads',async()=>{
 store.bumpEpoch();store.set('me',{tier:'pro'});hidden=false;
 const ctl=new AbortController(),root=document.createElement('main');root.innerHTML='<details open><summary>Evidence</summary><input value="draft"></details>';
 document.body.append(root);let value={id:'one',nodes:[1]},reads=0,reloads=0;
 globalThis.fetch=async()=>{reads++;return response(value);};
 const watch=sharedReadRefresh(root,{signal:ctl.signal,reload:()=>reloads++});
 await api.get('/evidence/AVGO');await watch.check();assert.equal(root.querySelector('aside').hidden,true);
 hidden=true;await watch.check();assert.equal(reads,2);hidden=false;
 value={id:'two',nodes:[1,2]};await watch.check();assert.equal(reads,3);
 assert.equal(root.querySelector('aside').hidden,false);assert.ok(root.querySelector('details').open);
 assert.equal(root.querySelector('input').value,'draft');assert.equal(reloads,0);
 await watch.check();assert.equal(reads,3);root.querySelector('aside button').click();assert.equal(reloads,1);
 ctl.abort();await watch.check();assert.equal(reads,3);root.remove();
});

test('existing view polling updates the baseline and late responses cannot enter the next page',async()=>{
 store.bumpEpoch();store.set('me',{tier:'pro'});let resolve;
 globalThis.fetch=()=>new Promise(r=>resolve=r);
 const a=document.createElement('main'),first=sharedReadRefresh(a,{reload:()=>{}});
 const pending=api.get('/evidence/AVGO');first.stop();
 const b=document.createElement('main'),second=sharedReadRefresh(b,{reload:()=>{}});
 resolve(response({id:'old'}));await pending;
 let reads=0;globalThis.fetch=async()=>{reads++;return response({id:'current'});};
 await second.check();assert.equal(reads,0);
 await api.get('/evidence/AVGO');await api.get('/evidence/AVGO');await second.check();
 assert.equal(b.querySelector('aside').hidden,true);second.stop();
});

test('failed permission revalidation withholds the prior private page',async()=>{
 store.bumpEpoch();store.set('me',{tier:'pro'});const root=document.createElement('main');root.innerHTML='<div class="route-page">Private research</div>';
 const watch=sharedReadRefresh(root,{reload:()=>{}});globalThis.fetch=async()=>response({id:'one'});
 await api.get('/briefing/stocks');globalThis.fetch=async()=>response({error:'pro_required'},402);await watch.check();
 assert.ok(root.querySelector('.route-page').hidden);assert.match(root.querySelector('aside').textContent,/Your access has changed/);watch.stop();
});


test('delayed public Radar data is revalidated without bearer credentials or mutations',async()=>{
 store.bumpEpoch();store.set('me',{tier:'free'});store.set('token','private-session');hidden=false;
 const ctl=new AbortController(),root=document.createElement('main'),watch=sharedReadRefresh(root,{signal:ctl.signal,reload:()=>{}});
 let value={items:[{id:1,title:'Previously released source'}],access:{mode:'delayed',delay_days:5}},requests=[];
 globalThis.fetch=async(url,options)=>{requests.push({url,options});return response(value);};
 const path='/public/radar/archive.json?start=2026-09-01&limit=200';
 await api.get(path,{auth:false});hidden=true;await watch.check();assert.equal(requests.length,1);
 hidden=false;await watch.check();assert.equal(root.querySelector('aside').hidden,true);
 value={...value,items:[...value.items,{id:2,title:'Newly released source'}]};
 await watch.check();assert.equal(root.querySelector('aside').hidden,false);
 assert.equal(requests.length,3);assert.ok(requests.every(({url,options})=>url===path&&options.method==='GET'&&!options.headers.Authorization));
 ctl.abort();await watch.check();assert.equal(requests.length,3);store.set('token',null);
});

test('shared stock reads adopt new summaries with GETs; nested queue clocks stay quiet',async()=>{
 for(const path of ['/me/stock-research','/stock-research/NVDA'])assert.ok(refreshable(path));
 for(const path of ['/me/stock-research?q=x','/stock-research/NVDA?version=old','/stock-research/NVDA?cursor=old','/me/research-changes?scope=all'])assert.ok(!refreshable(path));
 const before={ticker:'AVGO',price:{price:100,quote_at:'2026-09-10T08:00:00Z'},evidence:evidence()},after=structuredClone(before);
 after.evidence.coverage.jobs.pending--;after.evidence.checked_at='later';after.evidence.nodes[0].recorded_at='later';after.evidence.analysis_status='retry';
 assert.equal(material(before,'/stock-research/AVGO'),material(after,'/stock-research/AVGO'));
 after.evidence.nodes=[];assert.notEqual(material(before,'/stock-research/AVGO'),material(after,'/stock-research/AVGO'));
 store.bumpEpoch();store.set('me',{tier:'pro'});hidden=false;
 const root=document.createElement('main'),watch=sharedReadRefresh(root,{reload:()=>assert.fail('No full-page reload')});
 let current={items:[{ticker:'AVGO',status:'pending'}]},reads=[];
 globalThis.fetch=async(url,options)=>{reads.push([url,options.method]);return response(current);};
 await api.get('/me/stock-research');let adopted;
 root.addEventListener('ducky:shared-read',event=>{adopted=event.detail.value;event.detail.accepted=true;});
 current={items:[{ticker:'AVGO',status:'ready',overview:{en:'A source-linked summary'}}]};await watch.check();
 assert.deepEqual(adopted,current);assert.equal(root.querySelector('aside').hidden,true);
 current={items:[]};await watch.check();assert.deepEqual(adopted,current);
 assert.deepEqual(reads,[['/me/stock-research','GET'],['/me/stock-research','GET'],['/me/stock-research','GET']]);watch.stop();
});

test('serving clocks never count as new data: snapshot served_at and watchlist quote checked_at are ignored',()=>{
 const snapshot={ticker:'NVDA',served_at:'2026-09-12T20:00:00Z',snapshot:{spot:100}};
 assert.equal(material(snapshot,'/snapshot/NVDA'),material({...snapshot,served_at:'2026-09-12T20:00:30Z'},'/snapshot/NVDA'));
 assert.notEqual(material(snapshot,'/snapshot/NVDA'),material({...snapshot,snapshot:{spot:101}},'/snapshot/NVDA'));
 const list={items:['NVDA'],overview:{items:[{ticker:'NVDA',price:98,quote:{price:100,quote_at:'2026-09-12T19:59:00Z',checked_at:'2026-09-12T20:00:00Z',age_seconds:60,status:'current'}}]}};
 const later=structuredClone(list);later.overview.items[0].quote.checked_at='2026-09-12T20:01:00Z';later.overview.items[0].quote.age_seconds=120;
 assert.equal(material(list,'/watchlist'),material(later,'/watchlist'));
 const moved=structuredClone(list);moved.overview.items[0].quote.price=101;
 assert.notEqual(material(list,'/watchlist'),material(moved,'/watchlist'));
 const relabelled=structuredClone(list);relabelled.overview.items[0].quote.status='stale';
 assert.notEqual(material(list,'/watchlist'),material(relabelled,'/watchlist'));
});
