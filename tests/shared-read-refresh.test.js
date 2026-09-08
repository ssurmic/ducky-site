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
const {refreshable,sharedReadRefresh}=await import('../public/js/app/shared-read-refresh.js');
const response=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});

test('only shared read endpoints qualify; history, settings, search and mutations never replay',()=>{
 for(const path of ['/evidence/AVGO','/briefing/stocks?ticker=NVDA','/kol/talk/page','/public/calendar.json','/watchlist'])assert.ok(refreshable(path));
 for(const path of ['/evidence/AVGO?version=old','/kol/talk/history','/me/profile','/auth/poll?nonce=secret','/public/symbols?q=AVGO','//external/path','/screens/preview','/radar/social/history.json'])assert.ok(!refreshable(path));
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
