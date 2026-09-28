import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM,VirtualConsole} from 'jsdom';

const zh=JSON.parse(await readFile(new URL('../../i18n/zh.json',import.meta.url),'utf8'));
const en=JSON.parse(await readFile(new URL('../../i18n/en.json',import.meta.url),'utf8'));
const errors=[],requests=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM('<!doctype html><html><body><div id="app"></div><div id="toast" role="status"></div></body></html>',{url:'http://127.0.0.1:8765/prototypes/ux-lab/#/today',pretendToBeVisual:true,virtualConsole:vc});
const {window}=dom;
for(const key of ['window','document','Node','HTMLElement','HTMLDialogElement','Event','MouseEvent','KeyboardEvent','localStorage','location','history'])globalThis[key]=key==='window'?window:window[key];
window.scrollTo=()=>{};
window.HTMLElement.prototype.scrollIntoView=()=>{};
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
globalThis.fetch=async url=>{requests.push(url);assert.match(String(url),/^\.\.\/\.\.\/i18n\/(zh|en)\.json$/,'prototype must not fetch production data');return {ok:true,json:async()=>String(url).includes('/en.')?en:zh};};
await import('./app.js');
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
const go=async hash=>{window.location.hash=hash;await tick();};
const findButton=(label,root=document)=>[...root.querySelectorAll('button')].find(b=>b.textContent.trim()===label||b.getAttribute('aria-label')===label);
const click=async label=>{const b=findButton(label);assert.ok(b,'button exists: '+label);b.click();await tick();return b;};
const text=k=>zh['ux.'+k];

