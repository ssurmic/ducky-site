import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/'});
for(const k of ['window','document','Node']) globalThis[k]=dom.window[k];
const strings=document.createElement('script');strings.id='ducky-strings';
const copy=JSON.parse(readFileSync('i18n/en.json'));
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const {companyContext}=await import('../public/js/app/company-context.js');

test('buyers and sellers are distinct, with business references separate from returns',()=>{
 const box=companyContext({ticker:'CRWV',company:'CoreWeave',status:'reviewed',label_en:'GPU cloud',
   peers:['NBIS'],related:['NVDA','ETN'],comparison_enabled:false,
   flow:{buy_en:'GPUs and electricity',sell_en:'Cloud compute services'},
   sources:[{title:'10-K',url:'https://www.sec.gov/example'},{title:'bad',url:'javascript:alert(1)'}]});
 assert.match(box.textContent,/Purchases \/ capital investment/);
 assert.match(box.textContent,/Sales \/ revenue sources/);
 assert.match(box.textContent,/Business references/);
 assert.equal(box.querySelectorAll('.company-flow > div').length,2);
 assert.equal(box.querySelectorAll('.company-source').length,1);
 assert.match(box.querySelector('a[href="#/chart/NBIS"]').textContent,/NBIS/);
 assert.doesNotMatch(box.textContent,/percentage points/);
});

test('only the matching peer basket can display a relative return',()=>{
 const p={ticker:'VST',status:'reviewed',peers:['CEG','NRG','TLN'],related:['ETN'],sources:[]};
 assert.doesNotMatch(companyContext(p,{symbols:['AVGO'],excess20:21.5}).textContent,/21.5/);
 const box=companyContext(p,{scope:'business_peers',symbols:['CEG','NRG','TLN'],excess20:2.5,
   windows:{20:{start:'2026-08-07',end:'2026-09-04',peers:[{ticker:'CEG',return_pct:-2}]}}});
 assert.match(box.textContent,/2.5 percentage points/);
 assert.doesNotMatch(box.textContent,/2.5% percentage/);
 assert.match(box.textContent,/2026-08-07/);
 assert.match(box.textContent,/-2.0%/);
});

test('disabled, reclassified or mismatched comparisons cannot leak returns through details',()=>{
 const p={ticker:'VST',status:'reviewed',peers:['CEG','NRG','TLN'],version:'current'};
 const rs={scope:'business_peers',symbols:['CEG','NRG','TLN'],excess20:2.5,taxonomy_version:'current',
   windows:{20:{start:'2026-08-07',end:'2026-09-04',peers:[{ticker:'CEG',return_pct:-12.3}]}}};
 for(const [profile,comparison]of [
   [{...p,comparison_enabled:false},rs],
   [p,{...rs,scope:'thematic_reference'}],
   [p,{...rs,scope:undefined}],
   [p,{...rs,symbols:['AVGO']}],
   [p,{...rs,taxonomy_version:'old'}],
   [p,{...rs,status:'benchmark_changed'}]
 ]){
   const box=companyContext(profile,comparison);
   assert.doesNotMatch(box.textContent,/percentage points|2026-08-07|-12.3/);
   assert.ok(box.querySelector('a[href="#/chart/CEG"]'),'Business identity remains available');
 }
});
