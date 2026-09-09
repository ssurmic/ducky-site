import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {quoteModel,mountQuotes} from '../public/js/desk.js';
const noon=Date.parse('2026-09-08T17:00:00Z');
const value=(ticker,now=noon,day='2026-09-04',price=100)=>({ticker,last_d:day,bars:[{t:day,c:price}],session_context:{basis:'completed_regular_session',price_session:day,expected_session:day,status:'current',checked_at:new Date(now).toISOString()}});
const response=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setTimeout(r,0));};
function fixture(lang=''){
 const dom=new JSDOM(readFileSync(`dist/${lang}index.html`,'utf8'),{url:'https://ducky.test/',pretendToBeVisual:true});
  const doc=dom.window.document,root=doc.querySelector('[data-duck-orbit]');
  // The build embeds today's real closes. A fixed-clock test must not compare
  // its September 4 fixture against a newer September 8 production receipt.
  root.querySelector('[data-desk-quotes]').textContent=JSON.stringify(Object.fromEntries(
    [...root.querySelectorAll('[data-quote]')].map(card=>[card.dataset.quote,value(card.dataset.quote)])));
 return {dom,doc,root};
}

test('verified close uses completed sessions and expires the verification, not the price',()=>{
 const input=value('NVDA');
 assert.equal(quoteModel(input,'NVDA',{now:noon}).status,'current');
 assert.equal(quoteModel(input,'NVDA',{now:noon+31*60000}).status,'unchecked');
 assert.equal(quoteModel(input,'NVDA',{now:noon+31*60000}).price,'100.00');
 assert.equal(quoteModel({...input,session_context:{...input.session_context,expected_session:'2026-09-08'}},'NVDA',{now:noon}).status,'unchecked');
 assert.equal(quoteModel({...input,session_context:{...input.session_context,expected_session:'2026-09-08',status:'stale'}},'NVDA',{now:noon}).status,'stale');
 assert.equal(quoteModel({...input,session_context:{...input.session_context,basis:'recorded_provider_quote'}},'NVDA',{now:noon}).status,'unchecked');
});
test('homepage keeps the close label, retries an outage online, and drops late work on dispose',async t=>{
 for(const lang of ['', 'en/']){
  const {dom,root}=fixture(lang);let offline=true,calls=0,resolve,clock=noon;
  const cleanup=mountQuotes(root,{now:()=>clock,fetcher:async(url,opts)=>{
   calls++;assert.equal(opts.credentials,'omit');assert.ok(!opts.headers);assert.equal(opts.method,undefined);
   const ticker=new URL(url).pathname.split('/').at(-1).replace('.json','');
   if(offline)throw Error('offline');
   if(resolve==='pending')return new Promise(r=>resolve=r);
   return response(value(ticker,clock));
  }});
  t.after(()=>{cleanup();dom.window.close();});
  await flush();assert.equal(calls,3);
  for(const card of root.querySelectorAll('[data-quote]')){
   assert.match(card.querySelector('[data-quote-date]').textContent,lang?/close/:/收盘/);
   assert.equal(card.querySelector('[data-quote-status]').dataset.state,'unavailable');
  }
  offline=false;dom.window.dispatchEvent(new dom.window.Event('online'));await flush();
  assert.equal(calls,6);
  for(const label of root.querySelectorAll('[data-quote-status]'))assert.equal(label.dataset.state,'current');
  // Back-to-back focus events do not amplify public reads.
  dom.window.dispatchEvent(new dom.window.Event('focus'));await flush();assert.equal(calls,6);
  resolve='pending';clock+=5*60000;dom.window.dispatchEvent(new dom.window.Event('online'));await flush();
  const before=root.textContent;cleanup();
  if(typeof resolve==='function')resolve(response(value('NVDA',clock,'2026-09-08',999)));
  await flush();assert.equal(root.textContent,before);dom.window.close();
 }
});
test('periodic public close reads pause while hidden and reject an older returned session',async t=>{
 const {dom,doc,root}=fixture();let tick,hidden=false,clock=noon,old=false,calls=0;
 Object.defineProperty(doc,'hidden',{get:()=>hidden});
 dom.window.setInterval=fn=>{tick=fn;return 1;};dom.window.clearInterval=()=>{};
 const cleanup=mountQuotes(root,{now:()=>clock,fetcher:async url=>{
  calls++;const ticker=new URL(url).pathname.split('/').at(-1).replace('.json','');
  return response(value(ticker,clock,old?'2026-09-03':'2026-09-04',old?999:100));
 }});
 t.after(()=>{cleanup();dom.window.close();});
 await flush();assert.equal(calls,3);
 hidden=true;clock+=5*60000;tick();await flush();assert.equal(calls,3);
 hidden=false;old=true;doc.dispatchEvent(new dom.window.Event('visibilitychange'));await flush();assert.equal(calls,6);
 for(const card of root.querySelectorAll('[data-quote]')){
  assert.equal(card.querySelector('[data-quote-price]').textContent,'$100.00');
  assert.match(card.querySelector('[data-quote-date]').textContent,/2026-09-04/);
  assert.equal(card.querySelector('[data-quote-status]').dataset.state,'unavailable');
 }
 cleanup();tick();await flush();assert.equal(calls,6);dom.window.close();
});
