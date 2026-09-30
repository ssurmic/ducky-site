import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));
document.body.append(strings);
const {macroTiles,macroStrip}=await import('../public/js/app/today-macro.js');
const {canonicalReading}=await import('../public/js/app/today-market-readings.js');
const saved=(value,extra={})=>({value,date:'2026-09-28',source:'quote',series:'^TNX',basis:'stored_observed_reading',live:false,observed_at:'2026-09-29T00:02:00Z',...extra});
function documentFixture(){return {as_of:'2026-09-25',observed_at:'2026-09-29T00:02:00Z',
  latest:{date:'2026-09-25',funding_score:70,metrics:{nominal_10y:4.99,vix:14.21,vix_term_ratio:1.4}},
  latest_available:{as_of:'2026-09-25',metrics:{nominal_10y:5.17,vix:14.21}},
  intraday:{phase:'open',session:'2026-09-28',quoted_at:'2026-09-28T19:58:00Z',nominal_10y:5.36,vix:16.5,vix_term_ratio:1.2},
  observed:[{date:'2026-09-28',nominal_10y:5.31,vix:16.4}],
  market_readings:{schema:'market-readings/1',session:'2026-09-28',metrics:{
    nominal_10y:saved(5.24),vix:saved(16.07,{series:'^VIX'}),
    funding_score:saved(0,{date:'2026-09-25',source:'macro_beta',series:'funding_score',basis:'session_aligned_score',live:true}),
    vix_term_ratio:saved(.85,{date:'2026-09-25',source:'fred',series:'VIXCLS/VXVCLS',basis:'latest_available_print',observed_at:null,
      components:[{series:'VIXCLS',source:'fred',date:'2026-09-25'},{series:'VXVCLS',source:'fred',date:'2026-09-25'}]})}},
  digest:{version:'market-digest/1.3',edition:'close_snapshot',status:'ready',session:'2026-09-28',generated_at:'2026-09-29T00:02:00Z',macro:{en:'10-year yield 5.24%; VIX 16.1.'}}};}

test('canonical per-metric numbers replace conflicting legacy inputs without changing saved prose',()=>{
 const doc=documentFixture(),before=JSON.stringify(doc),tiles=macroTiles(doc);
 assert.equal(tiles[1].value,'5.24%');assert.equal(tiles[2].value,'16.1');
 assert.match(tiles[1].stamp,/Data dated 2026-09-28.*Quotes \^TNX/);assert.doesNotMatch(tiles[1].stamp,/close|settled/i);
 assert.match(tiles[1].recorded,/Recorded 9\/28\/2026, 20:02 ET/);
 const strip=macroStrip(doc,{now:new Date('2026-09-29T00:03:00Z')});
 assert.match(strip.querySelector('.today-digest-grid').textContent,/10-year yield 5.24%; VIX 16.1/);
 assert.equal(strip.querySelector('[data-tile=yield] .today-macro-value').textContent,'5.24%');
 assert.match(strip.querySelector('.today-macro-source').textContent,/Each reading carries its own date and source/);
 assert.doesNotMatch(strip.querySelector('.today-macro-source').textContent,/through 2026-09-25/);
 assert.equal(JSON.stringify(doc),before);
 doc.market_readings.metrics.nominal_10y.components='irrelevant extension';
 assert.equal(macroTiles(doc)[1].value,'5.24%','non-ratio extension fields cannot break the reading');
});

test('dated funding zero controls its own gauge and tone even when raw live is true',()=>{
 const doc=documentFixture(),tile=macroTiles(doc)[0];
 assert.equal(tile.value,'0');assert.equal(tile.gauge.score,0);assert.equal(tile.tone,'down');
 assert.match(tile.stamp,/Score dated 2026-09-25.*Funding series/);assert.doesNotMatch(tile.stamp,/Intraday|funding_score/);
 const strip=macroStrip(doc);assert.equal(strip.querySelector('[data-tile=liquidity] .today-gauge-value').textContent,'0');
});

