import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarTicker,calendarEventTicker,orderCalendarEvents,calendarDayPreview} from '../public/js/app/calendar-model.js';

test('calendar ordering preserves every event, date order and session/macro context while prioritizing the linked stock',()=>{
 const day='2026-09-21',event=(id,type,tickers=[])=>({id,date:day,type,tickers});
 const input=[event('other-a','index_change',['AGNC']),event('watched','index_change',['AMSF']),event('macro-a','macro'),
  event('linked','index_change',['XX','be']),event('other-b','index_change',['BKE']),event('session','early_close'),
  {...event('prior','index_change',['Q']),date:'2026-09-20'},event('macro-b','macro')];
 const options={scopeTicker:' be ',isWatched:e=>e.tickers.includes('AMSF')};
 assert.deepEqual(orderCalendarEvents(input,options).map(e=>e.id),['prior','session','linked','macro-a','macro-b','watched','other-a','other-b']);
 assert.equal(input[0].id,'other-a','shared input is not mutated');
 assert.deepEqual(new Set(orderCalendarEvents(input,options)),new Set(input),'nothing is filtered or synthesized');
 assert.equal(calendarEventTicker(input[3],options.scopeTicker),'BE');
 for(const value of ['BE<script>','BE,AGNC','https://BE','B'.repeat(11)])assert.equal(calendarTicker(value),'');
 assert.equal(calendarTicker('brk.b'),'BRK.B');
 assert.deepEqual(orderCalendarEvents(input,{...options,scopeTicker:'BE,AGNC'}).map(e=>e.id),['prior','session','macro-a','macro-b','watched','other-a','linked','other-b']);
});

test('compact previews never hide watched earnings, even beyond their usual slot count',()=>{
 const event=(id,type,tickers=[])=>({id,date:'2026-09-10',type,tickers});
 const macro=[event('ppi','macro'),event('claims','macro')];
 const earnings=['ORCL','ADBE','NVDA','AVGO'].map(t=>event(t,'earnings',[t]));
 const options={isWatched:e=>e.type==='earnings'};
 assert.deepEqual(calendarDayPreview([...macro,earnings[0]],options).visible.map(e=>e.id),['ORCL','ppi','claims']);
 const input=[...macro,...earnings,event('close','early_close')],original=input.slice();
 const result=calendarDayPreview(input,options);
 assert.deepEqual(result.visible.map(e=>e.id),['close','ORCL','ADBE','NVDA','AVGO']);
 assert.deepEqual(result.hidden,macro);
 assert.deepEqual(input,original,'preview selection does not change shared event order');
 assert.deepEqual(new Set([...result.visible,...result.hidden]),new Set(input));
 assert.deepEqual(calendarDayPreview(input,{scopeTicker:'avgo',isWatched:options.isWatched}).visible.map(e=>e.id),['close','AVGO','ORCL','ADBE','NVDA']);
 assert.deepEqual(calendarDayPreview(macro,options).visible,macro,'filters are respected; no earnings are synthesized');
});
