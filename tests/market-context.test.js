import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const {predictionPanel}=await import('../public/js/app/calendar-prediction.js');
const {renderMarketContext,mountMarketContext}=await import('../public/js/app/views/market-context.js');
const store=await import('../public/js/app/store.js');
const response=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
const tick=()=>new Promise(r=>setTimeout(r,10));

function prediction(){return {status:'stale',observed_at:'2026-09-06T12:00:00Z',event_date:'2026-09-16',markets:[{
 group_label:'25 bps decrease',question:'Will the Fed decrease interest rates by 25 bps after the September 2026 meeting?',
 outcomes:[{label:'No',probability:.65},{label:'Yes',probability:.35}],status:'thin_market',
 liquidity_usd:500,volume_24h_usd:0,source_url:'https://polymarket.com/market/fed',
 resolution_rules:'Official FOMC statement determines the change versus the pre-meeting level.',provider_updated_at:'2026-09-06T11:00:00Z'}]};}

test('event probabilities preserve exact labels, timestamp, rules and thin/stale conditions',()=>{
 const box=predictionPanel(prediction());
 assert.match(box.textContent,/65.0%/);assert.match(box.textContent,/35.0%/);
 assert.match(box.textContent,/more than a day old/);assert.match(box.textContent,/Limited liquidity/);
 assert.match(box.textContent,/September 2026 meeting/);assert.match(box.textContent,/Official FOMC statement/);
 assert.match(box.textContent,/2026-09-06T12/);assert.equal(box.querySelector('a').hostname,'polymarket.com');
});
test('PPI missing odds remain unavailable, invalid prices cannot render as probabilities',()=>{
 assert.match(predictionPanel({status:'no_match',markets:[]}).textContent,/another month or indicator are not a substitute/);
 const doc=prediction();doc.markets[0].outcomes=[{label:'Yes',probability:5}];
 assert.doesNotMatch(predictionPanel(doc).textContent,/500\.0%/);
});
test('market context labels headline coverage and creator attribution without raw HTML',()=>{
 const doc={status:'ok',observed_at:'2026-09-06',coverage:{headlines:1,creator_views:1,distinct_publishers:2},
 topics:[{id:'rates',label_en:'Rates',source_count:2,latest_at:'2026-09-05',fact_ids:['n','c'],tickers:['SPY']}],evidence:[
 {id:'n',kind:'news_headline',title:'<img src=x onerror=alert(1)> Fed debate',publisher:'News',source_url:'javascript:alert(1)',published_at:'2026-09-05'},
 {id:'c',kind:'creator_view',title:'Rate outlook',publisher:'Creator',source_url:'https://youtube.com/watch?v=example',published_at:'2026-09-04',summary_en:'A creator view'}]};
 const box=renderMarketContext(doc);assert.equal(box.querySelector('img'),null);assert.equal(box.querySelector('a[href^="javascript"]'),null);
 assert.match(box.textContent,/full article not reviewed/);assert.match(box.textContent,/This is the creator/);
 assert.ok(box.querySelector('a[href="#/chart/SPY"]'));assert.match(box.textContent,/not consensus/);
});
test('free market preview makes only a public request and logout discards pending private data',async()=>{
 store.set('me',{tier:'free'});const urls=[];globalThis.fetch=async url=>{urls.push(String(url));return response({status:'unavailable'});};
 const free=document.createElement('div');const dispose=mountMarketContext(free);await tick();
 assert.deepEqual(urls,['/public/market-preview.json']);dispose();
 store.set('me',{tier:'pro'});let done;globalThis.fetch=()=>new Promise(r=>done=r);
 const root=document.createElement('div');const clean=mountMarketContext(root);
 store.bumpEpoch();store.set('me',null);done(response({status:'ok',topics:[{label_en:'SECRET'}]}));await tick();
 assert.doesNotMatch(root.textContent,/SECRET/);clean();
});
