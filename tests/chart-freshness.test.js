import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom = new JSDOM('<html data-lang="en"><body></body></html>', {url:'https://ducky.test/app/'});
for (const key of ['window','document','Node','location','history']) globalThis[key]=dom.window[key];
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
const strings=document.createElement('script'); strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount,normalizeBars}=await import('../public/js/app/views/chart.js');
const bar={t:'2026-09-04',o:286,h:321.65,l:285.84,c:310.4,v:10};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
window.LightweightCharts={CandlestickSeries:1,LineSeries:2,HistogramSeries:3,createChart:()=>({
  addSeries:()=>({setData(){},createPriceLine(){},applyOptions(){}}),panes:()=>[],timeScale:()=>({fitContent(){}}),remove(){},applyOptions(){}
})};
function root(){store.set('me',{tier:'free'});const r=document.createElement('div');document.body.append(r);return r;}
test('missing and non-finite OHLC values cannot become zero-price candles',()=>{
  assert.deepEqual(normalizeBars([bar,{...bar,t:'2026-09-05',o:null},{...bar,t:'2026-09-06',c:Infinity}]),
    [{time:'2026-09-04',open:286,high:321.65,low:285.84,close:310.4,volume:10}]);
  assert.equal(normalizeBars([{...bar,v:null}])[0].volume,null);
  assert.equal(normalizeBars([{...bar,v:0}])[0].volume,0);
});
test('cold chart retries 202 and displays the completed result',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let calls=0;
  globalThis.fetch=async url=>url.includes('/public/company/')?response({status:'pending'}):++calls===1?response({status:'building'},202):response({bars:[bar],stale:false});
  const r=root(),close=await mount(r,{ticker:'ALAB'});
  t.after(()=>{close();r.remove();});
  assert.match(r.textContent,/being prepared/);assert.doesNotMatch(r.textContent,/No bars/);
  t.mock.timers.tick(5000);await flush();
  assert.match(r.textContent,/310.40/);assert.match(r.textContent,/2026-09-04/);assert.equal(calls,2);
  close();r.remove();
});
test('stale bars disclose their lag and scheduled retries stop on disposal',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let calls=0;
  globalThis.fetch=async url=>{if(url.includes('/public/company/'))return response({status:'pending'});calls++;return response({bars:[{...bar,t:'2026-09-01',c:279.91}],stale:true,expected_last_d:'2026-09-04'});};
  const r=root(),close=await mount(r,{ticker:'ALAB'});
  t.after(()=>{close();r.remove();});
  assert.match(r.textContent,/not caught up.*2026-09-04/);assert.ok(r.querySelector('#chart-status button'));
  close();r.remove();t.mock.timers.tick(20000);await flush();assert.equal(calls,1);
});

test('a late history response cannot replace the data reused by the indicator toggle',async()=>{
 const datasets=[];let slow;
 window.LightweightCharts.createChart=()=>({
  addSeries:()=>({setData(v){datasets.push(v);},createPriceLine(){},applyOptions(){}}),panes:()=>[],
  timeScale:()=>({fitContent(){}}),remove(){},applyOptions(){}
 });
 globalThis.fetch=async url=>{
  if(url.includes('/public/company/'))return response({status:'pending'});
  if(url.includes('period=6mo'))return new Promise(resolve=>{slow=resolve;});
  return response({bars:[{...bar,c:url.includes('period=1y')?300:310.4}]});
 };
 const r=root();store.set('me',{tier:'pro',gates:{bars_period:'2y'}});
 // Reuse a ready empty snapshot so the test isolates the bar race.
 store.set('snapshots',{ALAB:{ok:true,fetched_at:Date.now(),built_at:new Date().toISOString()}});
 const close=await mount(r,{ticker:'ALAB'});
 r.querySelector('[data-period="6mo"]').click();await flush();
 r.querySelector('[data-period="1y"]').click();await flush();
 slow(response({bars:[{...bar,c:200}]}));await flush();
 r.querySelector('.chart-toggles [aria-pressed]').click();await flush();
 assert.equal(datasets.filter(v=>v[0]?.close!==undefined).at(-1)[0].close,300);
 assert.match(r.querySelector('#chart-spot').textContent,/300.00/);
 close();r.remove();
});

