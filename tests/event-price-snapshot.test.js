import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<main></main>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json')))
  .filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const {eventPriceSnapshot}=await import('../public/js/app/views/event-price-snapshot.js');

test('price snapshots preserve small gains and losses at recorded precision',()=>{
  for(const [ret,text,sign] of [[-0.0295,'-0.03%','neg'],[0.0295,'+0.03%','pos'],
    [-0.001,'-0.001%','neg'],[0.0001,'+0.0001%','pos'],[-0.0001,'-0.0001%','neg'],
    [-0.7813,'-0.8%','neg'],[0.3594,'+0.4%','pos']]) {
    const card=eventPriceSnapshot({since_publication:{status:'ready',ret},publication_20:{status:'ready',ret}},{showWindow:true});
    const latest=card.querySelector('.study-price-snapshot > div:last-child strong');
    const window=card.querySelector('.study-window strong');
    assert.equal(latest.textContent,text);assert.equal(window.textContent,text);
    assert.ok(latest.classList.contains(sign));assert.ok(window.classList.contains(sign));
  }
});

test('actual zero remains neutral and missing data remains unavailable',()=>{
  for(const ret of [0,-0]) {
    const card=eventPriceSnapshot({since_publication:{status:'ready',ret},publication_20:{status:'ready',ret}},{showWindow:true});
    for(const value of [card.querySelector('.study-price-snapshot > div:last-child strong'),card.querySelector('.study-window strong')]) {
      assert.equal(value.textContent,'0.0%');assert.ok(!value.matches('.pos,.neg'));
    }
  }
  const card=eventPriceSnapshot({since_publication:{status:'missing_price'}});
  assert.equal(card.querySelector('div:last-child strong').textContent,'—');
});
