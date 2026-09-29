import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {closeMacro} from './fixtures/today-close-data.js';
const dom=new JSDOM('<html data-lang="en"><body><main class="app-main"></main></body></html>',{url:'https://ducky.test/app/',pretendToBeVisual:true});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
const copy=JSON.parse(readFileSync('i18n/en.json')),strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const macro=await import('../public/js/app/today-macro.js'),preview=await import('../public/js/app/today-preview.js'),store=await import('../public/js/app/store.js');
const now={now:new Date('2026-09-28T20:04:00Z')},flush=()=>new Promise(resolve=>setImmediate(resolve));

test('a source-labelled close snapshot keeps its close, sector, macro and preview topics with real coverage',()=>{
  const root=macro.macroStrip(closeMacro(),now);
  assert.match(root.querySelector('.today-digest-head').textContent,/Market close.*9\/28\/2026/);
  assert.match(root.querySelector('.today-digest-publication').textContent,/16:00 ET.*not final settlement.*17\/19.*DIA, XLB/);
  assert.equal(root.querySelectorAll('.today-digest-part').length,3);assert.ok(root.querySelector('.today-preview'));
  assert.doesNotMatch(root.textContent,/\[object Object\]|undefined|null|NaN/);
  const daily=closeMacro();daily.digest.edition='daily_close';daily.digest.publication.phase='revised';
  assert.match(macro.digestBlock(daily.digest,now).textContent,/Daily close note.*Updated edition/);
  daily.digest.publication.data_as_of='2026-09-28';
  assert.match(macro.digestBlock(daily.digest,now).querySelector('.today-digest-publication').textContent,/Readings for.*9\/28\/2026/);
  assert.doesNotMatch(macro.digestBlock(daily.digest,now).querySelector('.today-digest-publication').textContent,/9\/27|20:00|ET/);
  delete daily.digest.edition;
  assert.match(macro.digestBlock(daily.digest,now).querySelector('h2').textContent,/Today's close-of-day note/);
  assert.equal(macro.digestBlock(daily.digest,now).querySelector('.today-digest-publication'),null);
});

test('the complete dated event list preserves timing, conditional impacts, original sources and safe Calendar links',()=>{
  const root=preview.digestPreview(closeMacro().digest.preview,'2026-09-28');
  assert.equal(root.querySelectorAll('.today-preview-event').length,8);
  assert.equal(root.querySelectorAll(':scope > .today-preview-event').length,3);
  const more=root.querySelector('.today-preview-more');assert.equal(more.open,false);assert.match(more.querySelector('summary').textContent,/5 more events/);
  more.open=true;assert.equal(more.querySelectorAll('.today-preview-event').length,5);
  const rows=root.querySelectorAll('.today-preview-event');
  assert.match(rows[0].textContent,/After market close.*MU/);assert.match(rows[1].textContent,/Time unconfirmed.*AMD/);
  assert.match(rows[2].textContent,/08:30 ET.*CPI/);
  assert.match(rows[0].querySelector('.today-preview-impact').textContent,/could change.*depends on the result/);
  assert.match(rows[0].querySelector('.today-preview-basis').textContent,/Source recorded: 9\/28, 15:00 ET.*Retained condition.*Review revisions/);
  assert.equal(root.querySelector('.today-preview-calendar').getAttribute('href'),'#/calendar?date=2026-09-29');
  assert.match(root.textContent,/sources are incomplete/);
  const unsafe=closeMacro().digest.preview;unsafe.events=[{...unsafe.events[0],url:'javascript:alert(1)',source_url:'http://example.com',impacts:[]}];
  assert.equal(preview.digestPreview(unsafe,'2026-09-28').querySelector('.today-preview-source'),null);
});

test('only a v1.3 close snapshot with its own dated structured preview omits the redundant paragraph',()=>{
  const doc=closeMacro(),original=JSON.stringify(doc),root=macro.digestBlock(doc.digest,now);
  assert.equal(root.querySelector('.today-digest-tomorrow'),null);assert.ok(root.querySelector('.today-preview'));
  assert.equal(JSON.stringify(doc),original,'rendering must not change source prose');
  for(const edition of ['daily_close',undefined]){
    const keep=macro.digestBlock({...doc.digest,edition},now);
    assert.equal(keep.querySelector('.today-digest-tomorrow').tagName,'DIV');
    assert.equal(keep.querySelector('.today-digest-tomorrow p').textContent,doc.digest.tomorrow.en);
  }
  for(const value of [null,{...doc.digest.preview,anchor_session:'2026-09-25'},{...doc.digest.preview,calendar_day:null},{...doc.digest.preview,next_session:'invalid'}]){
    const fallback=macro.digestBlock({...doc.digest,preview:value},now);
    assert.equal(fallback.querySelector('.today-preview'),null);assert.equal(fallback.querySelector('.today-digest-tomorrow').tagName,'DIV');
  }
  for(const version of [undefined,'market-digest/1.2','market-digest/1.4']){
    const future=macro.digestBlock({...doc.digest,version},now);
    assert.equal(future.querySelector('.today-digest-tomorrow p').textContent,doc.digest.tomorrow.en);
  }
});

test('long unavailable lists keep coverage visible and every missing instrument inspectable',()=>{
  const doc=closeMacro(),missing=['SPY','IWM','DIA','XLB','XLC','XLE','XLF','XLI','XLK','XLP','XLRE','XLU','XLV','XLY','TLT','UUP','USO'];
  doc.digest.publication.coverage={available:2,expected:19,missing:missing.map(ticker=>({ticker,reason:'unavailable'}))};
  const root=macro.digestBlock(doc.digest,now),details=root.querySelector('.today-digest-missing');
  assert.match(root.querySelector('.today-digest-publication').textContent,/2\/19 instruments available/);
  assert.equal(details.open,false);assert.equal(details.querySelector('summary').textContent,'View 17 unavailable instruments');
  details.open=true;assert.equal(details.querySelector('p').textContent,'Unavailable: '+missing.join(', '));
  assert.equal(details.dataset.readingKey,'macro-digest:2026-09-28:missing');
  assert.equal(macro.digestBlock(closeMacro().digest,now).querySelector('.today-digest-missing'),null);
});

test('event counts use singular only for exactly one saved event',()=>{
  const saved=closeMacro().digest.preview;
  for(const [n,expected] of [[0,'0 listed events'],[1,'1 listed event'],[2,'2 listed events']]){
    const rendered=preview.digestPreview({...saved,events:saved.events.slice(0,n)},saved.anchor_session);
    assert.equal(rendered.querySelector('.today-preview-sources p').textContent,expected);
  }
});

test('archive preview stays bound to its original session and calendar day differs from next market session',()=>{
  const doc=closeMacro();doc.digest.preview.calendar_day='2026-09-26';doc.digest.preview.next_session='2026-09-28';
  doc.digest.preview.anchor_session=doc.digest.session='2026-09-25';
  const root=macro.macroStrip(doc,now),archive=root.querySelector('.today-digest-archive');
  assert.equal(archive.open,false);assert.match(archive.textContent,/Day after this note: 2026-09-26.*Following trading day: 2026-09-28/);
  assert.match(archive.textContent,/when this note was written/);
  doc.digest.preview.anchor_session='2026-09-28';
  assert.equal(macro.macroStrip(doc,now).querySelector('.today-preview'),null);
});

test('typed holiday and early-close states cannot borrow another session time from a source note',()=>{
  const holiday={date:'2026-11-26',type:'holiday',timing_status:'scheduled',time_et:'09:30',
    note_en:'US stocks and equity options are closed all day. Next regular open: 2026-11-27 at 09:30 ET.'};
  assert.equal(preview.previewTime(holiday),'Market closed');
  assert.equal(preview.previewTime({type:'early_close',timing_status:'scheduled',time_et:'13:15',close_et:'13:00'}),'Early close · 13:00 ET');
  const saved=closeMacro().digest.preview;saved.events=[{...holiday,title_en:'Thanksgiving'}];
  const row=preview.digestPreview(saved,saved.anchor_session).querySelector('.today-preview-event');
  assert.doesNotMatch(row.querySelector('.today-preview-event-head').textContent,/09:30/);
  assert.match(row.querySelector('.today-preview-basis').textContent,/Next regular open: 2026-11-27 at 09:30 ET/);
});

test('unknown coverage and missing impact remain readable without asserting an empty schedule',()=>{
  const saved=closeMacro().digest.preview;
  for(const status of ['partial','unavailable','unexpected']){
    const root=preview.digestPreview({...saved,events:[],coverage:{status}},saved.anchor_session);
    assert.match(root.textContent,/No schedule is available from these sources/);assert.doesNotMatch(root.textContent,/No events are listed/);
  }
  assert.match(preview.digestPreview({...saved,events:[],coverage:{status:'empty'}},saved.anchor_session).textContent,/No events are listed for these dates/);
  const noImpact={...saved,events:[{date:'2026-09-29',title_en:'Saved event',type:'macro',timing_status:'unconfirmed'}]};
  assert.match(preview.digestPreview(noImpact,saved.anchor_session).textContent,/Saved event.*No impact explanation/);
  noImpact.events[0].source_observed_at='2026-09-28';
  assert.match(preview.digestPreview(noImpact,saved.anchor_session).textContent,/Source recorded: 2026-09-28/);
  assert.doesNotMatch(preview.digestPreview(noImpact,saved.anchor_session).textContent,/9\/27, 20:00/);
  const zero=closeMacro();zero.digest.publication.coverage={available:0,expected:19,missing:['SPY']};
  assert.match(macro.digestBlock(zero.digest,now).textContent,/0\/19 instruments available.*Unavailable: SPY/);
});

test('visible saved reads adopt new editions within a minute and preserve disclosures/focus; hidden, offline and disposed reads pause',async t=>{
  const originalFetch=globalThis.fetch;let reads=0,current=closeMacro(),failure=0;
  let visible=true,online=true;
  Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>visible?'visible':'hidden'});
  Object.defineProperty(window.navigator,'onLine',{configurable:true,get:()=>online});
  globalThis.fetch=async(url,options)=>{assert.equal(url,'/macro/beta');assert.equal(options.method,'GET');reads++;return Response.json(failure?{error:'unavailable'}:current,{status:failure||200});};
  t.mock.timers.enable({apis:['Date','setTimeout'],now:now.now});
  const host=document.createElement('div');document.querySelector('main').append(host);let task;
  try{
    task=macro.mountMacroStrip(host);await task;assert.equal(reads,1);
    const more=host.querySelector('.today-preview-more');more.open=true;more.querySelector('summary').focus();
    host.querySelector('.today-preview-basis').open=true;host.querySelector('.today-preview-sources').open=true;
    current=structuredClone(current);current.digest.publication.phase='revised';current.digest.generated_at='2026-09-28T20:03:00Z';
    t.mock.timers.tick(60000);await flush();assert.equal(reads,2);assert.match(host.textContent,/Updated edition/);
    assert.equal(host.querySelector('.today-preview-more').open,true);
    assert.equal(host.querySelector('.today-preview-basis').open,true);assert.equal(host.querySelector('.today-preview-sources').open,true);assert.equal(document.activeElement.dataset.readingKey,'digest-preview:2026-09-28:all:toggle');
    const accepted=host.querySelector('.today-digest');t.mock.timers.tick(60000);await flush();assert.equal(reads,3);assert.equal(host.querySelector('.today-digest'),accepted);
    visible=false;t.mock.timers.tick(60000);await flush();assert.equal(reads,3);
    visible=true;online=false;t.mock.timers.tick(60000);await flush();assert.equal(reads,3);
    online=true;window.dispatchEvent(new window.Event('online'));await flush();assert.equal(reads,4);
    failure=503;host.querySelector('.today-macro-refresh button').click();await flush();assert.equal(host.querySelector('.today-digest'),accepted);assert.match(host.textContent,/Market readings could not load/);
    failure=403;host.querySelector('.today-macro-refresh button').click();await flush();assert.equal(host.querySelector('.today-digest'),null);
    task.stop();t.mock.timers.tick(120000);await flush();assert.equal(reads,6);
  }finally{task?.stop();host.remove();globalThis.fetch=originalFetch;t.mock.timers.reset();}
});

