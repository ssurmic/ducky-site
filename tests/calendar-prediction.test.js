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

function prediction(){return {status:'stale',observed_at:'2026-09-06T12:00:00Z',event_date:'2026-09-16',markets:[{
 group_label:'25 bps decrease',question:'Will the Fed decrease interest rates by 25 bps after the September 2026 meeting?',
 outcomes:[{label:'No',probability:.65},{label:'Yes',probability:.35}],status:'thin_market',
 liquidity_usd:500,volume_24h_usd:0,source_url:'https://polymarket.com/market/fed',
 resolution_rules:'Official FOMC statement determines the change versus the pre-meeting level.',provider_updated_at:'2026-09-06T11:00:00Z'}]};}

test('event probabilities preserve exact labels, timestamp, rules and thin/stale conditions',()=>{
 const box=predictionPanel(prediction());
 assert.match(box.textContent,/65.0%/);assert.match(box.textContent,/35.0%/);
 assert.match(box.textContent,/More than a day old/);assert.match(box.textContent,/Limited liquidity/);
 assert.match(box.textContent,/September 2026 meeting/);assert.match(box.textContent,/Official FOMC statement/);
 assert.match(box.textContent,/2026-09-06 12:00 UTC/);assert.equal(box.querySelector('a').hostname,'polymarket.com');
});
test('PPI missing odds remain unavailable, invalid prices cannot render as probabilities',()=>{
 assert.match(predictionPanel({status:'no_match',markets:[]}).textContent,/another month or indicator are not a substitute/);
 const doc=prediction();doc.markets[0].outcomes=[{label:'Yes',probability:5}];
 assert.doesNotMatch(predictionPanel(doc).textContent,/500\.0%/);
});
