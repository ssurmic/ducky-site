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
