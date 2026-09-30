import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {dashboardMacro} from './fixtures/today-dashboard-data.js';
const dom=new JSDOM('<html data-lang="en"><body><main class="app-main"></main></body></html>',{url:'https://ducky.test/en/app/'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const {macroStrip,mountMacroStrip}=await import('../public/js/app/today-macro.js');
const now=new Date('2026-09-29T15:41:00Z');
const before=(a,b)=>!!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};

test('dashboard leads with ten readings and two actual three-line charts outside disclosures',()=>{
 const doc=dashboardMacro(),saved=structuredClone(doc),box=macroStrip(doc,{now});
 const indices=box.querySelector('.today-session-indices'),metrics=box.querySelector('.today-dashboard-metrics'),charts=box.querySelector('.today-dashboard-charts');
 assert.equal(indices.querySelectorAll('strong').length,4);assert.equal(metrics.querySelectorAll('.today-macro-value').length,6);
 assert.equal(metrics.querySelector('[data-tile=yield] strong').textContent,'5.25%');
 assert.equal(metrics.querySelector('[data-tile=liquidity] strong').textContent,'0/100');
 assert.equal(metrics.querySelector('.today-gauge'),null);
 assert.ok(before(indices,metrics));assert.ok(before(metrics,charts));assert.ok(before(charts,box.querySelector(':scope > .today-preview')));
 assert.equal(box.lastElementChild.className,'today-digest-archive');
 assert.equal(charts.querySelectorAll('[role=slider]').length,2);
 for(const chart of charts.querySelectorAll('.today-dashboard-chart')){
  assert.equal(chart.querySelectorAll('.today-lines-line').length,3);assert.equal(chart.querySelector('[role=slider]').closest('details'),null);
  assert.equal(chart.querySelector('.today-chart-method').open,false);assert.ok(chart.querySelector('.today-chart-date').textContent.includes('2026-09-29'));
 }
 assert.match(charts.querySelector('[data-chart=yield] .today-lines-key.is-yield').textContent,/5.25%/);
 assert.deepEqual(doc,saved);
});

test('full original text, exact source clocks, gauges and history remain in one shared disclosure',()=>{
 const doc=dashboardMacro(),box=macroStrip(doc,{now}),sources=box.querySelector('.today-session-details');
 assert.equal(sources.open,false);assert.equal(sources.querySelector('.today-session-summary').textContent,doc.current_session.summary.en);
 assert.equal(box.querySelectorAll('.today-session-summary').length,1);assert.equal(sources.querySelectorAll('.today-session-quote').length,15);
 assert.equal(sources.querySelectorAll('.today-gauge').length,2);assert.equal(sources.querySelectorAll('.today-macro-history li').length,4);
 assert.match(sources.querySelector('[data-source-metric=yield]').textContent,/Quote time 9\/29\/2026, 11:39 ET/);
 assert.match(box.querySelector('[data-tile=liquidity] .today-dashboard-metric-date').getAttribute('aria-label'),/Score dated 2026-09-25/);
 assert.match(box.querySelector('[data-tile=fng] .today-dashboard-metric-date').getAttribute('aria-label'),/9\/29\/2026, 11:40 ET/);
 assert.match(box.querySelector('.today-preview-impact').textContent,/could change.*depends on the result/);
 const keys=[...box.querySelectorAll('[data-reading-key]')].map(node=>node.dataset.readingKey);assert.equal(new Set(keys).size,keys.length);
});

test('unavailable metrics and insufficient charts keep explicit states instead of old values or fake lines',()=>{
 const doc=dashboardMacro();doc.current_session.macro.metrics.nominal_10y=null;doc.current_session.fear_greed=null;doc.observed=[];doc.history=[];
 const box=macroStrip(doc,{now:new Date('2026-09-29T15:46:00Z')});
 assert.match(box.querySelector('.today-session-phase').textContent,/Saved readings/);
 assert.equal(box.querySelector('[data-tile=yield] strong').textContent,'—');assert.equal(box.querySelector('[data-tile=fng] strong').textContent,'—');
 assert.equal(box.querySelector('[data-tile=liquidity] strong').textContent,'0/100');
 assert.equal(box.querySelectorAll('.today-dashboard-chart-missing').length,2);assert.equal(box.querySelectorAll('[role=slider]').length,0);
 assert.match(box.querySelector('.today-dashboard-chart-missing').textContent,/Not enough historical readings/);
});

test('current refresh preserves selected chart date, keyboard focus and open source/event/method disclosures',async t=>{
 const original=globalThis.fetch,host=document.createElement('div');document.querySelector('main').append(host);
 t.mock.timers.enable({apis:['Date','setTimeout'],now});let task;
 try{
  globalThis.fetch=async()=>Response.json(dashboardMacro());task=mountMacroStrip(host);await task;
  for(const selector of ['.today-session-details','.today-preview-basis','.today-chart-method'])host.querySelector(selector).open=true;
  const chart=host.querySelector('[data-chart=yield] [role=slider]');chart.focus();chart.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
  const selected=chart.readingDate();
  globalThis.fetch=async()=>Response.json(dashboardMacro({sequence:2}));host.querySelector('.today-macro-refresh button').click();await flush();
  const fresh=host.querySelector('[data-chart=yield] [role=slider]');assert.notEqual(fresh,chart);assert.equal(document.activeElement,fresh);assert.equal(fresh.readingDate(),selected);
  for(const selector of ['.today-session-details','.today-preview-basis','.today-chart-method'])assert.equal(host.querySelector(selector).open,true);
  assert.match(fresh.getAttribute('aria-valuetext'),/09\/28/);
  fresh.dispatchEvent(new window.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(fresh.readingDate(),'2026-09-29');
 }finally{task?.stop();host.remove();globalThis.fetch=original;t.mock.timers.reset();}
});

test('refresh after focusing event and refresh controls preserves both chart dates without stealing focus or revealing tooltips',async t=>{
 const original=globalThis.fetch,host=document.createElement('div');document.querySelector('main').append(host);
 t.mock.timers.enable({apis:['Date','setTimeout'],now});let task;
 try{
  globalThis.fetch=async()=>Response.json(dashboardMacro());task=mountMacroStrip(host);await task;
  const liquidity=host.querySelector('[data-chart=liquidity] [role=slider]'),yieldChart=host.querySelector('[data-chart=yield] [role=slider]');
  liquidity.focus();liquidity.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
  yieldChart.focus();yieldChart.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
  const dates={liquidity:liquidity.readingDate(),yield:yieldChart.readingDate()};assert.notEqual(dates.liquidity,dates.yield);
  const event=host.querySelector('.today-preview-basis');event.open=true;event.querySelector('summary').focus();
  assert.equal(yieldChart.readingDate(),dates.yield);assert.equal(host.querySelector('[data-chart=yield] .today-lines-tip').hidden,true);
  globalThis.fetch=async()=>Response.json(dashboardMacro({sequence:2}));
  const refresh=host.querySelector('.today-macro-refresh button');refresh.focus();refresh.click();await flush();
  assert.notEqual(document.activeElement?.getAttribute('role'),'slider');
  for(const key of ['liquidity','yield']){
   const chart=host.querySelector('[data-chart='+key+'] [role=slider]');assert.equal(chart.readingDate(),dates[key]);
   assert.equal(host.querySelector('[data-chart='+key+'] .today-lines-tip').hidden,true);
  }
  assert.equal(host.querySelector('.today-preview-basis').open,true);
  const restored=host.querySelector('[data-chart=yield] [role=slider]');restored.focus();
  assert.equal(restored.readingDate(),dates.yield);assert.equal(host.querySelector('[data-chart=yield] .today-lines-tip').hidden,false);
 }finally{task?.stop();host.remove();globalThis.fetch=original;t.mock.timers.reset();}
});

test('phone chart choice survives a failed read and a new revision with its date and selector focus intact',async t=>{
 const original=globalThis.fetch,host=document.createElement('div');document.querySelector('main').append(host);
 t.mock.timers.enable({apis:['Date','setTimeout'],now});let task;
 const choice=key=>host.querySelector('[data-chart-choice='+key+']');
 try{
  globalThis.fetch=async()=>Response.json(dashboardMacro());task=mountMacroStrip(host);await task;
  assert.equal(choice('liquidity').getAttribute('aria-pressed'),'true');
  choice('yield').focus();choice('yield').click();
  assert.equal(choice('liquidity').getAttribute('aria-pressed'),'false');assert.equal(choice('yield').getAttribute('aria-pressed'),'true');
  const chart=host.querySelector('[data-chart=yield] [role=slider]');chart.focus();
  chart.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));const date=chart.readingDate();
  choice('yield').focus();
  globalThis.fetch=async()=>Response.json({error:'temporarily_unavailable'},{status:503});
  host.querySelector('.today-macro-refresh button').click();await flush();
  assert.equal(host.querySelector('[data-chart=yield] [role=slider]'),chart);
  assert.equal(choice('yield').getAttribute('aria-pressed'),'true');assert.match(host.querySelector('.today-macro-refresh').textContent,/could not load/);
  globalThis.fetch=async()=>Response.json(dashboardMacro({sequence:2}));
  host.querySelector('.today-macro-refresh button').click();await flush();
  const updated=host.querySelector('[data-chart=yield] [role=slider]');assert.notEqual(updated,chart);
  assert.equal(updated.readingDate(),date);assert.equal(choice('yield').getAttribute('aria-pressed'),'true');
  assert.equal(host.querySelectorAll('.today-dashboard-chart.is-selected').length,1);
  assert.equal(host.querySelector('.today-dashboard-chart.is-selected').dataset.chart,'yield');
  assert.equal(document.activeElement,choice('yield'));assert.equal(host.querySelector('[data-chart=yield] .today-lines-tip').hidden,true);
  globalThis.fetch=async()=>Response.json({error:'forbidden'},{status:403});
  host.querySelector('.today-macro-refresh button').click();await flush();
  assert.equal(host.querySelector('.today-dashboard-trends'),null);assert.equal(host.querySelectorAll('[role=slider]').length,0);
 }finally{task?.stop();host.remove();globalThis.fetch=original;t.mock.timers.reset();}
});

