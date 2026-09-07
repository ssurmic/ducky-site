import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<body></body>',{url:'https://ducky.test/app/#/login'});
for(const key of ['window','document','location','history'])globalThis[key]=dom.window[key];
window.DUCKY={BOT:'ExampleBot'};
const auth=await import('../public/js/app/auth.js');
const store=await import('../public/js/app/store.js');
const flush=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
function setup(t,options={}){
 t.mock.timers.enable({apis:['setTimeout','Date'],now:100000});history.replaceState(null,'','/app/#/login');
 store.bumpEpoch();store.set('token',null);store.set('me',null);const calls=[],events=[];let release;
 globalThis.fetch=async(url,opts)=>{
  const path=new URL(url,'https://ducky.test').pathname;calls.push({path,opts});let result;
  if(path==='/auth/nonce')result=options.create?options.create(calls.filter(c=>c.path===path).length):response({nonce:'login_nonce_123456',code:'ABCD'});
  else if(path==='/auth/poll')result=options.poll?options.poll(calls.filter(c=>c.path===path).length):response({token:'signed-in-token'});
  else if(path==='/me')result=response(options.profile||{user_id:1},options.profileStatus||200);
  else if(path==='/watchlist')result=response({items:[]});
  else throw Error('Unexpected '+path);
  if(path===options.pauseAt)return new Promise(resolve=>{release=()=>resolve(result);});
  return result;
 };
 const controller=auth.startNonceLogin({onLink:(...args)=>events.push(['link',...args]),onTick:n=>events.push(['tick',n]),onDone:()=>events.push(['done']),onExpired:()=>events.push(['expired']),onError:e=>events.push(['error',e.status])});
 return {calls,events,controller,release:()=>release(),async tick(ms=5000){t.mock.timers.tick(ms);await flush();}};
}
test('existing Telegram nonce sign-in still hydrates once before completion',async t=>{
 const f=setup(t);try{await flush();assert.equal(f.events[0][0],'link');await f.tick();
  assert.equal(store.get('token'),'signed-in-token');assert.equal(store.get('me').user_id,1);assert.equal(f.events.filter(e=>e[0]==='done').length,1);
  assert.ok(f.calls.filter(c=>c.path.startsWith('/auth/')).every(c=>!c.opts.headers.Authorization));
 }finally{f.controller.stop();}
});
test('nonce login creation and polling retry transient errors while respecting cancellation',async t=>{
 const f=setup(t,{create:n=>n===1?response({},503):response({nonce:'login_nonce_123456',code:'ABCD'}),poll:n=>n===1?response({retry_after:1},429):response({token:'signed-in-token'})});
 try{await flush();await f.tick(1000);assert.equal(f.events[0][0],'link');await f.tick();await f.tick(1000);assert.equal(f.events.at(-1)[0],'done');}finally{f.controller.stop();}
});
test('stopping a pending nonce creation never shows a late QR or starts a poll',async t=>{
 const f=setup(t,{pauseAt:'/auth/nonce'});await flush();f.controller.stop();f.release();await flush();await f.tick();assert.equal(f.events.length,0);assert.equal(f.calls.length,1);
});
test('a changed account or page ignores a late nonce poll',async t=>{
 const f=setup(t,{pauseAt:'/auth/poll'});try{await flush();await f.tick();store.set('token','another-token');f.release();await flush();assert.equal(store.get('token'),'another-token');assert.equal(f.calls.some(c=>c.path==='/me'),false);assert.equal(f.events.some(e=>e[0]==='done'),false);}finally{f.controller.stop();}
});
test('profile hydration failure is visible even after the nonce issued a token',async t=>{
 const f=setup(t,{profileStatus:401,profile:{error:'expired'}});try{await flush();await f.tick();assert.equal(f.events.at(-1)[0],'error');assert.equal(f.events.some(e=>e[0]==='done'),false);}finally{f.controller.stop();}
});