test('late refresh responses cannot replace another account or an aborted route',async()=>{
  const originalFetch=globalThis.fetch;
  try{for(const boundary of ['epoch','abort']){
    let finish;globalThis.fetch=()=>new Promise(resolve=>{finish=resolve;});
    const host=document.createElement('div'),controller=new AbortController();host.textContent='Existing view';
    const task=macro.mountMacroStrip(host,{signal:controller.signal});
    if(boundary==='epoch')store.bumpEpoch();else controller.abort();
    finish(Response.json(closeMacro()));await task;assert.equal(host.textContent,'Existing view');task.stop();
  }}finally{globalThis.fetch=originalFetch;}
});

test('refresh preserves the focused historical chart date when the saved note changes',async()=>{
  const originalFetch=globalThis.fetch,current=closeMacro(),host=document.createElement('div');let task;
  current.observed=Array.from({length:10},(_,i)=>({date:'2026-09-'+String(10+i),funding_score:50+i,nominal_10y:4+i*.02,qqq_index:100+i,spy_index:100+i*.5}));
  globalThis.fetch=async()=>Response.json(current);document.querySelector('main').append(host);
  try{
    task=macro.mountMacroStrip(host);await task;
    const chart=host.querySelector('[data-reading-key="macro-chart:liquidity"]');chart.focus();
    chart.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home',cancelable:true}));
    const date=chart.readingDate();assert.equal(date,'2026-09-10');
    current.digest.publication.phase='revised';
    // Dispatch a click without moving keyboard focus away from the chart.
    host.querySelector('.today-macro-refresh button').click();await flush();
    assert.equal(document.activeElement.dataset.readingKey,'macro-chart:liquidity');
    assert.equal(document.activeElement.readingDate(),date);assert.equal(document.activeElement.getAttribute('aria-valuenow'),'0');
  }finally{task?.stop();host.remove();globalThis.fetch=originalFetch;}
});