test('legacy compact readings retain native details, full gauges/history and independent expanded state on refresh',async t=>{
 const original=globalThis.fetch,host=document.createElement('div');document.querySelector('main').append(host);
 t.mock.timers.enable({apis:['Date','setTimeout'],now});let task;
 const legacy=()=>{const doc=dashboardMacro();delete doc.current_session;doc.fear_greed={score:34,rating:'fear',previous_close:37,previous_1_week:31};return doc;};
 try{
  globalThis.fetch=async()=>Response.json(legacy());task=mountMacroStrip(host);await task;
  const folds=[...host.querySelectorAll('.today-macro-grid > details.today-macro-fold')];assert.equal(folds.length,6);
  for(const fold of folds){
   assert.equal(fold.open,false);const summary=fold.querySelector(':scope > summary');
   assert.ok(summary.querySelector('.today-macro-value'));assert.equal(summary.querySelector('button,a,[role=slider]'),null);
  }
  const yieldFold=host.querySelector('[data-tile=yield]'),fngFold=host.querySelector('[data-tile=fng]');yieldFold.open=true;fngFold.open=true;
  assert.equal(yieldFold.querySelectorAll('.today-lines-line').length,3);assert.ok(fngFold.querySelector('.today-gauge'));
  assert.equal(fngFold.querySelectorAll('.today-macro-history li').length,2);
  const summary=yieldFold.querySelector('summary');summary.focus();
  globalThis.fetch=async()=>Response.json({...legacy(),observed_at:'2026-09-29T15:42:00Z'});
  host.querySelector('.today-macro-refresh button').click();await flush();
  assert.equal(host.querySelector('[data-tile=yield]').open,true);assert.equal(host.querySelector('[data-tile=fng]').open,true);
  assert.equal(host.querySelector('[data-tile=liquidity]').open,false);assert.equal(host.querySelector('[data-tile=vix]').open,false);
  assert.equal(document.activeElement,host.querySelector('[data-tile=yield] > summary'));
  assert.equal(host.querySelector('[data-tile=yield] .today-lines-tip').hidden,true);
 }finally{task?.stop();host.remove();globalThis.fetch=original;t.mock.timers.reset();}
});