test('intraday and acquisition clocks remain distinct; ratios carry their own source date',()=>{
 const doc=documentFixture();doc.market_readings.metrics.nominal_10y=saved(5.24,{basis:'saved_intraday_observation',live:true,observed_at:'2026-09-29T05:00:00Z'});
 const [,,vix]=macroTiles(doc),yieldTile=macroTiles(doc)[1];
 assert.match(yieldTile.stamp,/Intraday reading 2026-09-28/);assert.match(yieldTile.recorded,/Recorded 9\/29\/2026, 01:00 ET/);
 assert.doesNotMatch(yieldTile.stamp,/01:00|close|settled/);
 assert.match(vix.note,/0.85/);assert.match(vix.ratioStamp,/Data dated 2026-09-25.*FRED VIXCLS \/ FRED VXVCLS/);
 assert.equal(vix.ratioRecorded,null);assert.match(vix.stamp,/2026-09-28.*\^VIX/);
});

test('recognized missing or malformed readings never refill from the legacy values',()=>{
 const invalid=[null,undefined,saved(null),saved('5.24'),saved(Infinity),saved(NaN),saved(5.24,{date:'2026-09-29'}),
   saved(5.24,{date:'2026-02-30'}),saved(5.24,{date:null}),saved(5.24,{source:'unknown'}),saved(5.24,{series:''}),
   saved(5.24,{basis:'final_close'}),saved(5.24,{live:'false'}),saved(5.24,{observed_at:'2026-09-28'}),
   saved(5.24,{observed_at:'2026-02-30T01:00:00Z'}),saved(5.24,{observed_at:'2026-09-28T16:00:00'}),
   saved(5.24,{basis:'saved_intraday_observation',live:false})];
 for(const value of invalid){const doc=documentFixture();doc.market_readings.metrics.nominal_10y=value;
   assert.equal(canonicalReading(doc,'nominal_10y'),null);assert.equal(macroTiles(doc)[1].value,'—');
 }
 for(const patch of [{session:null},{session:'2026-02-30'},{metrics:null}]){
   const doc=documentFixture();Object.assign(doc.market_readings,patch);
   assert.deepEqual(macroTiles(doc).slice(0,3).map(t=>t.value),['—','—','—']);
 }
});

test('ratio dates and components must be usable; missing ratio leaves its color neutral',()=>{
 const doc=documentFixture();doc.market_readings.metrics.vix_term_ratio.components[1].date='2026-09-24';
 let tile=macroTiles(doc)[2];assert.equal(tile.value,'16.1');assert.equal(tile.tone,'flat');assert.equal(tile.ratioStamp,null);assert.doesNotMatch(tile.note,/0.85|1.20/);
 doc.market_readings.metrics.vix_term_ratio.components=[];assert.equal(canonicalReading(doc,'vix_term_ratio'),null);
 doc.market_readings.metrics.vix_term_ratio=null;assert.equal(canonicalReading(doc,'vix_term_ratio'),null);
});

test('missing canonical metrics do not hide a separately readable metric or reuse an old score',()=>{
 const doc=documentFixture();doc.market_readings.metrics={nominal_10y:saved(0,{observed_at:null,live:null})};delete doc.latest;
 const strip=macroStrip(doc);assert.equal(strip.querySelectorAll('.today-macro-tile').length,6);
 assert.equal(strip.querySelector('[data-tile=yield] .today-macro-value').textContent,'0.00%');
 assert.equal(strip.querySelector('[data-tile=liquidity] .today-macro-value').textContent,'—/100');
 assert.equal(strip.querySelector('[data-tile=yield] .today-macro-recorded'),null);
});

test('absent and unknown schemas keep the legacy document path without mixing known canonical fields',()=>{
 const doc=documentFixture();
 for(const market_readings of [undefined,null,{...doc.market_readings,schema:'market-readings/2'},{metrics:doc.market_readings.metrics}]){
   const tiles=macroTiles({...doc,market_readings});assert.deepEqual(tiles.slice(0,3).map(t=>t.value),['70','5.36%','16.5']);
 }
});
