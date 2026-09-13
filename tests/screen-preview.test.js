import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<html data-lang="en"><body><main></main></body></html>',
  {url:'https://ducky.test/en/screener-preview/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy)
  .filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));
document.body.append(strings);
const {mountScreenPreview}=await import('../public/js/app/screen-preview.js');
const store=await import('../public/js/app/store.js');
const submit=root=>root.querySelector('.screen-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));

test('current editor changes conditions without acquiring facets, queries, saved rules or account writes',async()=>{
  // Existing sign-in must never activate account code in this standalone preview.
  store.set('token','existing-test-token');store.set('me',{tier:'pro'});
  const root=document.querySelector('main'),account=JSON.stringify(store.get());
  const storage=JSON.stringify({...window.localStorage}),prior=globalThis.fetch;let requests=0,writes=0;
  globalThis.fetch=()=>{requests++;throw Error('local conditions must not query');};
  const unsubscribe=store.subscribe('*',()=>writes++),dispose=mountScreenPreview(root);
  try{
    assert.equal(root.querySelector('details').open,true);
    assert.equal(root.querySelector('[name=oversold]').checked,true);
    assert.equal(root.querySelector('[name=event_insider]').checked,true);
    assert.equal(root.querySelector('.screen-save'),null);
    assert.equal(root.querySelector('.screen-results'),null);
    assert.equal(root.querySelector('[name=screen_notify]'),null);
    assert.equal(root.querySelector('select[aria-label="'+copy['app.screen.saved']+'"]'),null);
    const institutional=[...root.querySelectorAll('.screen-presets button')].find(button=>button.textContent===copy['app.screen.preset_institution']);
    institutional.click();
    assert.equal(root.querySelector('[name=cap_min]').value,'2');
    assert.equal(root.querySelector('[name=sector]').value,'Technology');
    root.querySelector('[name=rsi_max]').value='28';
    root.querySelector('[name=rsi_max]').dispatchEvent(new window.Event('input',{bubbles:true}));
    submit(root);
    assert.ok(root.querySelector('.screen-status').textContent.startsWith(copy['app.preview.screen_conditions']));
    assert.match(root.querySelector('.screen-status').textContent,/RSI ≤ 28/);
    assert.match(root.querySelector('.screen-status').textContent,/\$2B/);
    root.dispatchEvent(new window.Event('ducky:screens-changed'));
    [...root.querySelectorAll('.screen-actions button')].find(button=>button.textContent===copy['app.radar.reset']).click();
    assert.equal(root.querySelector('[name=rsi_max]').value,'');
    assert.equal(root.querySelector('[name=event_stake]').checked,false);
    assert.equal(root.querySelector('.screen-status').textContent,'');
    submit(root);
    await Promise.resolve();
    assert.ok(root.querySelector('.screen-status').textContent.includes(copy['app.screen.no_conditions']));
    assert.equal(requests,0);assert.equal(writes,0);
    assert.equal(JSON.stringify(store.get()),account);assert.equal(JSON.stringify({...window.localStorage}),storage);
  }finally{dispose();unsubscribe();globalThis.fetch=prior;root.replaceChildren();store.set('token',null);store.set('me',null);}
});

test('local review retains the application validity checks instead of accepting impossible ranges',()=>{
  const root=document.querySelector('main'),dispose=mountScreenPreview(root);
  try{
    root.querySelector('[name=cap_min]').value='3';root.querySelector('[name=cap_max]').value='2';
    submit(root);
    assert.equal(root.querySelector('[name=cap_max]').validationMessage,copy['app.screen.cap_error']);
    assert.equal(root.querySelector('.screen-status').textContent,'');
    root.querySelector('[name=cap_max]').value='4';submit(root);
    assert.equal(root.querySelector('[name=cap_max]').validationMessage,'');
    assert.ok(root.querySelector('.screen-status').textContent.includes(copy['app.preview.screen_conditions']));
  }finally{dispose();root.replaceChildren();}
});
