import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/en/app/'});
for(const key of ['window','document','Node','location'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {sourceDay,effectiveTiming,sourceEventHint}=await import('../public/js/app/source-event.js');
const {calendarEventKey,eventKind}=await import('../public/js/app/calendar-model.js');
test('official dates, sessions and action meanings preserve unknowns and both sides',()=>{
 for(const value of [null,'','yesterday','2026-02-30','2026-09-21garbage','2026-09-21Tbad'])assert.equal(sourceDay(value),null);
 assert.equal(sourceDay('2026-09-21T12:00:00Z'),'2026-09-21');
 const event={event_type:'index_constituent_change',effective_at:'2026-09-21',effective_session:'before_open',effective_timezone:'America/New_York',index_name:'S&P 500'};
 assert.equal(effectiveTiming(event),'2026-09-21 · Before market open · ET');
 assert.match(effectiveTiming({...event,effective_session:'unspecified'}),/Session unconfirmed/);
 assert.equal(effectiveTiming({...event,effective_at:null}),copy['app.event.effective_unknown']);
 assert.match(sourceEventHint({...event,action:'add'}),/Added to S&P 500/);
 assert.match(sourceEventHint({...event,action:'remove'}),/Removed from S&P 500/);
 assert.match(sourceEventHint(event),/does not guarantee/);
 assert.doesNotMatch(sourceEventHint({...event,action:'unknown'}),/Added|Removed/);
 assert.match(sourceEventHint({event_type:'issuer_news'}),/headline alone/);
});
test('official index events use index context and stable IDs survive title revisions without merging distinct constituents',()=>{
 const event={type:'index_change',date:'2026-09-21',event_id:'index:BE:add',title:'BE joins S&P 500'};
 assert.equal(eventKind(event),'index');
 assert.equal(calendarEventKey(event),calendarEventKey({...event,title:'Revised title'}));
 assert.notEqual(calendarEventKey(event),calendarEventKey({...event,event_id:'index:OTHER:remove'}));
});