test('browser and explicit theme changes repaint every chart layer without refetching, then unsubscribe',async()=>{
 const scheme=new window.EventTarget();window.matchMedia=()=>scheme;
 const series=[],chartOptions=[],removed=[];let fetches=0;
 const palette={green:'#187b35',red:'#cf222e',orange:'#b54700',blue:'#0969da',muted:'#4d5966',border:'#dce2e9',text:'#141a21'};
 const setPalette=values=>Object.entries(values).forEach(([k,v])=>document.body.style.setProperty('--'+k,v));setPalette(palette);
 window.LightweightCharts.createChart=()=>({
  addSeries(type,options){const lines=[];const item={type,options,lines,sets:[],applyOptions(v){Object.assign(this.options,v);},setData(v){this.sets.push(v);},createPriceLine(v){const l={...v,applyOptions(o){Object.assign(this,o);}};lines.push(l);return l;},removePriceLine(l){removed.push(l);lines.splice(lines.indexOf(l),1);}};series.push(item);return item;},
  panes:()=>[],timeScale:()=>({fitContent(){}}),remove(){},applyOptions(o){chartOptions.push(o);}
 });
 const bars=Array.from({length:60},(_,i)=>({...bar,t:new Date(Date.UTC(2026,6,1+i)).toISOString().slice(0,10),c:100+Math.sin(i/4)*10}));
 const option_context={schema:'option-context/1',observed_at:new Date().toISOString(),spot:100,expirations:[
   {expiry:new Date(Date.now()+4*86400000).toISOString().slice(0,10),status:'ready',call_wall:120,put_wall:80}]};
 globalThis.fetch=async url=>{fetches++;return String(url).includes('/bars/')?response({bars}):String(url).includes('/snapshot/')?response({ok:true,built_at:new Date().toISOString(),option_context}):response({status:'unavailable'});};
 const r=root();store.set('me',{tier:'pro',gates:{bars_period:'2y'}});store.set('snapshots',{});
 const close=await mount(r,{ticker:'ALAB'});
 assert.equal(series.length,2); // Price + volume remain the default focus.
 r.querySelector('.chart-toggles [aria-pressed]').click();await flush();
 const active=series.slice(-6),initialFetches=fetches,chartCount=series.length,initialHist=active[3].sets.at(-1).map(({time,value})=>({time,value}));
 assert.ok(initialHist.some(p=>p.value<0));assert.ok(initialHist.some(p=>p.value>0));
 setPalette({green:'#3fb950',red:'#f85149',orange:'#f0883e',blue:'#58a6ff',muted:'#9aa7b4',border:'#263240',text:'#e6edf3'});
 scheme.dispatchEvent(new window.Event('change'));
 assert.equal(chartOptions.at(-1).layout.textColor,'#9aa7b4');
 assert.equal(active[0].options.upColor,'#3fb950');assert.equal(active[0].options.priceLineColor,'#e6edf3');
 assert.equal(active[2].lines[0].color,'#f85149');assert.equal(active[2].lines[1].color,'#3fb950');
 assert.equal(active[3].sets.at(-1).find(p=>p.value<0).color,'#f85149');
 assert.deepEqual(active[3].sets.at(-1).map(({time,value})=>({time,value})),initialHist);
 assert.equal(active[4].options.color,'#f0883e');assert.equal(active[5].lines[0].color,'#9aa7b4');
 assert.equal(active[0].lines.find(p=>p.price===120).color,'#f0883e');assert.ok(removed.length>=2);
 assert.equal(r.querySelectorAll('.legend-item').length,2);assert.equal(r.querySelector('.legend-item i').style.background,'rgb(240, 136, 62)');
 setPalette(palette);document.documentElement.dataset.theme='light';await flush();
 assert.equal(chartOptions.at(-1).layout.textColor,'#4d5966');assert.equal(fetches,initialFetches);assert.equal(series.length,chartCount);
 close();r.remove();const paints=chartOptions.length;
 scheme.dispatchEvent(new window.Event('change'));window.dispatchEvent(new window.Event('ducky:themechange'));document.documentElement.dataset.theme='dark';await flush();
 assert.equal(chartOptions.length,paints);delete window.matchMedia;
});
