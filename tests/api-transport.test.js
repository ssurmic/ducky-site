import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html><body></body></html>',{url:'https://ducky.test/app/'});
for(const k of ['window','document','Node'])globalThis[k]=dom.window[k];
const api=await import('../public/js/app/api.js');
const store=await import('../public/js/app/store.js');
const ui=await import('../public/js/app/ui.js');

for(const raw of [false,true])test(`request deadline covers a stalled ${raw?'binary':'JSON'} body`,async()=>{
  let aborted=false;
  globalThis.fetch=async(url,{signal})=>({
    status:200,headers:new Headers({'content-type':'application/json'}),
    [raw?'arrayBuffer':'json']:()=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));},{once:true})),
  });
  await assert.rejects(api.get('/test',{timeout:15,raw}),e=>e.status===0&&e.body.detail==='network');
  assert.equal(aborted,true);
});

test('malformed JSON is an error, never a successful empty mutation',async()=>{
  globalThis.fetch=async()=>new Response('{broken',{headers:{'content-type':'application/json'}});
  await assert.rejects(api.post('/watchlist',{ticker:'NVDA'}),e=>e.status===502&&e.body.detail==='invalid_response');
});

test('malformed error bodies still honor the authentication status',async()=>{
  let unauthorized=0;api.setUnauthorizedHandler(()=>unauthorized++);
  globalThis.fetch=async()=>new Response('{broken',{status:401,headers:{'content-type':'application/json'}});
  await assert.rejects(api.get('/private'),e=>e.status===401);
  assert.equal(unauthorized,1);api.setUnauthorizedHandler(null);
});

test('completed requests release route abort listeners and preserve raw responses',async()=>{
  const ctl=new AbortController();let adds=0,removes=0;
  const add=ctl.signal.addEventListener.bind(ctl.signal),remove=ctl.signal.removeEventListener.bind(ctl.signal);
  ctl.signal.addEventListener=(...args)=>{adds++;return add(...args);};
  ctl.signal.removeEventListener=(...args)=>{removes++;return remove(...args);};
  globalThis.fetch=async()=>new Response('binary',{status:202,headers:{'X-Fixture':'ok'}});
  const res=await api.get('/test',{raw:true,signal:ctl.signal});
  assert.equal(res.status,202);assert.equal(await res.text(),'binary');assert.equal(res.headers.get('X-Fixture'),'ok');
  assert.equal(adds,removes);
});

test('account change during binary delivery rejects the previous account data',async()=>{
  let finish;store.set('token','first');
  globalThis.fetch=async()=>({status:200,headers:new Headers(),arrayBuffer:()=>new Promise(r=>finish=r)});
  const task=api.get('/private-image',{raw:true});await Promise.resolve();
  store.bumpEpoch();store.set('token','second');finish(new ArrayBuffer(0));
  await assert.rejects(task,e=>e.body.detail==='session_changed');
  store.set('token',null);
});

test('missing and invalid numeric data cannot turn into zero, infinity or signed badges',()=>{
  for(const value of [null,undefined,'','  ',true,false,NaN,Infinity,-Infinity,'NaN',{},[]]){
    for(const format of [ui.num,ui.pct,ui.px,ui.int])assert.equal(format(value),'—',String(value));
    assert.equal(ui.signClass(value),'');
  }
  assert.equal(ui.pct(0),'0.0%');assert.equal(ui.px(0),'$0.00');assert.equal(ui.num('12',0),'12');
  assert.equal(ui.pct(-5),'-5.0%');assert.equal(ui.signClass(-5),'neg');
});

test('a stalled static calendar body cannot hide a successful live calendar',async()=>{
  const live={events:[{date:'2026-09-07',title:'Market closed'}],source:'fixture'};
  const schedule=globalThis.setTimeout;let aborted=false;
  globalThis.setTimeout=(fn,ms,...args)=>schedule(fn,ms===3000?10:ms,...args);
  globalThis.fetch=async(url,opts)=>url==='/calendar.json'?{
    ok:true,json:()=>new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>{
      aborted=true;reject(new Error('aborted'));
    },{once:true})),
  }:new Response(JSON.stringify(live),{headers:{'content-type':'application/json'}});
  try {assert.deepEqual(await api.calendar.feed(),live);assert.equal(aborted,true);}
  finally {globalThis.setTimeout=schedule;}
});