await test('Integrated preview journeys',async t=>{
 await t.test('new user sees content without account or implicit follows',()=>{
  assert.ok(document.querySelector('main h1'));
  const saved=JSON.parse(localStorage.getItem('ducky.ux-lab.20260928'));
  assert.deepEqual(saved.watchlist,[]);
  assert.ok(document.querySelector('a[href="#/stock/NVDA"]'));
  assert.equal(document.querySelectorAll('.mobile-nav a').length,5);
 });
 await t.test('search, explicit follow, and shared watchlist',async()=>{
  await click(text('common.search'));
  const input=document.querySelector('dialog input');input.value='NVDA';input.dispatchEvent(new Event('input',{bubbles:true}));
  assert.equal(document.querySelectorAll('.search-result').length,1);
  await click(text('common.followStock').replace('{ticker}','NVDA'));
  assert.deepEqual(JSON.parse(localStorage.getItem('ducky.ux-lab.20260928')).watchlist,['NVDA']);
  document.querySelector('dialog').close();
  await go('#/watchlist');assert.match(document.querySelector('main').textContent,/NVDA/);
 });
 await t.test('stock reference can become a clearly local editable plan',async()=>{
  await go('#/stock/NVDA');assert.match(document.querySelector('main').textContent,/224.93/);
  await go('#/alerts');await click(text('alert.add'));
  const form=document.querySelector('dialog form');assert.ok(form);
  form.querySelector('input[type=number]').value='215';
  form.querySelector('textarea').value='Check demand before revisiting';
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await tick();
  const plans=JSON.parse(localStorage.getItem('ducky.ux-lab.20260928')).alerts;
  assert.equal(plans.length,1);assert.equal(plans[0].price,215);assert.equal(plans[0].status,'local');
  assert.match(document.querySelector('main').textContent,/215.00/);
  assert.ok(document.querySelector('main').textContent.includes(text('alert.localOnly')));
  await click(text('common.edit'));document.querySelector('dialog input[type=number]').value='218';
  document.querySelector('dialog form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.equal(JSON.parse(localStorage.getItem('ducky.ux-lab.20260928')).alerts[0].price,218);
 });
 await t.test('unavailable quotes do not invent a default plan price',async()=>{
  await go('#/alerts');await click(text('alert.add'));
  const selector=document.querySelector('dialog select[aria-label="'+text('alert.stock')+'"]');
  selector.value='TSM';selector.dispatchEvent(new Event('change',{bubbles:true}));await tick();
  const price=document.querySelector('dialog input[type=number]');assert.equal(price.value,'');assert.equal(price.required,true);
  document.querySelector('dialog').close();
 });
 await t.test('watchlist search and overview survive a stock round trip',async()=>{
  await go('#/watchlist');
  const input=document.querySelector('.wl-filter-input');input.value='NVD';input.dispatchEvent(new Event('input',{bubbles:true}));
  await click(text('watch.view_overview'));
  await go('#/stock/NVDA');await go('#/watchlist');
  assert.equal(document.querySelector('.wl-filter-input').value,'NVD');
  assert.equal(findButton(text('watch.view_overview')).getAttribute('aria-pressed'),'true');
 });
 await t.test('a stock calendar link retains its related event context',async()=>{
  await go('#/calendar?ticker=MU');
  assert.ok(document.querySelector('main a[href="#/stock/MU"]'));
  assert.ok(document.querySelector('main').textContent.includes(text('calendar.clear_scope')));
  assert.ok([...document.querySelectorAll('button[aria-pressed=true]')].some(b=>b.getAttribute('aria-label')?.includes('9月30日')));
 });
 await t.test('source bookmarks can be found on return and removed',async()=>{
  await go('#/stock/NVDA?tab=evidence');document.querySelector('.st-map-node').click();
  const toggle=document.querySelector('.st-save-toggle');assert.equal(toggle.getAttribute('aria-pressed'),'false');toggle.click();assert.equal(toggle.getAttribute('aria-pressed'),'true');
  document.querySelector('dialog').close();await go('#/today');await go('#/stock/NVDA?tab=evidence');
  assert.ok([...document.querySelectorAll('[data-saved-marker]')].some(marker=>!marker.hidden));
  document.querySelector('.st-map-node').click();document.querySelector('.st-save-toggle').click();
  assert.equal(document.querySelector('.st-save-toggle').getAttribute('aria-pressed'),'false');document.querySelector('dialog').close();
 });
 await t.test('every core page renders in both languages with no unresolved copy or null values',async()=>{
  for(const lang of ['zh','en']){
   if(document.documentElement.lang!==lang){const langButton=document.querySelector('.lang-btn');langButton.click();await tick();}
   for(const hash of ['#/today','#/watchlist','#/explore','#/creators','#/calendar','#/stock/NVDA','#/stock/AAPL','#/stock/TSM','#/alerts']){
    await go(hash);const main=document.querySelector('main');assert.ok(main.querySelector('h1'),'page heading '+hash);
    assert.doesNotMatch(main.textContent,/\b(?:undefined|null|NaN)\b/,hash);
    assert.doesNotMatch(main.textContent,/\b(?:watch|stock|calendar|today|explore|creators)\.[a-z_]+/,hash);
    if(lang==='en')assert.doesNotMatch(main.textContent,/[\u3400-\u9fff]/,hash+' English');
   }
  }
 });
 await t.test('loading and retained-content errors have working exits',async()=>{
  const select=document.querySelector('.state-selector');select.value='error';select.dispatchEvent(new Event('change',{bubbles:true}));
  assert.ok(document.querySelector('.notice-bar'));
  assert.ok(document.querySelector('#route-view h1'));
  document.querySelector('.notice-bar button').click();assert.equal(document.querySelector('.notice-bar'),null);
  const loading=document.querySelector('.state-selector');loading.value='loading';loading.dispatchEvent(new Event('change',{bubbles:true}));
  assert.ok(document.querySelector('[aria-busy=true]'));
  document.querySelector('[aria-busy=true] button').click();assert.ok(document.querySelector('#route-view h1'));
 });
 await t.test('prototype state never writes auth or real watchlist storage',()=>{
  assert.deepEqual(Object.keys(localStorage),['ducky.ux-lab.20260928']);
  assert.deepEqual(errors,[]);
  assert.ok(requests.length>0);assert.ok(requests.every(x=>String(x).includes('/i18n/')));
 });
});
window.close();
