import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/#/profile',pretendToBeVisual:true});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
const copy=JSON.parse(readFileSync('i18n/en.json','utf8'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const api=await import('../public/js/app/api.js');
const {mount}=await import('../public/js/app/views/profile.js');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
function fixture({pauseAt='',backendStatus=200,reuse=false,enabled=true}={}){
 history.replaceState(null,'','/app/#/profile');store.bumpEpoch();store.set('token','account-a-token');store.set('me',{user_id:1,tier:'pro'});
 document.getElementById('toasts').textContent='';
 const phases=[],calls=[];let release,cleanup;
 function step(name,value){phases.push(name);return name===pauseAt?new Promise(resolve=>release=()=>resolve(value)):Promise.resolve(value);}
 const subscription={toJSON:()=>({endpoint:'https://push.test/device-endpoint',keys:{p256dh:'public-test-key',auth:'test-value'}})};
 const registration={pushManager:{getSubscription:()=>step('existing',reuse?subscription:null),subscribe:()=>step('create',subscription)}};
 const worker={register:()=>step('register',registration),get ready(){return step('ready',registration);}};
 Object.defineProperty(navigator,'serviceWorker',{value:worker,configurable:true});window.PushManager=function(){};
 globalThis.Notification={permission:'default',requestPermission:()=>step('permission','granted')};window.Notification=globalThis.Notification;
 globalThis.fetch=async(url,options)=>{
  const path=new URL(String(url),'https://ducky.test').pathname;calls.push({path,...options});
  if(path==='/auth/providers')return step('providers',json({google:false}));
  if(path==='/me/profile')return step('profile',json({email:'account-a@example.test',email_verified:true,has_password:true}));
  if(path==='/push/config')return step('config',json({enabled,vapid_public:'BAAA'}));
  if(path==='/push/subscribe')return step('backend',json({ok:backendStatus===200},backendStatus));
  throw Error('Unexpected request '+path);
 };
 const root=document.createElement('main');document.body.append(root);const route=new AbortController();
 return {root,route,phases,calls,get button(){return root.querySelector('.pushsec button');},
  async mount(){cleanup=await mount(root,{signal:route.signal});return cleanup;},
  release(){assert.equal(typeof release,'function','expected suspended phase '+pauseAt);release();},
  switchAccount(){store.set('token','account-b-token');store.set('me',{user_id:2,tier:'pro'});},
  toast(){return document.getElementById('toasts').textContent;},
  close(){route.abort();cleanup?.();root.remove();api.setUnauthorizedHandler(null);api.setPaymentRequiredHandler(null);}};
}
for(const phase of ['config','permission','register','ready','existing','create']){
 test('switching account while '+phase+' waits cannot subscribe for the next user or update the old button',async()=>{
  const f=fixture({pauseAt:phase});await f.mount();const button=f.button;button.click();await flush();
  assert.ok(f.phases.includes(phase));assert.equal(button.disabled,true);
  f.switchAccount();f.release();await flush();
  assert.equal(f.calls.some(call=>call.path==='/push/subscribe'),false);assert.equal(f.toast(),'');assert.equal(button.disabled,true);f.close();
 });
}
test('a late local subscription after route cancellation remains unbound instead of being posted for another account',async()=>{
 const f=fixture({pauseAt:'create'});await f.mount();const button=f.button;button.click();await flush();
 f.route.abort();f.switchAccount();f.release();await flush();
 assert.equal(f.calls.some(call=>call.path==='/push/subscribe'),false);assert.equal(button.disabled,true);assert.equal(f.toast(),'');f.close();
});
test('same-token uid changes and epoch-only invalidation are both detected after permission resolves',async()=>{
 for(const change of [()=>store.set('me',{user_id:2,tier:'pro'}),()=>store.bumpEpoch()]){
  const f=fixture({pauseAt:'permission'});await f.mount();f.button.click();await flush();change();f.release();await flush();
  assert.equal(f.phases.includes('register'),false);assert.equal(f.toast(),'');f.close();
 }
});
test('changing route without an abort signal, or replacing the rendered button, stops a pending flow',async()=>{
 for(const leave of [f=>history.replaceState(null,'','#/watchlist'),f=>f.root.replaceChildren(document.createElement('p'))]){
  const f=fixture({pauseAt:'permission'});await f.mount();const button=f.button;button.click();await flush();leave(f);f.release();await flush();
  assert.equal(f.phases.includes('register'),false);assert.equal(button.disabled,true);assert.equal(f.toast(),'');f.close();
 }
});
test('late server 401 cannot run account-global logout or upsell handlers for the new session',async()=>{
 const f=fixture({pauseAt:'backend',backendStatus:401});let unauthorized=0,upsells=0;
 api.setUnauthorizedHandler(()=>unauthorized++);api.setPaymentRequiredHandler(()=>upsells++);
 await f.mount();const button=f.button;button.click();await flush();const request=f.calls.find(call=>call.path==='/push/subscribe');
 assert.equal(request.headers.Authorization,'Bearer account-a-token');f.switchAccount();assert.equal(request.signal.aborted,true);
 f.release();await flush();assert.equal(unauthorized,0);assert.equal(upsells,0);assert.equal(f.toast(),'');assert.equal(button.disabled,true);f.close();
});
test('one current-session click subscribes once, allows existing subscriptions and does not send an implicit test',async()=>{
 for(const reuse of [false,true]){
  const f=fixture({reuse});await f.mount();const button=f.button;button.click();button.click();await flush();
  assert.equal(f.calls.filter(call=>call.path==='/push/subscribe').length,1);assert.equal(f.phases.filter(phase=>phase==='permission').length,1);
  assert.equal(f.phases.includes('create'),!reuse);assert.equal(f.calls.some(call=>call.path==='/push/test'),false);
  assert.ok(f.toast().includes(copy['app.profile.push_on']));assert.equal(button.disabled,false);f.close();
 }
});
test('unconfirmed subscription responses show no success and leave the current button retryable',async()=>{
 for(const status of [202,503]){
  const f=fixture({backendStatus:status});await f.mount();f.button.click();await flush();assert.equal(f.toast().includes(copy['app.profile.push_on']),false);assert.equal(f.button.disabled,false);f.close();
 }
});
test('an account switch while profile initialization waits cannot load the next account into the old page',async()=>{
 const f=fixture({pauseAt:'providers'});const mounting=f.mount();await flush();f.switchAccount();f.release();await mounting;await flush();
 assert.equal(f.calls.some(call=>call.path==='/me/profile'),false);assert.equal(f.root.querySelector('.pushsec'),null);f.close();
});