test('preview names tomorrow only for the actual next day and keeps same-day, weekend and archived dates honest',()=>{
  const saved=closeMacro().digest.preview,at={now:new Date('2026-09-28T20:04:00Z')};
  const ordinary={...saved,events:saved.events.filter(event=>event.date==='2026-09-29')};
  let root=preview.digestPreview(ordinary,saved.anchor_session,at);
  assert.equal(root.querySelector('h3').textContent,'Tomorrow');
  assert.match(root.querySelector('.today-preview-heading').textContent,/Sep 29/);
  root=preview.digestPreview(saved,saved.anchor_session,at);
  assert.equal(root.querySelector('h3').textContent,'Today and tomorrow');
  assert.match(root.querySelector('.today-preview-day').textContent,/Today.*Sep 28/);
  assert.match(root.querySelectorAll('.today-preview-day')[1].textContent,/Tomorrow.*Sep 29/);
  const today={...saved,events:saved.events.slice(0,2)};
  root=preview.digestPreview(today,saved.anchor_session,at);
  assert.equal(root.querySelector('h3').textContent,"Today's events");
  assert.match(root.textContent,/After market close.*MU.*Time unconfirmed.*AMD/);
  const weekend={...saved,anchor_session:'2026-10-02',calendar_day:'2026-10-03',next_session:'2026-10-05',
    events:[{...saved.events[0],date:'2026-10-05',timing_status:'before_open'}]};
  root=preview.digestPreview(weekend,weekend.anchor_session,{now:new Date('2026-10-02T20:04:00Z')});
  assert.equal(root.querySelector('h3').textContent,'Upcoming events');
  assert.match(root.querySelector('.today-preview-heading').textContent,/Mon, Oct 5/);
  assert.equal(root.querySelector('.today-preview-calendar').getAttribute('href'),'#/calendar?date=2026-10-03');
  root=preview.digestPreview(ordinary,saved.anchor_session,{now:new Date('2026-09-30T12:00:00Z')});
  assert.equal(root.querySelector('h3').textContent,'Scheduled events');
  assert.match(root.querySelector('.today-preview-heading').textContent,/2026/);
  const holiday={...weekend,anchor_session:'2026-11-25',calendar_day:'2026-11-26',next_session:'2026-11-27',
    events:[{...saved.events[0],date:'2026-11-26',type:'holiday',title_en:'Thanksgiving'}]};
  root=preview.digestPreview(holiday,holiday.anchor_session,{now:new Date('2026-11-25T21:00:00Z')});
  assert.equal(root.querySelector('h3').textContent,'Tomorrow');
  assert.match(root.querySelector('.today-preview-event-head').textContent,/Market closed.*Thanksgiving/);
});

