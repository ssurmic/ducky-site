import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));
document.body.append(strings);
const {symbolPicker,instrumentLabels,watchEligibility}=await import('../public/js/app/symbol-picker.js');
const wait=()=>new Promise(resolve=>setTimeout(resolve,220));
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const row=(ticker,metadata={})=>({ticker,name:ticker+' company',instrument_type:'stock',instrument_tags:['stock'],watch_eligible:true,watch_reason:null,...metadata});
const stock=row('META');
const leveraged=row('METU',{instrument_type:'etf',instrument_tags:['etf','leveraged','2x'],watch_eligible:false,watch_reason:'leveraged_instrument'});
const key=(target,value,extra={})=>target.dispatchEvent(new window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...extra}));
async function picker(items,options={},watched=()=>[]){
 globalThis.fetch=async()=>Response.json({items});
 const input=document.createElement('input');input.setAttribute('aria-label','Find a stock');
 const p=symbolPicker(input,watched,options);document.body.append(p.wrap);input.focus();input.value='meta';
 input.dispatchEvent(new window.Event('input'));await wait();
 return {p,input,cleanup(){p.dispose();p.wrap.remove();}};
}

test('instrument labels use saved metadata and missing eligibility stays unverified',()=>{
 assert.deepEqual(instrumentLabels(stock),['Stock']);assert.deepEqual(instrumentLabels(leveraged),['ETF','Leveraged','2x']);
 assert.deepEqual(instrumentLabels(row('ANY',{instrument_type:'etn',instrument_tags:['etn','inverse','1.5x']})),['ETN','Inverse','1.5x']);
 assert.deepEqual(instrumentLabels({ticker:'SOXL',name:'Triple Bull 3x ETF'}),['Security']);
 assert.deepEqual(instrumentLabels({instrument_type:'etf',instrument_tags:['0.5x','1.25x','0x','Infinityx','fake']}),['ETF','0.5x','1.25x']);
 assert.equal(watchEligibility(stock).eligible,true);assert.equal(watchEligibility({watch_eligible:'true'}).eligible,false);
 assert.match(watchEligibility(leveraged).reason,/Leveraged/);assert.match(watchEligibility({}).reason,/unverified/);
});

test('each eligible result adds directly; blocked or unverified results have no add control',async()=>{
 const watched=[],calls=[],selected=[];
 const h=await picker([stock,leveraged,{ticker:'OLD',name:'Old response'}],{allowWatched:true,
   onAdd:async result=>{calls.push(result.ticker);watched.push(result.ticker);return true;},onSelect:result=>selected.push(result.ticker)},()=>watched);
 try{
  assert.equal(h.input.getAttribute('aria-haspopup'),'grid');assert.ok(h.p.wrap.querySelector('[role=grid] [role=gridcell] button'));
  assert.equal(h.p.wrap.querySelectorAll('.symbol-add').length,1);
  assert.match(h.p.wrap.querySelector('.symbol-blocked').textContent,/ETF.*Leveraged.*2x.*cannot be added/);
  h.p.wrap.querySelector('.symbol-add').click();await tick();
  assert.deepEqual(calls,['META']);assert.deepEqual(selected,[]);assert.equal(h.input.value,'meta');
  assert.equal(h.input.getAttribute('aria-expanded'),'true');assert.equal(h.p.wrap.querySelector('.symbol-add').disabled,true);
  assert.match(h.p.wrap.querySelector('.symbol-status').textContent,/Added.*META/);
  h.p.wrap.querySelector('.symbol-add').click();await tick();assert.equal(calls.length,1);
  h.p.wrap.querySelector('.symbol-select').click();assert.deepEqual(selected,['META']);assert.equal(h.input.value,'META');
 }finally{h.cleanup();}
});

test('Tab enters a real popup action and pending updates retain it; Escape restores input',async()=>{
 let done;const h=await picker([stock,row('MTAW',{instrument_type:'etf',instrument_tags:['etf']})],{
  onAdd:()=>new Promise(resolve=>{done=resolve;})});
 try{
  key(h.input,'ArrowDown');key(h.input,'Tab');const button=h.p.wrap.querySelector('.symbol-add');
  assert.equal(document.activeElement,button);assert.equal(h.input.getAttribute('aria-expanded'),'true');
  button.click();h.p.update();assert.equal(document.activeElement,button);assert.equal(button.disabled,true);
  key(button,'ArrowDown');assert.equal(document.activeElement,h.p.wrap.querySelectorAll('.symbol-add')[1]);
  key(document.activeElement,'ArrowLeft');assert.equal(document.activeElement,h.p.wrap.querySelectorAll('.symbol-select')[1]);
  key(document.activeElement,'Escape');assert.equal(document.activeElement,h.input);assert.equal(h.input.getAttribute('aria-expanded'),'false');
  done(true);await tick();assert.equal(h.input.getAttribute('aria-expanded'),'false');
 }finally{h.cleanup();}
});

