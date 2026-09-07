import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/en/app/'});
for(const key of ['window','document','Node','location'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {signalInboxSession}=await import('../public/js/app/signal-inbox.js');
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,0));};
const row=(id,status='sent',content='current')=>({id,ticker:'BE',kind:'index',title:'纳入指数',title_en:'Index addition',content_status:content,delivery:{status},published_at:null,observed_at:'2026-09-05T10:30:00Z',queued_at:'2026-09-05T10:31:00Z',effective_at:'2026-09-21',source_url:'https://example.test/official'});
test('watchlist inbox shows five truthful delivery states, suppresses old content and separates all clocks',async()=>{
 const states=['queued','sent','failed','cancelled','unknown'];let calls=[];
 globalThis.fetch=async(url,opts)=>{calls.push({url:String(url),method:opts.method});return response({items:[...states.map((st,i)=>row(i+1,st)),row(9,'sent','superseded'),row(10,'unknown','unavailable')]});};
 const feed=signalInboxSession({valid:()=>true,onLoseAccess:()=>assert.fail('unexpected gate')}),host=feed.render();document.body.append(host);await feed.load();
 try{
  assert.equal(host.querySelectorAll('.signal-inbox-item').length,7);
  for(const key of ['updates.signal_queued_state','updates.signal_sent','updates.signal_failed','screen.delivery_cancelled','screen.delivery_unknown'])assert.ok(host.textContent.includes(copy['app.'+key]));
  assert.match(host.querySelector('[data-signal-id="1"] details').textContent,/Source published · Time unavailable/);
  assert.match(host.querySelector('[data-signal-id="1"] details').textContent,/Effective time · 2026-09-21/);
  assert.doesNotMatch(host.textContent,/2026-09-21 00:00/);
  for(const id of [9,10]){const card=host.querySelector('[data-signal-id="'+id+'"]');assert.doesNotMatch(card.textContent,/Index addition/);assert.equal(card.querySelector('a[target=_blank]'),null);}
  assert.ok(host.querySelector('a[href="#/research/BE"]'));assert.equal(host.querySelectorAll('[data-unread]').length,0);
  assert.ok(calls[0].url.endsWith('/signals/inbox?limit=30'));assert.equal(calls[0].method,'GET');
 }finally{feed.dispose();host.remove();}
});
test('pagination failure retains items and retries its cursor; refresh failure retries a first page',async()=>{
 let attempt=0;const calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));attempt++;if([2,4].includes(attempt))return response({},503);return response({items:[row(attempt)],next_cursor:attempt===1?1:null});};
 const feed=signalInboxSession({valid:()=>true,onLoseAccess:()=>{}}),host=feed.render();await feed.load();
 host.querySelector('[data-signals-more]').click();await flush();assert.equal(host.querySelectorAll('.signal-inbox-item').length,1);assert.ok(host.querySelector('[data-signals-retry]'));
 host.querySelector('[data-signals-retry]').click();await flush();assert.equal(calls[1],calls[2]);assert.match(calls[2],/before_id=1/);assert.equal(host.querySelectorAll('.signal-inbox-item').length,2);
 await feed.load();host.querySelector('[data-signals-retry]').click();await flush();assert.equal(calls[3],calls[4]);assert.doesNotMatch(calls[4],/before_id/);assert.equal(host.querySelectorAll('.signal-inbox-item').length,1);feed.dispose();
});
test('free gate makes no request, 402 clears private data and late account results cannot repopulate',async()=>{
 let allowed=false,calls=0;globalThis.fetch=async()=>{calls++;return response({items:[row(1)]});};
 const feed=signalInboxSession({valid:()=>allowed,onLoseAccess:()=>{allowed=false;}}),host=feed.render();await feed.load();assert.equal(calls,0);
 allowed=true;await feed.load();assert.equal(host.querySelectorAll('.signal-inbox-item').length,1);
 globalThis.fetch=async()=>response({},402);await feed.load();assert.equal(host.textContent,'');assert.equal(allowed,false);
 allowed=true;let release;globalThis.fetch=async()=>new Promise(resolve=>release=resolve);const pending=feed.load();allowed=false;feed.reset();release(response({items:[row(999)]}));await pending;assert.equal(host.textContent,'');feed.dispose();
});
