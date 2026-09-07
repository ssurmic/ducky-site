import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><main class="app-shell"></main></body></html>',{url:'https://ducky.test/app/'});
for(const k of ['window','document','Node','location','history'])globalThis[k]=dom.window[k];
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(
 Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {optionView,optionOverlay,expiryLabel,easternDate}=await import('../public/js/app/option-model.js');
const {openStockQuickView,quickTake}=await import('../public/js/app/stock-quickview.js');
const {closeModal}=await import('../public/js/app/ui.js');
const {overviewView}=await import('../public/js/app/watchlist-overview.js');
const store=await import('../public/js/app/store.js');
const {mount}=await import('../public/js/app/views/chart.js');
const at=Date.parse('2026-09-07T23:30:00Z'),stamp=new Date(at).toISOString();
const context={schema:'option-context/1',observed_at:stamp,spot:100,expirations:[
 {expiry:'2026-09-11',status:'ready',call_wall:110,put_wall:90,expected:{low:85,high:115,expiry:'2026-09-11'}},
 {expiry:'2026-09-18',status:'partial',call_wall:120,put_wall:80}]};
const response=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};

test('expiration uses Eastern date and is independent of the stock-history period',()=>{
 assert.equal(easternDate(Date.parse('2026-09-08T01:00:00Z')),'2026-09-07');
 assert.match(expiryLabel('2026-09-11',at),/This week.*4 days/);
 assert.match(expiryLabel('2026-09-18',at),/Next week.*11 days/);
 const view=optionView({option_context:context},'2026-09-18',at);
 assert.equal(optionOverlay(view).gamma.call_wall,120);
 assert.equal(optionOverlay(view).expected,null);
 assert.equal(optionView({gamma:{call_wall:999},expected:{expiry:'2026-09-11'}},null,at).status,'unavailable');
 assert.equal(optionOverlay(optionView({option_context:context},null,at+27*3600000)).gamma,null);
 assert.equal(optionOverlay(optionView({option_context:context},null,at-1)).gamma,null);
});

test('every list stock gets a separate AI button without eager analysis or nested buttons',()=>{
 const opened=[],selected=[];
 const view=overviewView([{ticker:'BE',price:100},{ticker:'NVDA',price:200}],{view:'list',onSelect:t=>selected.push(t),onQuickTake:t=>opened.push(t)});
 assert.equal(view.querySelectorAll('.watch-ai-button').length,2);assert.equal(view.querySelectorAll('button button').length,0);
 view.querySelector('.watch-ai-button').click();assert.deepEqual(opened,['BE']);assert.deepEqual(selected,[]);
});

test('quick brief reads one existing report, preserves prose and closes on Escape',async()=>{
 store.set('me',{tier:'pro'});const calls=[],opener=document.createElement('button');document.body.append(opener);opener.focus();
 const row={ticker:'BE',status:'ready',checked_at:new Date().toISOString(),report:{summary:{en:'Strength has improved, but the upcoming event leaves uncertainty.'}},evidence:[]};
 globalThis.fetch=async(url,opts)=>{calls.push({url,method:opts.method});return response({items:[row]});};
 openStockQuickView('BE',{withChart:false});await flush();
 assert.equal(document.querySelector('.quick-take').textContent,row.report.summary.en);
 assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');assert.match(calls[0].url,/briefing\/stocks\?ticker=BE/);
 document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}));
 assert.equal(document.getElementById('modal').hidden,true);assert.equal(document.activeElement,opener);opener.remove();
 assert.equal(quickTake({...row,status:'source_changed'}),null);
 assert.equal(quickTake({...row,report:{summary:{en:'a'.repeat(500)}}}),null);
});

test('closing a pending quick brief aborts it, and Free never requests private data',async()=>{
 store.set('me',{tier:'pro'});let signal;
 globalThis.fetch=async(url,opts)=>{signal=opts.signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('abort'))));};
 openStockQuickView('BE',{withChart:false});closeModal();assert.equal(signal.aborted,true);await flush();
 store.set('me',{tier:'free'});let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected');};
 openStockQuickView('BE',{withChart:false});await flush();assert.equal(calls,0);closeModal();
});

test('changing expiration updates option lines without fetching or changing candles',async()=>{
 const exp=days=>new Date(Date.now()+days*86400000).toISOString().slice(0,10);
 const data={...context,observed_at:new Date().toISOString(),expirations:context.expirations.map((r,i)=>({...r,expiry:exp(i?11:4)}))};
 const series=[],calls=[];
 window.LightweightCharts={CandlestickSeries:1,HistogramSeries:2,LineSeries:3,createChart:()=>({
  addSeries(type,options){const value={type,options,lines:[],sets:[],setData(v){this.sets.push(v);},applyOptions(){},
   createPriceLine(v){this.lines.push(v);return v;},removePriceLine(v){this.lines.splice(this.lines.indexOf(v),1);}};series.push(value);return value;},
  panes:()=>[],timeScale:()=>({fitContent(){}}),remove(){},applyOptions(){}})};
 store.set('me',{tier:'pro',gates:{bars_period:'2y'}});store.set('snapshots',{});
 globalThis.fetch=async url=>{calls.push(url);return response(String(url).includes('/bars/')?{bars:[{t:'2026-09-04',o:99,h:101,l:98,c:100,v:100}]}:
  String(url).includes('/snapshot/')?{ok:true,option_context:data}:{status:'pending'});};
 const root=document.createElement('section');document.body.append(root);const close=await mount(root,{ticker:'BE'});
 const before=calls.length;assert.equal(series[0].lines[0].price,110);
 const select=root.querySelector('.chart-option-controls select');select.value=exp(11);select.dispatchEvent(new window.Event('change'));
 assert.equal(series[0].lines[0].price,120);assert.equal(calls.length,before);assert.equal(series[0].sets.length,1);
 assert.equal(series[0].options.autoscaleInfoProvider,undefined); // Distant walls do not flatten the price candles.
 assert.match(root.querySelector('.chart-options').textContent,/incomplete/);close();root.remove();
});
