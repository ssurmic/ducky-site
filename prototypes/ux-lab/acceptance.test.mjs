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
 await t.test('watchlist exposes both perspectives and sortable metrics with missing values last',async()=>{
  await go('#/watchlist');await click(text('common.search'));
  const search=document.querySelector('dialog input');search.value='TSM';search.dispatchEvent(new Event('input',{bubbles:true}));
  await click(text('common.followStock').replace('{ticker}','TSM'));document.querySelector('dialog').close();
  await go('#/watchlist?view=metrics');const input=document.querySelector('.wl-filter-input');input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
  assert.ok(document.querySelector('.mx-table'));assert.match(document.querySelector('.mx-table').textContent,/左侧.*长线.*右侧.*趋势/);
  for(let i=0;i<2;i++){[...document.querySelectorAll('.mx-sort')].find(b=>b.textContent.startsWith(text('metrics.volatility'))).click();assert.match(document.querySelector('.mx-table tbody tr:last-child th').textContent,/TSM/);}
  document.querySelector('.mx-table-scroll').scrollLeft=500;const sortButton=document.querySelector('[data-watch-sort=ratio]');sortButton.focus();sortButton.click();
  assert.equal(document.querySelector('.mx-table-scroll').scrollLeft,500);assert.equal(document.activeElement.dataset.watchSort,'ratio');
  await go('#/stock/NVDA?tab=metrics');assert.match(document.querySelector('main').textContent,/0.89×/);
  assert.match(document.querySelector('main').textContent,/2026-10-16/);
  await click(text('metrics.help_label').replace('{metric}',text('metrics.volatility')));
  assert.ok(document.querySelector('dialog').textContent.includes(text('metrics.limit_volatility')));document.querySelector('dialog').close();
  await go('#/stock/TSM?tab=metrics');assert.doesNotMatch(document.querySelector('.mx-detail-grid').textContent,/0.00|NaN/);
 });
 await t.test('Today compares three separately normalized series with dated raw readings',async()=>{
  await go('#/today');assert.equal(document.querySelectorAll('.ux-macro-line').length,3);
  const range=document.querySelector('.ux-macro-range');
  range.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
  assert.match(range.getAttribute('aria-valuetext'),/2026-09-14.*54.*468.20.*560.84/);
  document.querySelector('[data-macro-primary="yield"]').click();
  const yieldRange=document.querySelector('.ux-macro-range');
  assert.match(yieldRange.getAttribute('aria-valuetext'),/2026-09-14.*4.22%.*468.20/);
  yieldRange.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
  assert.match(yieldRange.getAttribute('aria-valuetext'),/2026-09-25.*4.12%.*490.80.*574.42/);
  await click(text('macro.help_title'));assert.ok(document.querySelector('dialog').textContent.includes(text('macro.help_normalize')));document.querySelector('dialog').close();
  const {normalizedSeries,MACRO_ROWS,fundingBand}=await import('./views/macro.js');
  for(const series of normalizedSeries(MACRO_ROWS)){assert.equal(Math.min(...series.values),0);assert.equal(Math.max(...series.values),100);}
  assert.deepEqual([39,40,59,60,null].map(fundingBand),['tight','mixed','mixed','loose','unknown']);
 });
 await t.test('activity filters link a source record back to the same stock',async()=>{
  await go('#/explore?view=activity');assert.equal(document.querySelectorAll('.ac-record').length,6);
  await click(text('activity.category_holdings'));assert.equal(document.querySelectorAll('.ac-record').length,1);
  assert.match(document.querySelector('.ac-record').textContent,/2026-06-30.*2026-08-14/);
  await click(text('activity.open_record'));assert.ok(document.querySelector('dialog a[href="#/stock/MU"]'));
  assert.ok(document.querySelector('dialog').textContent.includes(text('activity.limit_holdings')));document.querySelector('dialog').close();
  await go('#/explore?view=activity&kind=all&ticker=NVDA');assert.equal(document.querySelectorAll('.ac-record').length,2);
  await click(text('activity.clear_stock'));const search=document.querySelector('.ac-search input');search.value='ORCL';search.dispatchEvent(new Event('input',{bubbles:true}));
  assert.equal(document.querySelectorAll('.ac-record').length,1);assert.ok(document.querySelector('.ac-record').textContent.includes(text('activity.unknown_date')));
  await click(text('activity.open_record'));await click(text('activity.follow'));
  assert.equal(document.querySelector('.ac-search input').value,'ORCL');assert.equal(document.querySelectorAll('.ac-record').length,1);
  assert.equal(document.activeElement.className,'ac-title');
  await go('#/watchlist?view=list');assert.ok([...document.querySelectorAll('a')].some(a=>a.getAttribute('href')==='#/explore?view=activity&ticker=NVDA'),[...document.querySelectorAll('.ac-row-link')].map(a=>a.outerHTML).join('\n'));
 });
 await t.test('Explore compares unwatched stocks and returns to the same research context',async()=>{
  const scenario=document.querySelector('select[aria-label="'+text('common.experience')+'"]');scenario.value='new';scenario.dispatchEvent(new Event('change',{bubbles:true}));
  await go('#/explore?view=metrics');
  assert.equal(document.querySelectorAll('.mx-table tbody tr').length,9);
  assert.deepEqual(JSON.parse(localStorage.getItem('ducky.ux-lab.20260928')).watchlist,[]);
  const input=document.querySelector('.explore-search input');input.value='NVDA';input.dispatchEvent(new Event('input',{bubbles:true}));
  assert.equal(document.querySelectorAll('.mx-table tbody tr').length,1);
  document.querySelector('.mx-table tbody .mx-cell-button').click();
  document.querySelector('dialog a[href*="focus=walls"]').click();await tick();
  assert.ok(document.querySelector('.mx-stock-panel'));
  assert.equal(document.querySelector('.st-breadcrumb a').getAttribute('href'),'#/explore?view=metrics');
  assert.equal(document.querySelector('.primary-nav a.active').getAttribute('href'),'#/explore');
  document.querySelector('.st-breadcrumb a').click();await tick();
  assert.equal(document.querySelector('.explore-search input').value,'NVDA');
  assert.ok(document.querySelector('.mx-table'));
  await click(text('explore.view_summary'));
  document.querySelector('.explore-stock-routes a').click();await tick();
  assert.ok(document.querySelector('.st-quick-take'),'explicit overview must not restore the last metric tab');
 });
 await t.test('a shared creator source and bookmark retain identity across stock and creator pages',async()=>{
  await go('#/stock/NVDA?tab=evidence');document.querySelector('[data-evidence-id=support]').click();
  const original=document.querySelector('dialog blockquote').textContent;
  assert.ok(document.querySelector('dialog').textContent.includes(text('creators.author.demo-lin.name')));
  await click(text('stock.save_example'));
  assert.ok(JSON.parse(localStorage.getItem('ducky.ux-lab.20260928')).saved.includes('view:nvda-delivery'));
  document.querySelector('dialog a[href*="view=nvda-delivery"]').click();await tick();
  assert.equal(document.querySelector('dialog blockquote').textContent,original);
  assert.match(window.location.hash,/view=nvda-delivery/);
  await click(text('creators.open_stock').replace('{ticker}','NVDA'));
  assert.match(document.querySelector('.st-breadcrumb a').getAttribute('href'),/view=nvda-delivery/);
  document.querySelector('.st-breadcrumb a').click();await tick();
  assert.equal(document.querySelector('dialog blockquote').textContent,original);
  document.querySelector('dialog').close();[...document.querySelectorAll('.creators-lab-tabs button')].find(b=>b.textContent.startsWith(text('creators.tab.saved'))).click();await tick();
  assert.ok(document.querySelector('[data-view-id=nvda-delivery]'));
  await go('#/creators?ticker=ORCL&tab=views');
  [...document.querySelectorAll('.creators-lab-tabs button')].find(b=>b.textContent.startsWith(text('creators.tab.saved'))).click();await tick();
  assert.ok(document.querySelector('[data-view-id=nvda-delivery]'),'Saved clears an unrelated ticker filter');
 });
 await t.test('upper and lower levels create correct conditions and plan edits retain the chosen direction',async()=>{
  await go('#/stock/NVDA?tab=metrics');
  await click(text('metrics.plan_above').replace('{price}','$230.00'));
  assert.equal(document.querySelector('dialog select[aria-label="'+text('alert.when')+'"]').value,'above');
  document.querySelector('dialog form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await tick();
  await go('#/alerts');await click(text('common.edit'));
  assert.equal(document.querySelector('dialog select[aria-label="'+text('alert.when')+'"]').value,'above');document.querySelector('dialog').close();
  document.querySelector('.alert-row a').click();await tick();
  assert.equal(document.querySelector('.st-breadcrumb a').getAttribute('href'),'#/alerts');
  await go('#/stock/NVDA?tab=metrics');await click(text('metrics.plan_below').replace('{price}','$215.00'));
  assert.equal(document.querySelector('dialog select[aria-label="'+text('alert.when')+'"]').value,'below');document.querySelector('dialog').close();
 });
 await t.test('ticker-scoped activity clears an unrelated old search and exposes public metric research',async()=>{
  await go('#/explore?view=activity');const input=document.querySelector('.ac-search input');input.value='ORCL';input.dispatchEvent(new Event('input',{bubbles:true}));
  await go('#/stock/NVDA?tab=overview');document.querySelector('.st-related-links a[href*="view=activity"]').click();await tick();
  assert.equal(document.querySelector('.ac-search input').value,'');
  assert.equal(document.querySelectorAll('.ac-record').length,2);
  assert.ok(document.querySelector('.ac-related a[href="#/stock/NVDA?tab=metrics"]'));
  await click(text('activity.clear_stock'));
  assert.ok(document.querySelector('.ac-related a[href="#/explore?view=metrics"]'));
 });
 await t.test('Today retains the opened comparison, series and date across a research round trip',async()=>{
  await go('#/today');assert.equal(document.querySelector('.today-macro-toggle').getAttribute('aria-expanded'),'false');
  document.querySelector('.today-macro-toggle').click();document.querySelector('[data-macro-primary=yield]').click();
  document.querySelector('.ux-macro-range').dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
  await go('#/explore');await go('#/today');
  assert.equal(document.querySelector('.today-macro-toggle').getAttribute('aria-expanded'),'true');
  assert.match(document.querySelector('.ux-macro-range').getAttribute('aria-valuetext'),/2026-09-14.*4.22%/);
 });
 await t.test('every core page renders in both languages with no unresolved copy or null values',async()=>{
  for(const lang of ['zh','en']){
   if(document.documentElement.lang!==lang){const langButton=document.querySelector('.lang-btn');langButton.click();await tick();}
   for(const hash of ['#/today','#/watchlist','#/explore','#/explore?view=metrics','#/creators','#/calendar','#/stock/NVDA','#/stock/AAPL','#/stock/TSM','#/stock/NVDA?tab=metrics','#/stock/TSM?tab=metrics','#/watchlist?view=metrics','#/explore?view=activity','#/explore?view=activity&kind=holdings','#/alerts']){
    await go(hash);const main=document.querySelector('main');assert.ok(main.querySelector('h1'),'page heading '+hash);
    assert.doesNotMatch(main.textContent,/\b(?:undefined|null|NaN)\b/,hash);
    assert.doesNotMatch(main.textContent,/\b(?:watch|stock|calendar|today|explore|creators|metrics|macro|activity)\.[a-z_]+/,hash);
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
