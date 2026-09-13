import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<html data-lang="en"><body><main></main></body></html>',
  {url:'https://ducky.test/en/market-context-preview/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy)
  .filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));
document.body.append(strings);
const snapshot=JSON.parse(readFileSync('scripts/demo/recording/macro-beta.json'));
const {mountMarketContext}=await import('../public/js/app/market-context-preview.js');
const store=await import('../public/js/app/store.js');

test('actual chart preserves dated reconstruction, sources and losses without I/O or account writes',()=>{
  const root=document.querySelector('main'),before=JSON.stringify(snapshot),account=JSON.stringify(store.get());
  const prior=globalThis.fetch;let requests=0;
  globalThis.fetch=()=>{requests++;throw Error('static preview must not acquire data');};
  let writes=0;const unsubscribe=store.subscribe('*',()=>writes++);
  const storageBefore=JSON.stringify({...window.localStorage});
  try{
    const view=mountMarketContext(root,snapshot);
    assert.match(view.textContent,new RegExp(snapshot.as_of));
    assert.match(view.textContent,/2026-09-06 10:01 UTC/);
    assert.ok(view.textContent.includes(copy['app.macro.reconstruction']));
    assert.ok(view.textContent.includes(copy['app.macro.validation_result']));
    assert.ok(view.querySelector('.macro-losses').textContent.includes('2022'));
    for(const source of Object.values(snapshot.sources)){
      const link=[...view.querySelectorAll('a')].find(anchor=>anchor.href===source.url);
      assert.ok(link);assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);
    }
    const controls=()=>[...view.querySelectorAll('.macro-tabs button')];
    controls().find(button=>button.textContent===copy['app.macro.view_stocks']).click();
    assert.match(view.querySelector('.macro-readout').textContent,/QQQ/);
    const slider=view.querySelector('.macro-date-slider');
    slider.value=0;slider.dispatchEvent(new window.Event('input',{bubbles:true}));
    assert.match(slider.getAttribute('aria-valuetext'),/2026-03-05.*QQQ 100\.0.*SPY 100\.0/);
    controls().find(button=>button.textContent===copy['app.macro.view_yields']).click();
    assert.match(view.querySelector('.macro-readout').textContent,/%/);
    controls().find(button=>button.textContent===copy['app.macro.months'].replace('{n}','1')).click();
    assert.ok(Number(view.querySelector('.macro-date-slider').max)<snapshot.history.length-1);
    assert.equal(requests,0);assert.equal(writes,0);
    assert.equal(JSON.stringify(store.get()),account);assert.equal(JSON.stringify({...window.localStorage}),storageBefore);
    assert.equal(JSON.stringify(snapshot),before);
  }finally{unsubscribe();globalThis.fetch=prior;root.replaceChildren();}
});

test('missing reconstruction basis does not become a current or complete snapshot',()=>{
  const root=document.querySelector('main'),bad=structuredClone(snapshot);
  delete bad.coverage.point_in_time_vintages;
  assert.throws(()=>mountMarketContext(root,bad),/invalid_public_market_snapshot/);
  assert.equal(root.children.length,0);
});