test('K reads the saved ratio with its formula and component clocks, never substitutes IV/HV',()=>{
 const doc=dashboardMacro(),box=macroStrip(doc,{now});
 assert.equal(box.querySelector('[data-tile=kindex] strong').textContent,'2.04');
 assert.match(box.querySelector('[data-tile=kindex]').textContent,/Fear & Greed ÷ VIX/);
 assert.match(box.querySelector('[data-source-metric=kindex]').textContent,/CNN 34.00.*VIX 16.70/);
 assert.match(box.querySelector('[data-source-metric=kindex]').textContent,/not IV\/HV/);
 const old=structuredClone(doc);delete old.current_session.k_index;
 old.k_index=doc.current_session.k_index;
 assert.equal(macroStrip(old,{now}).querySelector('[data-tile=kindex] strong').textContent,'—','old outer ratio cannot fill a new snapshot');
 for(const edit of [d=>d.current_session.k_index.components[0].value=99,d=>d.current_session.k_index.components[1].date='2026-09-28',d=>d.current_session.fear_greed=null]){
  const invalid=structuredClone(doc);edit(invalid);
  assert.equal(macroStrip(invalid,{now}).querySelector('[data-tile=kindex] strong').textContent,'—');
 }
 const mismatched=structuredClone(doc);Object.assign(mismatched.current_session.k_index,{status:'unavailable',reason:'session_mismatch',value:null});
 assert.match(macroStrip(mismatched,{now}).querySelector('[data-tile=kindex]').textContent,/Source dates differ/);
 const zero=structuredClone(doc);zero.current_session.fear_greed.score=0;zero.current_session.k_index.value=0;zero.current_session.k_index.components[0].value=0;
 assert.equal(macroStrip(zero,{now}).querySelector('[data-tile=kindex] strong').textContent,'0.00');
});

