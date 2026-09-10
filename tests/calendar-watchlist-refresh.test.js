import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
window.matchMedia=()=>({matches:false});
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const calendar=await import('../public/js/app/views/calendar.js');
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const events=[{date:day,type:'earnings',tickers:['ORCL'],title:'ORCL earnings',title_en:'ORCL earnings'}];
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
function fixture(read,source={}){
 store.bumpEpoch();store.set('me',{tier:'pro'});store.set('watchlist',['NVDA']);
 const calls=[];globalThis.fetch=async(url,opts)=>{calls.push({url:String(url),method:opts?.method||'GET'});
  if(String(url)==='/watchlist')return read();
  if(String(url)==='/calendar.json')return response({events:[]});
  if(String(url)==='/public/calendar.json')return response({events,...source});
  return response({});
 };
 const root=document.createElement('main');document.body.append(root);return {root,calls};
}
const button=(root,key)=>[...root.querySelectorAll('button')].find(x=>x.textContent===copy[key]);

test('calendar re-reads a nonempty cached watchlist on each visit and prioritizes newly watched earnings',async()=>{
 const {root,calls}=fixture(()=>response({items:[{ticker:'NVDA'},{ticker:'ORCL'}]}));
 let close=await calendar.mount(root);
 assert.deepEqual(store.get('watchlist'),['NVDA','ORCL']);
 assert.match(root.querySelector('.event-scope-note').textContent,/Stocks in your watchlist: 2/);
 assert.ok(root.querySelector(`[data-date="${day}"] .pill-tk`).textContent.includes('ORCL'));
 button(root,'app.calendar.mode_list').click();root.querySelector('.cal-mine').click();
 assert.equal(root.querySelectorAll('.cal-mine-ev').length,1);
 assert.equal(calls.filter(x=>x.url==='/watchlist').length,1,'display changes never re-fetch the list');
 close();root.replaceChildren();close=await calendar.mount(root);
 assert.equal(calls.filter(x=>x.url==='/watchlist').length,2,'a revisit/shared reload reads the current list again');
 assert.ok(calls.every(x=>x.method==='GET'));close();root.remove();
});

test('failed or pending watchlist reads preserve saved membership and show an explicit retry state',async()=>{
 for(const status of [503,202]){
  const {root}=fixture(()=>response({retry_after:5},status));const close=await calendar.mount(root);
  assert.deepEqual(store.get('watchlist'),['NVDA']);
  assert.match(root.querySelector('.calendar-watch-warning').textContent,/Couldn't refresh.*saved in this browser \(1\)/);
  assert.ok(button(root,'app.common.retry'));assert.equal(root.querySelector('.event-scope-note'),null);
  assert.equal(root.querySelectorAll('.cal-bicell').length,14,'shared calendar remains usable');
  close();root.remove();
 }
});

test('a confirmed empty server watchlist replaces an older nonempty browser list',async()=>{
 const {root}=fixture(()=>response({items:[]}));const close=await calendar.mount(root);
 assert.deepEqual(store.get('watchlist'),[]);
 assert.match(root.querySelector('.event-scope-note').textContent,/Stocks in your watchlist: 0/);
 assert.equal(root.querySelector('.calendar-watch-warning'),null);close();root.remove();
});

test('navigation or logout before the shared list arrives cannot repopulate membership or render late calendar data',async()=>{
 for(const mode of ['navigation','logout']){
  let finish;const {root}=fixture(()=>new Promise(resolve=>finish=resolve));
  const controller=new AbortController(),mounted=calendar.mount(root,{signal:controller.signal});
  if(mode==='navigation')controller.abort();else{store.bumpEpoch();store.set('me',null);store.set('watchlist',[]);}
  finish(response({items:['ORCL']}));const close=await mounted;
  assert.deepEqual(store.get('watchlist'),mode==='navigation'?['NVDA']:[]);
  assert.equal(root.querySelectorAll('.cal-bicell').length,0);close();root.remove();
 }
});


test('calendar retains earnings and their acquisition clocks during a source failure, then clears the warning on recovery',async()=>{
 const source={partial:true,earnings_source_status:'fetch_failed',earnings_source_coverage:{last_success_at:'2026-09-06T12:00:00Z',last_attempt_at:'2026-09-08T17:00:00Z'}};
 const {root}=fixture(()=>response({items:['ORCL']}),source);let close=await calendar.mount(root);
 const warning=root.querySelector('.calendar-source-warning');assert.ok(warning);
 assert.match(warning.textContent,/Last successful retrieval: 2026-09-06 12:00 UTC/);
 assert.match(warning.textContent,/Last attempt: 2026-09-08 17:00 UTC/);
 assert.ok(root.querySelector(`[data-date="${day}"] .pill-tk`).textContent.includes('ORCL'));
 close();root.replaceChildren();source.partial=false;source.earnings_source_status='ok';close=await calendar.mount(root);
 assert.equal(root.querySelector('.calendar-source-warning'),null);close();root.remove();
});

test('calendar never substitutes generated time for missing source acquisition',async()=>{
 const {root}=fixture(()=>response({items:['ORCL']}),{partial:true,earnings_source_status:'fetch_failed',as_of:'2026-09-08T17:00:00Z',earnings_source_coverage:{}});
 const close=await calendar.mount(root),warning=root.querySelector('.calendar-source-warning');
 assert.match(warning.textContent,/Last successful retrieval: Not recorded/);
 assert.match(warning.textContent,/Last attempt: Not recorded/);close();root.remove();
});

test('merged and fallback calendars preserve source status while a fresh API recovery overrides an older failure',async()=>{
 const {calendar:reader}=await import('../public/js/app/api.js');
 const failed={events:[{date:day,type:'macro',title:'CPI'}],partial:true,earnings_source_status:'fetch_failed',earnings_source_coverage:{last_success_at:'2026-09-06T12:00:00Z'}};
 let live={...failed,events},down=false;
 globalThis.fetch=async url=>String(url)==='/calendar.json'?response(failed):down?response({},503):response(live);
 let doc=await reader.feed();assert.equal(doc.source,'merged');assert.equal(doc.events.length,2);
 assert.equal(doc.earnings_source_status,'fetch_failed');assert.equal(doc.earnings_source_coverage.last_success_at,'2026-09-06T12:00:00Z');
 live={events,partial:false,earnings_source_status:'ok',earnings_source_coverage:{last_success_at:'2026-09-08T18:00:00Z'}};
 doc=await reader.feed();assert.equal(doc.earnings_source_status,'ok');assert.equal(doc.partial,false);
 down=true;doc=await reader.feed();assert.equal(doc.source,'static-fallback');assert.equal(doc.earnings_source_status,'fetch_failed');
});
