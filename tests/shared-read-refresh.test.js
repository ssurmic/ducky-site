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
 for(const path of ['/evidence/AVGO','/briefing/stocks?ticker=NVDA','/kol/talk/page','/kol/touzi-talk/posts/3E-HXC2HUvg','/public/calendar.json','/watchlist'])assert.ok(refreshable(path));
 for(const path of ['/evidence/AVGO?version=old','/kol/talk/history','/kol/talk/posts','/kol/talk/posts/abc?version=old','/kol/talk/posts/abc/review','/me/profile','/auth/poll?nonce=secret','/public/symbols?q=AVGO','//external/path','/screens/preview','/radar/social/history.json'])assert.ok(!refreshable(path));
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