test('all six visible market labels open named help dialogs and return keyboard focus, including missing K',()=>{
 const doc=dashboardMacro();delete doc.current_session.k_index;
 const box=macroStrip(doc,{now});document.querySelector('main').append(box);
 const phrases={liquidity:'SOFR minus IORB',yield:'100 bp',vix:'annualized',fng:'seven equally weighted',kindex:'not IV/HV',term:'18 ÷ 20'};
 try{
  assert.equal(box.querySelectorAll('.today-metric-heading button').length,6);
  assert.equal(box.querySelector('[data-tile=kindex] strong').textContent,'—');
  for(const [key,phrase] of Object.entries(phrases)){
   const button=box.querySelector('[data-tile='+key+'] .today-macro-help');
   assert.equal(button.getAttribute('aria-haspopup'),'dialog');assert.ok(button.getAttribute('aria-label').length>5);
   button.focus();button.click();const dialog=document.querySelector('[role=dialog]');
   assert.ok(dialog.textContent.includes(phrase),key);assert.equal(dialog.getAttribute('aria-modal'),'true');
   assert.equal(document.activeElement,dialog.querySelector('.modal-close'));
   document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   assert.equal(document.querySelector('[role=dialog]'),null);assert.equal(document.activeElement,button);
  }
 }finally{box.remove();}
});
