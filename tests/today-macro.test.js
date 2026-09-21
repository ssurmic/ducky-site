import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const macro=await import('../public/js/app/today-macro.js');

const doc={schema:'macro-beta/1',status:'ok',as_of:'2026-09-18',observed_at:'2026-09-19T12:00:00Z',history:[{}],
 latest:{date:'2026-09-18',regime:'mixed',funding_score:54.4,metrics:{net_liquidity_bn:5850,net_liquidity_65d_change_bn:-120,nominal_10y:4.12,nominal_10y_20d_change_bp:9.2,vix:17.6,vix_3m:19.1,vix_term_ratio:0.9215}},
 fear_greed:{score:27,rating:'fear',previous_close:31}};

test('the four macro tiles read the saved backdrop with their own dates and tones',()=>{
 const tiles=macro.macroTiles(doc);
 assert.deepEqual(tiles.map(t=>[t.key,t.value,t.tone]),[['liquidity','54','flat'],['yield','4.12%','flat'],['vix','17.6','up'],['fng','27','down']]);
 assert.equal(tiles[0].note,'mixed · net liquidity $5.85T · -120B vs 65 sessions ago');
 assert.equal(tiles[1].note,'+9 bp over 20 sessions');
 assert.equal(tiles[2].note,'VIX / VIX3M 0.92 · below 1, front month cheaper');
 assert.equal(tiles[3].note,'Fear · prev 31');
 const strip=macro.macroStrip(doc);
 assert.equal(strip.querySelectorAll('.today-macro-tile').length,4);
 assert.match(strip.querySelector('.today-macro-source').textContent,/through 2026-09-18/);
 assert.doesNotMatch(strip.textContent,/target|guarantee|floor|buy now/i);
});

test('stress, stale and missing readings are stated, never invented',()=>{
 const stressed={...doc,status:'stale',latest:{...doc.latest,regime:'adverse',metrics:{...doc.latest.metrics,vix:32,vix_3m:28,vix_term_ratio:1.1429}},fear_greed:null};
 const tiles=macro.macroTiles(stressed);
 assert.equal(tiles[0].tone,'down');assert.equal(tiles[2].tone,'down');assert.match(tiles[2].note,/above 1, front month dearer/);
 assert.equal(tiles[3].value,'—');assert.equal(tiles[3].note,'index unavailable');
 assert.match(macro.macroStrip(stressed).querySelector('.today-macro-source').textContent,/Over 36 hours old/);
 assert.match(macro.macroStrip({status:'unavailable',history:[]}).textContent,/Market backdrop unavailable/);
 const empty=macro.macroTiles({latest:{metrics:{}}});
 assert.deepEqual(empty.map(t=>t.value),['—','—','—','—']);assert.equal(empty[0].note,'no reading');
});
