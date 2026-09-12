import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/#/watchlist'});
for(const key of ['window','document','Node','location','history','localStorage','CustomEvent','Event'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const {reading}=await import('../public/js/app/stock-reading.js');
const {closeModal}=await import('../public/js/app/ui.js');
const source=(id,stance,author,published,title)=>({id,kind:'creator',stance,title:{en:title,zh:title},published_at:published,
 evidence:[{kind:'creator',author,creator_id:author.toLowerCase(),post_id:'p'+id,source_url:'https://www.youtube.com/watch?v='+id,published_at:published,observed_at:'2026-09-12T01:00:00Z'}]});
const item={ticker:'NVDA',status:'ready',as_of:'2026-09-11T22:00:00Z',records:3,
 overview:{en:'Two creators see room; one warns on margins.',zh:'两位博主看到空间；一位提醒利润率。',citations:['a','c']},
 sources:[source('a','support','Alpha Ledger','2026-09-08','Data-center guidance implies capex still accelerating.'),
  source('b','context','Quiet Fund','2026-09-01','Mentioned NVDA without a direction.'),
  source('c','counter','Meet Kevin','2026-09-10','Margins face pressure from the enterprise shift.')]};

test('cited records are listed under the sentence with stance, author, title, date and a Latest mark',()=>{
 const wrap=reading(item);document.body.append(wrap);
 assert.equal(wrap.querySelectorAll('.stock-one-sentence .brief-citation').length,2);
 const rows=[...wrap.querySelectorAll('.stock-citations .stock-citation')];
 assert.equal(rows.length,2);
 assert.deepEqual(rows.map(r=>r.querySelector('.stock-citation-n').textContent),['1','3']);
 assert.deepEqual(rows.map(r=>r.querySelector('.stock-citation-stance').textContent),['Bullish','Bearish']);
 assert.match(rows[0].textContent,/Alpha Ledger/);assert.match(rows[0].textContent,/2026-09-08/);
 assert.match(rows[1].textContent,/Meet Kevin/);assert.match(rows[1].textContent,/Margins face pressure/);
 assert.equal(rows[0].querySelector('.stock-citation-latest'),null);
 assert.equal(rows[1].querySelector('.stock-citation-latest').textContent,'Latest');
 rows[1].click();assert.match(document.querySelector('.modal-body').textContent,/Meet Kevin/);closeModal();
 wrap.remove();
});

test('a single citation gets no Latest mark and non-cited sources stay out of the list',()=>{
 const wrap=reading({...item,overview:{...item.overview,citations:['a']}});
 assert.equal(wrap.querySelectorAll('.stock-citation').length,1);
 assert.equal(wrap.querySelector('.stock-citation-latest'),null);
 assert.doesNotMatch(wrap.textContent,/Quiet Fund/);
 assert.equal(reading({...item,overview:{...item.overview,citations:[]}}).querySelector('.stock-citations'),null);
});
