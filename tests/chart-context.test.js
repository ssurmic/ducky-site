import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body></body></html>');
for(const k of ['window','document','Node'])globalThis[k]=dom.window[k];
const copy=document.createElement('script');copy.id='ducky-strings';copy.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(copy);
const {aggregateBars,selectedSnapshot,optionScope,wallPosition}=await import('../public/js/app/chart-context.js');
const {waterLevel,priceBadge,marketDetail}=await import('../public/js/app/evidence-context.js');
const bars=[{time:'2026-08-28',open:100,high:105,low:98,close:101,volume:2},{time:'2026-08-31',open:101,high:110,low:100,close:108,volume:4},{time:'2026-09-01',open:107,high:109,low:103,close:104,volume:0}];
test('candle aggregation separates Monday weeks and calendar months, preserving OHLC and zero volume',()=>{
 assert.strictEqual(aggregateBars(bars,'day'),bars);
 assert.deepEqual(aggregateBars(bars,'week'),[{...bars[0],time:'2026-08-24'},{time:'2026-08-31',open:101,high:110,low:100,close:104,volume:4}]);
 assert.deepEqual(aggregateBars(bars,'month'),[{time:'2026-08-01',open:100,high:110,low:98,close:108,volume:6},{...bars[2]}]);
 assert.equal(bars.length,3);assert.equal(bars[1].close,108);
});
test('individual expiry never inherits combined levels or the expected move expiry',()=>{
 const snap={gamma:{call_wall:110,put_wall:90,scope:{expiries:['2026-09-11','2026-09-18']},by_expiry:[{expiry:'2026-09-18',call_wall:120,put_wall:80}]},expected:{expiry:'2026-09-11',low:95,high:105}};
 const one=selectedSnapshot(snap,'2026-09-18');assert.equal(one.gamma.call_wall,120);assert.equal(one.expected,null);
 assert.match(optionScope(one),/2026-09-18/);assert.doesNotMatch(optionScope(one),/2026-09-11/);
 assert.equal(selectedSnapshot(snap,'combined',true).expected.expiry,'2026-09-11');
 assert.match(optionScope({gamma:{call_wall:100},expected:{expiry:'2026-09-11'}}),/not saved/);
 assert.match(wallPosition(121,one.gamma),/above/);assert.match(wallPosition(79,one.gamma),/below/);assert.match(wallPosition(null,one.gamma),/incomplete/);
});
test('missing, stale and out-of-range prices never create a green water score',()=>{
 const d={status:'ready',market_context:{price_position:{data:{low:90,high:110,position:.2}}}};
 assert.equal(waterLevel(d),.8);assert.equal(waterLevel({...d,status:'stale'}),null);assert.equal(waterLevel({}),null);
 d.market_context.price_position.data.position=-.2;assert.equal(waterLevel(d),null);
});

test('saved quote amount and source time remain distinct from daily-close validity',()=>{
 const doc={ticker:'COIN',price_session_context:{status:'invalid'},market_context:{price:{data:{price:178.94,price_session:'2026-09-08:CLOSED',basis:'saved_provider_quote_not_live_tick'},observed_at:'2026-09-08T20:07:28.318816+00:00'}}};
 assert.match(priceBadge(doc).textContent,/178.94.*time needs checking/);
 doc.price_session_context.status='current';assert.match(priceBadge(doc).textContent,/Saved quote.*2026-09-08/);
 marketDetail(doc);const dialog=document.querySelector('[role=dialog]');
 assert.match(dialog.textContent,/not a live tick or a verified closing price/);assert.match(dialog.textContent,/2026-09-08 20:07 UTC/);
 assert.doesNotMatch(dialog.textContent,/T20:07|318816/);
 doc.price_session_context.status='stale';assert.match(priceBadge(doc).textContent,/overdue/);
 for(const price of [null,0,-1,NaN,Infinity]){doc.market_context.price.data.price=price;assert.match(priceBadge(doc).textContent,/—Price unavailable/);}
});
