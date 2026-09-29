import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {currentMacro} from './fixtures/today-current-data.js';
const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div></body></html>',{url:'https://ducky.test/en/app/'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {currentSession,sessionOverview,sessionMacro}=await import('../public/js/app/today-session.js');
const {macroStrip,mountMacroStrip}=await import('../public/js/app/today-macro.js');
const {canonicalReading}=await import('../public/js/app/today-market-readings.js');
const options={now:new Date('2026-09-29T15:41:00Z')};

test('current overview precedes the preserved close archive and uses its own canonical card values',()=>{
 const doc=currentMacro(),before=structuredClone(doc),box=macroStrip(doc,options);
 assert.equal(box.firstElementChild.className,'today-session');
 assert.equal(box.querySelector('.today-session-indices').children.length,4);
 assert.match(box.querySelector('[data-ticker=SPY] strong').textContent,/^0.00%$/);
 assert.equal(box.querySelector('[data-tile=yield] .today-macro-value').textContent,'5.29%');
 assert.equal(box.querySelector('[data-tile=vix] .today-macro-value').textContent,'16.7');
 assert.equal(box.querySelector('.today-digest-archive').open,false);
 assert.match(box.querySelector('.today-session-summary').textContent,/5.29%/);
 assert.match(box.querySelector('[data-tile=yield] .today-macro-recorded').textContent,/Quote time/);
 assert.deepEqual(doc,before);
});
test('same-day close stays in a dated expandable archive beside the current overview',()=>{
 const doc=currentMacro();doc.digest.session='2026-09-29';
 const box=macroStrip(doc,options);assert.equal(box.firstElementChild.className,'today-session');
 assert.equal(box.querySelector('.today-digest-archive').open,false);
 assert.equal(box.querySelector('.today-digest-part p').textContent,doc.digest.close.en);
});
test('snapshot missing macro/CNN metrics cannot leak conflicting older values into the cards',()=>{
 const doc=currentMacro();doc.current_session.macro.metrics.nominal_10y=null;doc.current_session.fear_greed=null;doc.fear_greed={score:99};
 const box=macroStrip(doc,options);assert.equal(box.querySelector('[data-tile=yield] .today-macro-value').textContent,'—');
 assert.equal(box.querySelector('[data-tile=fng] .today-macro-value').textContent,'—');
 assert.equal(sessionMacro(doc,options).market_readings,doc.current_session.macro);
});
test('expired and prior-day snapshots retain source times but never say market open',()=>{
 const doc=currentMacro();for(const now of ['2026-09-29T15:46:00Z','2026-09-30T15:41:00Z']){
 const box=sessionOverview(doc,{now:new Date(now)});assert.match(box.querySelector('.today-session-phase').textContent,/Saved readings/);assert.match(box.textContent,/Awaiting newer readings/);assert.equal(box.querySelectorAll('.today-session-saved').length,19);
 }
});
test('partial quotes keep missing distinct from zero with all sources progressively disclosed',()=>{
 const doc=currentMacro();doc.current_session.quotes[1]={ticker:'QQQ',status:'missing'};doc.current_session.status='partial';
 const box=sessionOverview(doc,options);assert.equal(box.querySelector('[data-ticker=QQQ] strong').textContent,'—');
 assert.equal(box.querySelector('[data-ticker=SPY] strong').textContent,'0.00%');assert.equal(box.querySelector('details').open,false);
 assert.equal(box.querySelectorAll('.today-session-quote').length,19);assert.match(box.querySelector('details').textContent,/synthetic/);
});
for(const change of [{schema:'unknown'},{session:'2026-02-31'},{phase:'settled'},{sequence:-1},{published_at:'2026-09-30T15:40:00Z'},{expires_at:'bad'},{macro:null}])test('invalid snapshot is not presented as current '+JSON.stringify(change),()=>{
 const doc=currentMacro();Object.assign(doc.current_session,change);assert.equal(currentSession(doc,options),null);assert.equal(sessionMacro(doc,options),doc);
});
test('new trade-based reading requires valid ordered provider and acquisition clocks',()=>{
 const doc=sessionMacro(currentMacro(),options);assert.equal(canonicalReading(doc,'nominal_10y').value,5.29);
 const r=doc.market_readings.metrics.nominal_10y;r.quote_at='2026-09-29T20:00:00Z';assert.equal(canonicalReading(doc,'nominal_10y'),null);
});

const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
test('revoked data cannot reappear on a later pending or failed refresh',async t=>{
 const original=globalThis.fetch,host=document.createElement('div');document.querySelector('main').append(host);
 t.mock.timers.enable({apis:['Date','setTimeout'],now:options.now});
 let task,finish;
 try{
  globalThis.fetch=async()=>Response.json(currentMacro());task=mountMacroStrip(host);await task;
  assert.ok(host.querySelector('.today-session'));
  globalThis.fetch=async()=>Response.json({error:'forbidden'},{status:403});host.querySelector('.today-macro-refresh button').click();await flush();
  assert.equal(host.querySelector('.today-session'),null);
  globalThis.fetch=()=>new Promise(resolve=>{finish=resolve;});host.querySelector('.today-macro-refresh button').click();await flush();
  assert.equal(host.querySelector('.today-session'),null);
  finish(Response.json({error:'unavailable'},{status:503}));await flush();assert.equal(host.querySelector('.today-session'),null);
 }finally{task?.stop();host.remove();globalThis.fetch=original;t.mock.timers.reset();}
});
test('an older replicated sequence cannot replace a newer displayed snapshot, and expiry survives a failed read',async t=>{
 const original=globalThis.fetch,host=document.createElement('div');document.querySelector('main').append(host);
 t.mock.timers.enable({apis:['Date','setTimeout'],now:options.now});
 let task;
 try{
  globalThis.fetch=async()=>Response.json(currentMacro({sequence:4}));task=mountMacroStrip(host);await task;
  const old=currentMacro({sequence:3});old.current_session.summary.en='Regressed snapshot';
  globalThis.fetch=async()=>Response.json(old);host.querySelector('.today-macro-refresh button').click();await flush();
  assert.doesNotMatch(host.textContent,/Regressed snapshot/);
  const legacy=currentMacro();delete legacy.current_session;globalThis.fetch=async()=>Response.json(legacy);host.querySelector('.today-macro-refresh button').click();await flush();assert.ok(host.querySelector('.today-session'));assert.equal(host.querySelector('[data-tile=yield] .today-macro-value').textContent,'5.29%');
  globalThis.fetch=async()=>Response.json({error:'unavailable'},{status:503});
  t.mock.timers.tick(240000);await flush();assert.match(host.querySelector('.today-session-phase').textContent,/Saved readings/);
 }finally{task?.stop();host.remove();globalThis.fetch=original;t.mock.timers.reset();}
});
