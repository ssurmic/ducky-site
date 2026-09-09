import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as flush} from 'node:timers/promises';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('',{url:'https://ducky.test/app/#/watchlist'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const auth=await import('../public/js/app/auth.js');
const store=await import('../public/js/app/store.js');
const token=id=>btoa(JSON.stringify({u:1,e:1,s:0,d:id.repeat(32)}))+'.signature';
const old=token('a'),next=token('b');
function reset(t,{saved=true}={}){
 window.localStorage.clear();store.bumpEpoch();store.set('me',null);store.set('token',null);history.replaceState(null,'','#/watchlist');
 if(saved){auth.saveToken(old);store.set('token',old);store.set('me',{user_id:1});}
 t.mock.timers.enable({apis:['setTimeout']});
 t.after(()=>{delete window.navigator.locks;t.mock.timers.reset();});
}
function heldLock(){
 const pending=[];
 Object.defineProperty(window.navigator,'locks',{configurable:true,value:{request:(name,options,run)=>{
  // Also accepts the previous unbounded call, so this fixture reproduces the regression.
  if(typeof options==='function'){run=options;options={};}
  return new Promise((resolve,reject)=>{
   const item={name,signal:options.signal,run,resolve,reject};pending.push(item);
   options.signal?.addEventListener('abort',()=>reject(options.signal.reason),{once:true});
  });
 }}});return pending;
}
const busy=e=>e?.status===503&&e.body.detail==='session_busy';
test('a held cross-tab lock times out, cancels its queue entry, and allows a later retry',async t=>{
 reset(t);const locks=heldLock();let calls=0,result;
 globalThis.fetch=async()=>{calls++;return Response.json({token:next});};
 const work=auth.renewSession().then(v=>result=v,e=>result=e);
 t.mock.timers.tick(5000);await flush();
 assert.ok(busy(result),'a stuck tab must not leave renewal pending forever');await work;
 assert.equal(locks[0].signal.aborted,true);assert.equal(calls,0);
 assert.equal(auth.loadToken(),old);assert.equal(store.get('me').user_id,1);
 window.navigator.locks.request=(name,options,run)=>Promise.resolve(run());
 assert.equal(await auth.renewSession(),true);assert.equal(calls,1);assert.equal(auth.loadToken(),next);
});
test('a lock timeout adopts a completed same-account renewal without another request',async t=>{
 reset(t);heldLock();let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({});};
 const work=auth.renewSession();auth.saveToken(next);t.mock.timers.tick(5000);
 assert.equal(await work,true);assert.equal(store.get('token'),next);assert.equal(calls,0);
});
test('logout while queued cannot become a restored session after the timeout',async t=>{
 reset(t);heldLock();globalThis.fetch=async()=>Response.json({ok:true});
 const work=auth.renewSession();const checked=assert.rejects(work,e=>e.body.detail==='session_changed');
 auth.logout();t.mock.timers.tick(5000);await checked;
 assert.equal(auth.loadToken(),null);assert.equal(store.get('token'),null);assert.equal(store.get('me'),null);
});
test('boot can use its existing access token while another tab holds the renewal lock',async t=>{
 reset(t);store.set('me',null);heldLock();const calls=[];
 globalThis.fetch=async url=>{calls.push(url);return Response.json(url==='/me'?{user_id:1,tier:'free'}:{items:[]});};
 const work=auth.boot();await flush();t.mock.timers.tick(5000);
 assert.equal(await work,true);assert.deepEqual(calls,['/me','/watchlist']);assert.equal(auth.loadToken(),old);
});
test('cookie-only boot exposes a retryable timeout instead of pretending the user logged out',async t=>{
 reset(t,{saved:false});heldLock();let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({});};
 const work=auth.boot();const checked=assert.rejects(work,busy);await flush();t.mock.timers.tick(5000);await checked;
 assert.equal(location.hash,'#/watchlist');assert.equal(calls,0);assert.equal(window.localStorage.getItem('ducky.logged-out'),null);
});
test('an expired access token and a held lock preserve credentials for recovery',async t=>{
 reset(t);store.set('me',null);heldLock();const calls=[];
 globalThis.fetch=async url=>{calls.push(url);return Response.json({error:'unauthorized'},{status:401});};
 const work=auth.boot();const checked=assert.rejects(work,busy);
 await flush();t.mock.timers.tick(5000);await flush();t.mock.timers.tick(5000);await checked;
 assert.deepEqual(calls,['/me','/watchlist']);assert.equal(auth.loadToken(),old);assert.equal(store.get('token'),old);
 assert.equal(location.hash,'#/watchlist');
});
test('acquiring the lock cancels only its queue timer and preserves the in-flight request',async t=>{
 reset(t);let signal,finish;
 Object.defineProperty(window.navigator,'locks',{configurable:true,value:{request:(name,options,run)=>{signal=options.signal;return Promise.resolve(run());}}});
 globalThis.fetch=()=>new Promise(resolve=>finish=resolve);
 const work=auth.renewSession();t.mock.timers.tick(6000);
 assert.equal(signal.aborted,false);finish(Response.json({token:next}));assert.equal(await work,true);
});
