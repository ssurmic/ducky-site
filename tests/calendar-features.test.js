import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/app/'});
for(const k of ['window','document','Node','location','history']) globalThis[k]=dom.window[k];
const text=document.createElement('script');text.id='ducky-strings';
text.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(text);
const {symbolPicker}=await import('../public/js/app/symbol-picker.js');
const {eventKind,eventResearchSession}=await import('../public/js/app/calendar-event.js');
const store=await import('../public/js/app/store.js');
const response=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
const tick=()=>new Promise(r=>setTimeout(r,220));

test('combobox debounces, supports IME and keyboard selection, and never auto-submits',async()=>{
 const calls=[];globalThis.fetch=async url=>{calls.push(String(url));return response({items:[{ticker:'AVGO',name:'Broadcom',exchange:'Nasdaq'}]});};
 const input=document.createElement('input'),p=symbolPicker(input);document.body.append(p.wrap);
 input.dispatchEvent(new window.CompositionEvent('compositionstart'));
 input.value='博';input.dispatchEvent(new window.Event('input'));await tick();assert.equal(calls.length,0);
 input.value='博通';input.dispatchEvent(new window.CompositionEvent('compositionend'));await tick();
 assert.equal(calls.length,1);assert.equal(input.getAttribute('aria-expanded'),'true');
 input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowDown',cancelable:true}));
 assert.ok(input.getAttribute('aria-activedescendant'));
 input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',cancelable:true}));
 assert.equal(input.value,'AVGO');assert.equal(input.getAttribute('aria-expanded'),'false');
 p.dispose();p.wrap.remove();
});
test('older search response cannot replace a newer query or update a disposed picker',async()=>{
 let old;globalThis.fetch=async url=>String(url).includes('q=A')?new Promise(r=>old=r):response({items:[{ticker:'CRDO',name:'Credo'}]});
 const input=document.createElement('input'),p=symbolPicker(input);document.body.append(p.wrap);
 input.value='A';input.dispatchEvent(new window.Event('input'));await tick();
 input.value='CRDO';input.dispatchEvent(new window.Event('input'));await tick();
 old(response({items:[{ticker:'ALAB',name:'Astera'}]}));await tick();
 assert.match(p.wrap.textContent,/Credo/);assert.doesNotMatch(p.wrap.textContent,/Astera/);
 p.dispose();assert.equal(input.getAttribute('aria-expanded'),'false');p.wrap.remove();
});
test('followed result is disabled; empty search retains manual ticker input',async()=>{
 globalThis.fetch=async()=>response({items:[{ticker:'ALAB',name:'Astera'}]});
 const input=document.createElement('input'),p=symbolPicker(input,()=>['ALAB']);document.body.append(p.wrap);
 input.value='astera';input.dispatchEvent(new window.Event('input'));await tick();
 const option=p.wrap.querySelector('[role=option]');assert.equal(option.getAttribute('aria-disabled'),'true');option.click();assert.equal(input.value,'astera');
 p.dispose();p.wrap.remove();
});
test('event kinds keep payrolls, productivity, minutes, PMI and issuer earnings distinct',()=>{
 for(const [title,kind] of [['Nonfarm Payrolls','nfp'],['Nonfarm Productivity','other'],['Continuing Jobless Claims','other'],['FOMC Minutes','other'],['CPI inflation','cpi'],['ISM Manufacturing PMI','pmi']]) assert.equal(eventKind({type:'macro',title}),kind);
 assert.equal(eventKind({type:'rebal',title:'MSCI rebalance'}),'index');
 assert.equal(eventKind({type:'rebal',title:'Month-end rebalance'}),'month_end');
});
test('free event cards have useful hints but make no private request',async()=>{
 store.set('me',{tier:'free'});let calls=0;globalThis.fetch=async()=>{calls++;return response({});};
 const session=eventResearchSession();const box=session.mount({type:'earnings',date:'2026-09-10',tickers:['CRDO']});
 assert.match(box.textContent,/guidance/);assert.ok(box.querySelector('a[href="#/billing"]'));assert.equal(calls,0);session.dispose();
});
test('event evidence retains losses and missing observations with source links',async()=>{
 store.set('me',{tier:'pro'});
 const sample=(d,w)=>({date:d,source:'https://www.bls.gov',windows:{'1':w,'5':w,'20':w}});
 const doc={selected:'ALAB',relations:[{ticker:'ALAB',relation:'peer',lanes:[{zh:'有源铜连接',en:'Copper links'}]}],history:{price_as_of:'2026-09-04',samples:[sample('2026-08-01',{status:'ok',start:'2026-07-31',end:'2026-08-07',return_pct:-8,benchmark_pct:1}),sample('2026-09-03',{status:'immature'})],summary:{'5':{n:1,up:0,down:1,flat:0,median_pct:-8,median_excess_pp:-9,min_pct:-8,max_pct:-8,excluded:{immature:1}}}}};
 globalThis.fetch=async()=>response(doc);const session=eventResearchSession(),box=session.mount({type:'earnings',date:'2026-09-10',tickers:['CRDO']});document.body.append(box);await tick();
 assert.match(box.textContent,/N=1.*0 up.*1 down/);assert.match(box.textContent,/-8.0%/);assert.match(box.textContent,/Window incomplete/);assert.equal(box.querySelectorAll('tbody tr').length,2);assert.ok(box.querySelector('a[href="https://www.bls.gov/"]'));
 session.dispose();box.remove();
});
test('logout suppresses pending private research',async()=>{
 store.set('me',{tier:'pro'});let done;globalThis.fetch=()=>new Promise(r=>done=r);
 const session=eventResearchSession(),box=session.mount({type:'macro',title:'CPI',date:'2026-09-10'});
 store.bumpEpoch();store.set('me',null);done(response({relations:[{ticker:'SECRET',relation:'direct'}]}));await tick();assert.doesNotMatch(box.textContent,/SECRET/);session.dispose();
});
test('calendar merge identity preserves different events and deduplicates renamed releases',async()=>{
 const {calendarEventKey:key}=await import('../public/js/app/calendar-model.js');
 const day={date:'2026-09-30'};
 assert.equal(key({...day,type:'macro',title:'PCE 物价指数',title_en:'PCE price index'}),key({...day,type:'macro',title:'PCE 物价',title_en:"PCE price index (Fed preferred)"}));
 assert.notEqual(key({...day,type:'rebal',title_en:'Month-end rebalance'}),key({...day,type:'rebal',title_en:'MSCI review'}));
 assert.notEqual(key({...day,type:'macro',title_en:'Nonfarm Payrolls'}),key({...day,type:'macro',title_en:'Nonfarm Productivity'}));
});