test('new results reset popup scroll; pointer focus never scrolls the row before click',async()=>{
 const h=await picker([stock,leveraged],{onAdd:async()=>true});try{
  const popup=h.p.wrap.querySelector('.symbol-options');popup.scrollTop=82;
  h.input.dispatchEvent(new window.Event('input'));await wait();assert.equal(popup.scrollTop,0);
  let rowScrolls=0;h.p.wrap.querySelector('.symbol-option').scrollIntoView=()=>{rowScrolls++;};
  const button=h.p.wrap.querySelector('.symbol-add');button.focus();
  assert.equal(rowScrolls,0);assert.equal(h.input.getAttribute('aria-expanded'),'true');
  button.click();await tick();assert.match(h.p.wrap.querySelector('.symbol-status').textContent,/Added/);
 }finally{h.cleanup();}
});

test('popup fits the app scroll pane and moves above an input near the visible bottom',async()=>{
 const h=await picker([stock,leveraged],{onAdd:async()=>true});
 const pane=document.createElement('main');pane.className='app-main';document.body.append(pane);pane.append(h.p.wrap);
 try{
  pane.getBoundingClientRect=()=>({top:64,bottom:583});
  h.input.getBoundingClientRect=()=>({top:258,bottom:302});
  window.dispatchEvent(new window.Event('resize'));
  const popup=h.p.wrap.querySelector('.symbol-options');
  assert.equal(popup.style.getPropertyValue('--symbol-available-height'),'269px');
  assert.equal(popup.classList.contains('symbol-options-above'),false);
  h.input.getBoundingClientRect=()=>({top:460,bottom:504});window.dispatchEvent(new window.Event('resize'));
  assert.equal(popup.classList.contains('symbol-options-above'),true);
  assert.equal(popup.style.getPropertyValue('--symbol-available-height'),'384px');
 }finally{h.cleanup();pane.remove();}
});

test('capacity and mutation failures keep search usable and membership updates refresh without requests',async()=>{
 let full=true,calls=0,requests=0;
 const h=await picker([stock],{onAdd:async()=>{calls++;throw new Error('private failure body');},
  actionState:()=>({disabled:full,label:full?'Watchlist full':undefined,reason:full?'Remove a stock to add another':undefined})});
 try{
  globalThis.fetch=async()=>{requests++;return Response.json({items:[]});};
  let button=h.p.wrap.querySelector('.symbol-add');assert.equal(button.disabled,true);button.click();assert.equal(calls,0);
  full=false;h.p.update();assert.equal(requests,0);assert.equal(button.disabled,false);
  button.click();await tick();assert.equal(calls,1);assert.equal(button.disabled,false);assert.equal(h.input.value,'meta');
  assert.match(h.p.wrap.querySelector('.symbol-status').textContent,/could not be added/);
  assert.doesNotMatch(h.p.wrap.textContent,/private failure body/);
 }finally{h.cleanup();}
});

test('direct-action search respects IME, query races, leaving focus and disposal',async()=>{
 let old,latest;
 const input=document.createElement('input'),p=symbolPicker(input,()=>[],{onAdd:()=>{throw new Error('unexpected write');}});
 document.body.append(p.wrap);input.focus();
 const outside=document.createElement('button');outside.textContent='Outside';document.body.append(outside);
 const calls=[];globalThis.fetch=async url=>{calls.push(String(url));return new Promise(resolve=>{if(String(url).includes('q=older'))old=resolve;else latest=resolve;});};
 try{
  input.dispatchEvent(new window.CompositionEvent('compositionstart'));input.value='中';input.dispatchEvent(new window.Event('input'));await wait();assert.equal(calls.length,0);
  input.value='older';input.dispatchEvent(new window.CompositionEvent('compositionend'));await wait();
  input.value='newer';input.dispatchEvent(new window.Event('input'));await wait();latest(Response.json({items:[stock]}));await tick();
  old(Response.json({items:[leveraged]}));await tick();assert.match(p.wrap.textContent,/META company/);assert.doesNotMatch(p.wrap.textContent,/METU company/);
  outside.focus();assert.equal(input.getAttribute('aria-expanded'),'false');
  input.focus();await wait();p.dispose();latest(Response.json({items:[leveraged]}));await tick();
  assert.equal(p.wrap.querySelectorAll('.symbol-option').length,0);assert.equal(input.getAttribute('aria-expanded'),'false');
 }finally{p.dispose();p.wrap.remove();outside.remove();}
});
