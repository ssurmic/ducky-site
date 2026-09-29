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
function sameDayPreview(){
 const doc=currentMacro(),digest=doc.digest;
 digest.session='2026-09-29';digest.next_session='2026-09-30';digest.generated_at='2026-09-29T15:40:00Z';
 Object.assign(digest.preview,{anchor_session:digest.session,calendar_day:'2026-09-30',next_session:'2026-09-30',observed_at:'2026-09-29T15:39:00Z'});
 for(const event of digest.preview.events)event.date=event.date==='2026-09-28'?'2026-09-29':'2026-09-30';
 return doc;
}
test('same-day structured preview stays visible once while complete close prose remains archived',()=>{
 const doc=sameDayPreview();doc.digest.edition='daily_close';
 const before=structuredClone(doc),box=macroStrip(doc,options),archive=box.querySelector('.today-digest-archive'),preview=box.querySelector('.today-preview');
 assert.equal(archive.open,false);assert.equal(preview.parentElement,box);assert.equal(archive.querySelector('.today-preview'),null);
 assert.equal(box.querySelectorAll('.today-preview').length,1);assert.equal(preview.querySelectorAll('.today-preview-event').length,doc.digest.preview.events.length);
 assert.equal(preview.nextElementSibling.className,'today-macro-grid');
 assert.equal(archive.querySelector('.today-digest-tomorrow p').textContent,doc.digest.tomorrow.en);
 for(const key of ['close','sectors','macro'])assert.ok(archive.textContent.includes(doc.digest[key].en));
 const keys=[...box.querySelectorAll('[data-reading-key]')].map(node=>node.dataset.readingKey);assert.equal(new Set(keys).size,keys.length);
 assert.equal(preview.querySelector('.today-preview-calendar').getAttribute('href'),'#/calendar?date=2026-09-30');
 assert.match(preview.querySelector('.today-preview-clock').textContent,/9\/29.*11:39/);
 assert.deepEqual(doc,before);
});
test('a prior-session preview stays in its original archive with a separate dated Calendar entry',()=>{
 const doc=currentMacro(),box=macroStrip(doc,options),archive=box.querySelector('.today-digest-archive');
 assert.ok(archive.querySelector('.today-preview'));assert.equal(box.querySelectorAll('.today-preview').length,1);
 assert.equal(box.querySelector(':scope > .today-preview'),null);
 const link=box.querySelector(':scope > .today-preview-calendar');assert.equal(link.getAttribute('href'),'#/calendar?date=2026-09-29');assert.match(link.textContent,/2026-09-29/);
 assert.equal(archive.querySelector('.today-preview-window').textContent.includes('2026-09-29'),true);
});
test('quote expiry keeps a same-day dated preview visible; New York date rollover archives it',()=>{
 const doc=sameDayPreview(),expired=macroStrip(doc,{now:new Date('2026-09-29T15:46:00Z')});
 assert.match(expired.querySelector('.today-session-phase').textContent,/Saved readings/);assert.ok(expired.querySelector(':scope > .today-preview'));
 const tomorrow=macroStrip(doc,{now:new Date('2026-09-30T04:01:00Z')});
 assert.equal(tomorrow.querySelector(':scope > .today-preview'),null);assert.ok(tomorrow.querySelector('.today-digest-archive .today-preview'));
 assert.equal(tomorrow.querySelector(':scope > .today-preview-calendar').getAttribute('href'),'#/calendar?date=2026-09-30');
});
test('mismatched or incomplete preview never creates a current event list and retains original prose',()=>{
 for(const preview of [null,{anchor_session:'2026-09-28'},{anchor_session:'2026-09-29',calendar_day:'2026-09-30',next_session:'2026-09-30',events:null}]){
  const doc=sameDayPreview();doc.digest.preview=preview;const box=macroStrip(doc,options);
  assert.equal(box.querySelector('.today-preview'),null);assert.ok(box.querySelector(':scope > .today-preview-calendar'));
  assert.equal(box.querySelector('.today-digest-tomorrow p').textContent,doc.digest.tomorrow.en);
 }
});
test('without a current overview the same-day preview retains its existing close presentation',()=>{
 const doc=sameDayPreview();delete doc.current_session;const box=macroStrip(doc,options);
 assert.equal(box.querySelector('.today-digest-archive'),null);assert.ok(box.querySelector('.today-digest .today-preview'));
 assert.equal(box.querySelector(':scope > .today-preview-calendar'),null);
});
test('synthetic current summary includes the complete dated producer shape, including older funding',()=>{
 const doc=currentMacro({at:'2026-09-30T01:00:00Z'}),summary=doc.current_session.summary;
 assert.equal(doc.current_session.session,'2026-09-29');assert.match(summary.en,/SMH \+1.20%; XLK -0.45%/);
 assert.match(summary.en,/10Y yield 5.29% \(2026-09-29\); VIX 16.7 \(2026-09-29\); USD liquidity 0\/100 \(2026-09-25\)/);
 assert.match(summary.zh,/美元流动性 0\/100（2026-09-25）/);
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
test('post-session overview visibly distinguishes trade snapshots from separate daily chart records',()=>{
 for(const phase of ['pre','open','post','closed']){
  const box=sessionOverview(currentMacro({phase,at:'2026-09-29T20:40:00Z'}),{now:new Date('2026-09-29T20:41:00Z')}),note=box.querySelector('.today-session-post-basis');
  if(phase==='post'){
   assert.match(note.textContent,/Trade snapshot, not final daily bars/);assert.match(note.textContent,/Historical charts use separate daily records/);
   assert.equal(note.closest('details'),null);
  }else assert.equal(note,null);
 }
});
test('post-session fixture retains regular-session quote times and counts them separately from current quotes',()=>{
 for(const at of ['2026-09-29T20:40:00Z','2026-12-01T22:00:00Z']){
  const doc=currentMacro({phase:'post',at}),{quotes,coverage}=doc.current_session;
  assert.equal(coverage.current,0);assert.equal(coverage.session_quote,19);
  assert.ok(quotes.every(row=>row.status==='session_quote'&&Date.parse(row.quote_at)<=Date.parse(row.recorded_at)));
  assert.match(quotes[0].quote_at,at.startsWith('2026-09')?/T19:59:00/:/T20:59:00/);
  const box=sessionOverview(doc,{now:new Date(at)});assert.equal(box.querySelectorAll('.today-session-saved').length,19);
  assert.match(box.querySelector('.today-session-clock').textContent,/15:59 ET/);
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
test('moved event details and focus survive a newer current snapshot refresh without duplicate keys',async t=>{
 const original=globalThis.fetch,host=document.createElement('div');document.querySelector('main').append(host);
 t.mock.timers.enable({apis:['Date','setTimeout'],now:options.now});let task,finish;
 try{
  globalThis.fetch=async()=>Response.json(sameDayPreview());task=mountMacroStrip(host);await task;
  const details=host.querySelector('.today-preview-basis'),key=details.dataset.readingKey;details.open=true;
  globalThis.fetch=()=>new Promise(resolve=>{finish=resolve;});host.querySelector('.today-macro-refresh button').click();await flush();details.querySelector('summary').focus();
  const next=sameDayPreview();next.current_session.sequence=2;finish(Response.json(next));await flush();
  const restored=[...host.querySelectorAll('.today-preview-basis')].find(node=>node.dataset.readingKey===key);
  assert.equal(restored.open,true);assert.equal(document.activeElement,restored.querySelector('summary'));
  assert.equal(host.querySelector('.today-preview').closest('.today-digest-archive'),null);
  const keys=[...host.querySelectorAll('[data-reading-key]')].map(node=>node.dataset.readingKey);assert.equal(new Set(keys).size,keys.length);
 }finally{task?.stop();host.remove();globalThis.fetch=original;t.mock.timers.reset();}
});
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
