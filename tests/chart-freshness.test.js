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
const {mount,normalizeBars,lastBarState}=await import('../public/js/app/views/chart.js');
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
});
test('chart zoom works without reloading data; reset also restores automatic price scaling',async()=>{
 let range={from:0,to:80},requests=0,fits=0,options;
 const previous=window.LightweightCharts.createChart;
 window.LightweightCharts.createChart=()=>({
  addSeries:()=>({setData(){},createPriceLine(){},applyOptions(){}}),panes:()=>[],remove(){},
  applyOptions(value){options=value;},timeScale:()=>({fitContent(){fits++;range={from:0,to:80};},getVisibleLogicalRange:()=>range,setVisibleLogicalRange(value){range=value;}})
 });
 globalThis.fetch=async url=>{requests++;return String(url).includes('/bars/')?response({bars:[bar]}):response({status:'unavailable'});};
 const r=root(),close=await mount(r,{ticker:'ALAB'}),before=requests;
 try{
  const click=action=>r.querySelector(`[data-chart-zoom=${action}]`).click();
  click('in');assert.deepEqual(range,{from:10,to:70});
  click('out');assert.deepEqual(range,{from:0,to:80});
  for(let i=0;i<40;i++)click('in');assert.equal(range.to-range.from,5);
  click('reset');assert.deepEqual(range,{from:0,to:80});assert.equal(fits,2);
  assert.equal(options.rightPriceScale.autoScale,true);assert.equal(requests,before);
 }finally{close();r.remove();window.LightweightCharts.createChart=previous;}
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

test('browser and explicit theme changes repaint every chart layer without refetching, then unsubscribe',async()=>{
 const scheme=new window.EventTarget();window.matchMedia=()=>scheme;
 const series=[],chartOptions=[],removed=[];let fetches=0;
 const palette={green:'#187b35',red:'#cf222e',orange:'#b54700',blue:'#0969da',muted:'#4d5966',border:'#dce2e9',text:'#141a21','chart-up':'#16836f','chart-down':'#bb556a','chart-hist-up':'#8ac9bd','chart-hist-down':'#dfabb7','chart-indicator':'#6477bc','chart-reference':'#a46b24',font:'Manrope, sans-serif'};
 document.body.style.fontFamily='Manrope, sans-serif';
 const setPalette=values=>Object.entries(values).forEach(([k,v])=>document.body.style.setProperty('--'+k,v));setPalette(palette);
 window.LightweightCharts.createChart=()=>({
  addSeries(type,options){const lines=[];const item={type,options,lines,sets:[],applyOptions(v){Object.assign(this.options,v);},setData(v){this.sets.push(v);},createPriceLine(v){const l={...v,applyOptions(o){Object.assign(this,o);}};lines.push(l);return l;},removePriceLine(l){removed.push(l);lines.splice(lines.indexOf(l),1);}};series.push(item);return item;},
  panes:()=>[],timeScale:()=>({fitContent(){}}),remove(){},applyOptions(o){chartOptions.push(o);}
 });
 const bars=Array.from({length:60},(_,i)=>({...bar,t:new Date(Date.UTC(2026,6,1+i)).toISOString().slice(0,10),c:100+Math.sin(i/4)*10}));
 globalThis.fetch=async url=>{fetches++;return String(url).includes('/bars/')?response({bars}):String(url).includes('/snapshot/')?response({ok:true,built_at:'2026-09-04T23:00:00Z',gamma:{call_wall:120,put_wall:80,flip:100},expected:{low:90,high:110}}):response({status:'unavailable'});};
 const r=root();store.set('me',{tier:'pro',gates:{bars_period:'2y'}});store.set('snapshots',{});
 const close=await mount(r,{ticker:'ALAB'});
 const initialFetches=fetches,chartCount=series.length,initialHist=series[2].sets.at(-1).map(({time,value})=>({time,value}));
 assert.equal(chartCount,5);assert.ok(initialHist.some(p=>p.value<0));assert.ok(initialHist.some(p=>p.value>0));
 setPalette({green:'#3fb950',red:'#f85149',orange:'#f0883e',blue:'#58a6ff',muted:'#9aa7b4',border:'#263240',text:'#e6edf3','chart-up':'#55b6a4','chart-down':'#d68093','chart-hist-up':'#34695f','chart-hist-down':'#805363','chart-indicator':'#9aa7d6','chart-reference':'#c7a16e'});
 scheme.dispatchEvent(new window.Event('change'));
 assert.equal(chartOptions.at(-1).layout.textColor,'#9aa7b4');
 assert.match(chartOptions.at(-1).layout.fontFamily,/Manrope/);
 assert.equal(series[0].options.upColor,'#55b6a4');assert.equal(series[0].options.priceLineColor,'#e6edf3');
 assert.equal(series[1].options.color,'#9aa7d6');
 assert.equal(series[1].lines[0].color,'#d68093');assert.equal(series[1].lines[1].color,'#55b6a4');
 assert.equal(series[2].sets.at(-1).find(p=>p.value<0).color,'#805363');
 assert.deepEqual(series[2].sets.at(-1).map(({time,value})=>({time,value})),initialHist);
 assert.equal(series[3].options.color,'#c7a16e');assert.equal(series[4].lines[0].color,'#9aa7b4');
 assert.equal(series[0].lines.find(p=>p.price===100).color,'#9aa7b4');assert.ok(removed.length>=3);
 assert.equal(r.querySelectorAll('.legend-item').length,3);assert.equal(r.querySelector('.legend-item i').style.background,'rgb(199, 161, 110)');
 setPalette(palette);document.documentElement.dataset.theme='light';await flush();
 assert.equal(chartOptions.at(-1).layout.textColor,'#4d5966');assert.equal(fetches,initialFetches);assert.equal(series.length,chartCount);
 close();r.remove();const paints=chartOptions.length;
 scheme.dispatchEvent(new window.Event('change'));window.dispatchEvent(new window.Event('ducky:themechange'));document.documentElement.dataset.theme='dark';await flush();
 assert.equal(chartOptions.length,paints);delete window.matchMedia;
});

test('far-away option levels stay listed without flattening candles; explicit fit and reset preserve prices and focus',async()=>{
 const previous=window.LightweightCharts.createChart;let candle,fetches=0,fits=0;
 window.LightweightCharts.createChart=()=>({
  addSeries(type,options){const series={options,applyOptions(v){Object.assign(options,v);},setData(v){this.data=v;},createPriceLine(){return {applyOptions(){}};},removePriceLine(){}};if(type===1)candle=series;return series;},
  panes:()=>[],timeScale:()=>({fitContent(){fits++;}}),remove(){},applyOptions(){}
 });
 globalThis.fetch=async url=>{fetches++;return String(url).includes('/bars/')?response({bars:[bar]}):String(url).includes('/snapshot/')?response({ok:true,spot:310.4,built_at:'2026-09-04T23:00:00Z',gamma:{call_wall:1000,put_wall:10,flip:300}}):response({status:'unavailable'});};
 const r=root();store.set('me',{tier:'pro',gates:{bars_period:'2y'}});store.set('snapshots',{});
 const close=await mount(r,{ticker:'ALAB'}),initialRequests=fetches;
 const original={priceRange:{minValue:285.84,maxValue:321.65},margins:{above:3,below:5}};
 try{
  assert.equal(candle.options.autoscaleInfoProvider(()=>original),original);
  assert.match(r.querySelector('#chart-legend').textContent,/1,000\.00/);assert.match(r.querySelector('#chart-legend').textContent,/10\.00/);
  const data=structuredClone(candle.data),fit=r.querySelector('[data-chart-control=fit]');fit.focus();fit.click();
  assert.deepEqual(candle.options.autoscaleInfoProvider(()=>original),{...original,priceRange:{minValue:10,maxValue:1000}});
  assert.equal(document.activeElement,r.querySelector('[data-chart-control=fit]'));assert.equal(document.activeElement.checked,true);
  r.querySelector('[data-chart-zoom=reset]').click();
  assert.equal(candle.options.autoscaleInfoProvider(()=>original),original);assert.equal(r.querySelector('[data-chart-control=fit]').checked,false);
  assert.deepEqual(candle.data,data);assert.equal(fetches,initialRequests);assert.equal(fits,2);
 }finally{close();r.remove();window.LightweightCharts.createChart=previous;}
});

test('compact candle controls preserve tier gates, cached aggregation and keyboard-accessible symbol switching',async()=>{
 const previous=window.LightweightCharts.createChart;let candle,barsRequests=0;
 window.LightweightCharts.createChart=()=>({
  addSeries(type){const series={setData(v){this.data=v;},createPriceLine(){},applyOptions(){}};if(type===1)candle=series;return series;},
  panes:()=>[],timeScale:()=>({fitContent(){}}),remove(){},applyOptions(){}
 });
 const bars=[bar,{...bar,t:'2026-09-07',c:312},{...bar,t:'2026-09-08',c:308}];
 globalThis.fetch=async url=>{if(String(url).includes('/bars/')){barsRequests++;return response({bars});}return response({status:'unavailable'});};
 const r=root(),close=await mount(r,{ticker:'ALAB'});
 try{
  assert.equal(r.querySelector('[data-period="2y"]').disabled,true);
  const change=r.querySelector('.chart-change');assert.equal(r.querySelector('.chart-search').hidden,true);change.click();
  assert.equal(change.getAttribute('aria-expanded'),'true');assert.equal(document.activeElement,r.querySelector('.chart-search input'));change.click();
  assert.equal(r.querySelector('.chart-search').hidden,true);
  for(const [interval,count] of [['week',2],['month',1],['day',3]]){
   r.querySelector(`[data-interval=${interval}]`).click();await flush();assert.equal(candle.data.length,count);
   assert.equal(r.querySelectorAll('[data-interval][aria-pressed=true]').length,1);
   assert.equal(r.querySelector('[data-interval][aria-pressed=true]').dataset.interval,interval);
  }
  assert.equal(barsRequests,1);assert.deepEqual(candle.data,normalizeBars(bars));
 }finally{close();r.remove();window.LightweightCharts.createChart=previous;}
});


test('wall distances name their saved spot separately from the dated candle close and never invent quote time',async()=>{
 const previous=window.LightweightCharts.createChart;
 window.LightweightCharts.createChart=()=>({
  addSeries:()=>({setData(){},createPriceLine(){return {};},removePriceLine(){},applyOptions(){}}),
  panes:()=>[],timeScale:()=>({fitContent(){}}),remove(){},applyOptions(){}
 });
 const snapshot={ok:true,spot:365.44,gamma:{call_wall:370,put_wall:365,scope:{retrieved_at:'2026-09-08T14:11:00Z',expiries:['2026-09-11']},
  by_expiry:[{expiry:'2026-09-18',call_wall:380,put_wall:360}]}};
 const original=structuredClone(snapshot);let requests=0;
 globalThis.fetch=async url=>{requests++;return String(url).includes('/bars/')?response({bars:[{...bar,c:357.9,h:370}]}):
  String(url).includes('/snapshot/')?response({built_at:'2026-09-08T14:12:00Z',snapshot}):response({status:'unavailable'});};
 const r=root();store.set('me',{tier:'pro'});store.set('snapshots',{});const close=await mount(r,{ticker:'AVGO'}),initialRequests=requests;
 try{
  assert.match(r.querySelector('#chart-spot').textContent,/357.90.*2026-09-04/);
  assert.equal(r.querySelector('.chart-wall-basis').textContent,'Distances use the recorded price $365.44. Quote time was not saved.');
  assert.match(r.querySelector('.chart-wall-position').textContent,/\+1.2%.*−0.1%/);
  assert.equal(r.querySelector('.chart-wall-basis').nextElementSibling.className,'chart-wall-position');
  assert.doesNotMatch(r.querySelector('.chart-wall-basis').textContent,/2026-09-08|14:1[12]|357.90/);
  const select=r.querySelector('[data-chart-control=expiry]');select.value='2026-09-18';select.dispatchEvent(new window.Event('change'));
  assert.match(r.querySelector('.chart-wall-basis').textContent,/365.44/);
  assert.match(r.querySelector('.chart-wall-position').textContent,/\+4.0%.*−1.5%/);
  assert.match(r.querySelector('#chart-legend').textContent,/380.00.*360.00/);
  assert.equal(requests,initialRequests);assert.deepEqual(snapshot,original);
 }finally{close();r.remove();window.LightweightCharts.createChart=previous;}
});

test('reference rail stays outside the plot and follows expiry, theme and responsive disclosure without refetching',async()=>{
 const previous=window.LightweightCharts.createChart,previousMedia=window.matchMedia;
 const layout=new window.EventTarget();layout.matches=true;
 window.matchMedia=query=>query.includes('900px')?layout:new window.EventTarget();
 let candle,requests=0;
 window.LightweightCharts.createChart=()=>({
  addSeries(type,options){const series={options,lines:[],applyOptions(v){Object.assign(options,v);},setData(v){this.data=v;},
   createPriceLine(value){const line={...value,applyOptions(v){Object.assign(this,v);}};this.lines.push(line);return line;},
   removePriceLine(value){this.lines.splice(this.lines.indexOf(value),1);}};if(type===1)candle=series;return series;},
  panes:()=>[],timeScale:()=>({fitContent(){}}),remove(){},applyOptions(){}
 });
 const snapshot={ok:true,spot:375,gamma:{call_wall:370,put_wall:365,flip:347.98,
  by_expiry:[{expiry:'2026-09-18',call_wall:380,put_wall:360,flip:350}]},
  expected:{low:355,high:390},retrace:{d20:{lo:340,hi:395}}};
 globalThis.fetch=async url=>{requests++;return String(url).includes('/bars/')?response({bars:[bar]}):String(url).includes('/snapshot/')?response(snapshot):response({status:'unavailable'});};
 const r=root();store.set('me',{tier:'pro'});store.set('snapshots',{});const close=await mount(r,{ticker:'AVGO'}),initialRequests=requests;
 try{
  const detail=r.querySelector('.chart-reference-details'),rail=r.querySelector('.chart-references'),host=r.querySelector('#chart-host');
  assert.equal(detail.open,false);assert.equal(rail.hidden,false);assert.equal(host.contains(rail),false);
  assert.equal(rail.contains(r.querySelector('#chart-legend')),true);
  assert.match(r.querySelector('.chart-wall-position').textContent,/above.*370.00/);
  assert.deepEqual(candle.lines.map(l=>l.price),[370,365,347.98]);
  assert.ok(candle.lines.every(l=>l.axisLabelVisible===false&&l.title===''));
  assert.equal(candle.options.lastValueVisible,true);assert.equal(candle.options.priceLineVisible,true);
  detail.open=true;
  const select=r.querySelector('[data-chart-control=expiry]');select.focus();select.value='2026-09-18';select.dispatchEvent(new window.Event('change'));
  assert.equal(detail.open,true);assert.equal(document.activeElement,r.querySelector('[data-chart-control=expiry]'));
  assert.deepEqual(candle.lines.map(l=>l.price),[380,360,350]);
  assert.match(r.querySelector('#chart-legend').textContent,/380.00.*360.00.*350.00/);
  assert.doesNotMatch(r.querySelector('.chart-wall-position').textContent,/above/);
  r.querySelector('[data-chart-control=extras]').click();
  assert.equal(candle.lines.length,7);assert.equal(r.querySelectorAll('.legend-item').length,5);
  assert.ok(candle.lines.every(l=>l.axisLabelVisible===false&&l.title===''));
  detail.open=false;window.dispatchEvent(new window.Event('ducky:themechange'));await flush();assert.equal(detail.open,false);
  layout.matches=false;layout.dispatchEvent(new window.Event('change'));assert.equal(detail.open,true);
  layout.matches=true;layout.dispatchEvent(new window.Event('change'));assert.equal(detail.open,false);
  assert.equal(requests,initialRequests);assert.deepEqual(candle.data,normalizeBars([bar]));
  close();layout.matches=false;layout.dispatchEvent(new window.Event('change'));assert.equal(detail.open,false,'resize listener is removed');
 }finally{close();r.remove();window.LightweightCharts.createChart=previous;window.matchMedia=previousMedia;}
});

test('missing or invalid snapshot spot never falls back to the candle close for wall comparison',async()=>{
 const previous=window.LightweightCharts.createChart;
 window.LightweightCharts.createChart=()=>({
  addSeries:()=>({setData(){},createPriceLine(){return {};},removePriceLine(){},applyOptions(){}}),
  panes:()=>[],timeScale:()=>({fitContent(){}}),remove(){},applyOptions(){}
 });
 try{for(const spot of [null,0]){
  globalThis.fetch=async url=>String(url).includes('/bars/')?response({bars:[bar]}):String(url).includes('/snapshot/')?
   response({built_at:'2026-09-08T14:12:00Z',snapshot:{ok:true,spot,gamma:{call_wall:370,put_wall:365}}}):response({status:'unavailable'});
  const r=root();store.set('me',{tier:'pro'});store.set('snapshots',{});const close=await mount(r,{ticker:'AVGO'});
  assert.equal(r.querySelector('.chart-wall-basis'),null);assert.match(r.querySelector('.chart-wall-position').textContent,/incomplete/);
  assert.match(r.querySelector('#chart-spot').textContent,/310.40/);close();r.remove();
 }}finally{window.LightweightCharts.createChart=previous;}
});


test('bar completion follows the API session facts rather than the browser date or latest bar date',()=>{
 const intraday={market_epoch:'2026-09-08:RTH',expected_last_d:'2026-09-04'};
 assert.equal(lastBarState(intraday,'2026-09-08'),'in_progress');
 assert.equal(lastBarState(intraday,'2026-09-04'),'unverified');
 assert.equal(lastBarState(intraday,'2026-09-03'),'complete');
 assert.equal(lastBarState(intraday,'2026-09-09'),'unverified');
 assert.equal(lastBarState({market_epoch:'2026-09-08:CLOSED',expected_last_d:'2026-09-08'},'2026-09-08'),'unverified');
 assert.equal(lastBarState({market_epoch:'2026-11-27:CLOSED',expected_last_d:'2026-11-27',last_d:'2026-11-27',last_bar_state:'complete'},'2026-11-27'),'complete','server owns early-close schedules');
 assert.equal(lastBarState({},'2026-09-08'),'unverified');
 assert.equal(lastBarState({expected_last_d:'not-a-date'},'2026-09-08'),'unverified');
 assert.equal(lastBarState(intraday,Date.parse('2026-09-08T00:00:00Z')/1000),'in_progress');
 const closed={last_d:'2026-09-08',market_epoch:'2026-09-08:CLOSED',expected_last_d:'2026-09-08'};
 for(const last_bar_state of ['complete','in_progress','unverified'])assert.equal(lastBarState({...closed,last_bar_state},closed.last_d),last_bar_state,'producer state survives a later server clock');
});

test('an intraday candle is never labelled a completed close, while its OHLC remains intact',async()=>{
 const payload={bars:[{...bar,t:'2026-09-08',c:366.43,h:370}],market_epoch:'2026-09-08:RTH',expected_last_d:'2026-09-04',stale:false};
 globalThis.fetch=async url=>String(url).includes('/bars/')?response(payload):response({status:'unavailable'});
 const r=root(),close=await mount(r,{ticker:'AVGO'});
 try{
  assert.equal(r.querySelector('#chart-spot').textContent,'$366.43Unfinished daily bar · 2026-09-08');
  assert.doesNotMatch(r.querySelector('#chart-spot').textContent,/Close/);
  assert.match(r.querySelector('.chart-axes').textContent,/Daily price bars/);
  assert.doesNotMatch(r.querySelector('.chart-axes').textContent,/Daily closing/);
  assert.match(r.querySelector('.chart-ohlc').textContent,/366.43/);
 }finally{close();r.remove();}
});


test('a saved intraday bar stays unfinished after the close and shows its actual observation time',async()=>{
 const payload={bars:[{...bar,t:'2026-09-08',c:366.43,h:370}],last_d:'2026-09-08',market_epoch:'2026-09-08:CLOSED',expected_last_d:'2026-09-08',
  last_bar_state:'in_progress',last_bar_source:'chart_cache',last_bar_observed_at:'2026-09-08T17:09:00Z'};
 globalThis.fetch=async url=>String(url).includes('/bars/')?response(payload):response({status:'unavailable'});
 const r=root(),close=await mount(r,{ticker:'AVGO'});
 try{
  assert.match(r.querySelector('#chart-spot').textContent,/Unfinished daily bar/);
  assert.equal(r.querySelector('.chart-bar-recorded').textContent,'Recorded 2026-09-08 17:09 UTC');
  assert.doesNotMatch(r.querySelector('#chart-spot').textContent,/Close|Quote time/);
 }finally{close();r.remove();}
 // Missing metadata cannot turn the same saved value into a confirmed close.
 delete payload.last_bar_state;delete payload.last_bar_observed_at;
 const legacy=root(),dispose=await mount(legacy,{ticker:'AVGO'});
 assert.match(legacy.querySelector('#chart-spot').textContent,/completion unverified/);
 assert.equal(legacy.querySelector('.chart-bar-recorded'),null);dispose();legacy.remove();
});