test('one event disclosure retains the complete impact and original details without default technical paragraphs',()=>{
  const saved=closeMacro().digest.preview,root=preview.digestPreview(saved,saved.anchor_session,now);
  const row=root.querySelector('.today-preview-event'),details=row.querySelector('details'),head=details.querySelector('summary');
  assert.equal(row.querySelectorAll('summary').length,1);
  assert.equal(head.querySelector('strong').textContent,saved.events[0].title_en);
  assert.equal(head.querySelector('.today-preview-impact').textContent,saved.events[0].impact.en);
  assert.doesNotMatch(head.textContent,/Why it matters|Details and sources/);
  assert.equal(details.dataset.readingKey,'digest-preview:2026-09-28:synthetic-event-0:basis');
  assert.equal(head.dataset.readingKey,'digest-preview:2026-09-28:synthetic-event-0:toggle');
  assert.equal(row.dataset.eventDate,saved.events[0].date);
  assert.equal(root.querySelector(':scope > .today-preview-window'),null);
  assert.equal(root.querySelector(':scope > .today-preview-coverage'),null);
  assert.equal(root.querySelector(':scope > .today-preview-clock'),null);
  const sources=root.querySelector('.today-preview-sources');assert.equal(sources.open,false);
  assert.equal(sources.querySelector('summary').textContent,'Schedule sources');
  assert.match(sources.textContent,/sources are incomplete.*Schedule recorded/s);
  details.open=true;
  assert.match(details.textContent,/Synthetic acceptance schedule.*Review revisions/);
  assert.ok(details.querySelector('a[href="https://example.com/scheduled-event/0"]'));
});
