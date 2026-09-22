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
 assert.deepEqual(tiles.map(t=>[t.key,t.value,t.tone]),[['liquidity','54','mid'],['yield','4.12%','flat'],['vix','17.6','up'],['fng','27','down']]);
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
 const stressed={...doc,status:'stale',latest:{...doc.latest,regime:'adverse',funding_score:31,metrics:{...doc.latest.metrics,vix:32,vix_3m:28,vix_term_ratio:1.1429}},fear_greed:null};
 const tiles=macro.macroTiles(stressed);
 assert.equal(tiles[0].tone,'down');assert.match(tiles[0].note,/^tight/);assert.equal(tiles[2].tone,'down');assert.match(tiles[2].note,/above 1, front month dearer/);
 assert.equal(tiles[3].value,'—');assert.equal(tiles[3].note,'index unavailable');
 assert.match(macro.macroStrip(stressed).querySelector('.today-macro-source').textContent,/Over 36 hours old/);
 assert.match(macro.macroStrip({status:'unavailable',history:[]}).textContent,/Market backdrop unavailable/);
 const empty=macro.macroTiles({latest:{metrics:{}}});
 assert.deepEqual(empty.map(t=>t.value),['—','—','—','—']);assert.equal(empty[0].note,'no reading');
});

test('the liquidity tile is coloured by its own score band and explains the formula behind a "?"',()=>{
 // 54 is mixed (amber), 62 loose (green), 31 tight (red): the word, the colour and the number agree.
 assert.deepEqual([54.4,62,31,null].map(macro.fundingBand),['mixed','supportive','adverse','unknown']);
 const loose=macro.macroTiles({...doc,latest:{...doc.latest,regime:'mixed',funding_score:62.5,beta_score:56.94}})[0];
 assert.equal(loose.tone,'up');assert.match(loose.note,/^loose/);
 const strip=macro.macroStrip(doc),help=strip.querySelector('[data-tile=liquidity] .today-macro-help');
 assert.ok(help);assert.equal(help.textContent,'?');
 help.click();
 const text=document.getElementById('modal').textContent;
 for(const phrase of ['SOFR minus IORB','2.5 points','Standing repo','Net liquidity','60 and above','60% this score'])assert.ok(text.includes(phrase),phrase);
 assert.doesNotMatch(text,/target|guarantee|floor|buy now/i);
 document.getElementById('modal').replaceChildren();
});

test('the Fear & Greed and liquidity tiles are half-dials in the provider bands, with the earlier readings listed',async()=>{
 const {gauge,angle,bandFor}=await import('../public/js/app/today-gauge.js');
 const withHistory={...doc,fear_greed:{score:34,rating:'fear',previous_close:29.11,previous_1_week:31,previous_1_month:54.66,previous_1_year:66.23}};
 const strip=macro.macroStrip(withHistory),fng=strip.querySelector('[data-tile=fng]'),liq=strip.querySelector('[data-tile=liquidity]');
 // Five CNN bands, the "fear" one lit, the needle at 34 (0 is the left end, 100 the right), the number inside.
 const bands=[...fng.querySelectorAll('.today-gauge-band')];
 assert.equal(bands.length,5);assert.deepEqual(bands.map(b=>b.classList.contains('is-active')),[false,true,false,false,false]);
 assert.equal(fng.querySelector('.today-gauge-value').textContent,'34');assert.equal(fng.querySelector('.today-gauge-word').textContent,'Fear');
 assert.equal(angle(34),180-34*1.8);assert.equal(fng.querySelector('.today-gauge').getAttribute('aria-label'),'Fear & Greed gauge, 34 of 100, Fear');
 assert.deepEqual([...fng.querySelectorAll('.today-macro-history li')].map(li=>li.textContent),['Previous closeFear29','1 week agoFear31','1 month agoNeutral55','1 year agoGreed66']);
 assert.deepEqual([...fng.querySelectorAll('.today-macro-history-value')].map(n=>n.className.replace('today-macro-history-value mono ','')),['is-sell','is-sell','is-flat','is-up']);
 // Three liquidity bands (tight / mixed / loose) from the same 40 and 60 cut-offs as the tile colour.
 const liqBands=[...liq.querySelectorAll('.today-gauge-band')];
 assert.deepEqual(liqBands.map(b=>b.getAttribute('class').replace('today-gauge-band ','')),['is-down','is-mid is-active','is-up']);
 assert.equal(liq.querySelector('.today-gauge-word').textContent,'mixed');assert.equal(liq.querySelector('.today-macro-history'),null);
 // No reading, no dial: the plain dash stays.
 const empty=macro.macroStrip({...doc,fear_greed:null});
 assert.equal(empty.querySelector('[data-tile=fng] .today-gauge'),null);assert.equal(empty.querySelector('[data-tile=fng] .today-macro-value').textContent,'—');
 assert.equal(bandFor(macro.FNG_BANDS(),100).label,'Extreme greed');assert.equal(bandFor(macro.FNG_BANDS(),null),null);
 assert.deepEqual(gauge({name:'x',score:null,bands:macro.LIQUIDITY_BANDS()}).querySelectorAll('.today-gauge-needle').length,0);
 const zhCopy=JSON.parse(readFileSync('i18n/zh.json'));
 for(const key of ['app.today.gauge_label','app.today.fng_prev_close','app.today.fng_week','app.today.fng_month','app.today.fng_year'])assert.ok(zhCopy[key],key);
});
