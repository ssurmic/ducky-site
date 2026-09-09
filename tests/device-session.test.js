import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<a id="account-avatar"></a>',{url:'https://ducky.test/app/#/watchlist'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const auth=await import('../public/js/app/auth.js');
const api=await import('../public/js/app/api.js');
const store=await import('../public/js/app/store.js');
const {renderAccountAvatar}=await import('../public/js/app/account-avatar.js');
const token=id=>btoa(JSON.stringify({u:1,e:1,s:0,d:id}))+'.signature';
const old=token('a'.repeat(32)),next=token('b'.repeat(32));
function reset(){window.localStorage.clear();store.bumpEpoch();store.set('me',null);store.set('token',null);history.replaceState(null,'','#/watchlist');}
function saved(){reset();auth.saveToken(old);store.set('token',old);api.setUnauthorizedHandler(auth.expireSession);}
const me=()=>Response.json({user_id:1,tier:'pro'});
const denied=()=>Response.json({error:'unauthorized'},{status:401});

test('boot renews an expired saved credential then hydrates without a provider redirect',async()=>{
 saved();const calls=[];globalThis.fetch=async(url,options)=>{
  calls.push(url);
  if(url==='/auth/refresh'){assert.equal(options.credentials,'include');assert.equal(options.headers.Authorization,'Bearer '+old);return Response.json({token:next});}
  if(url==='/me')return me();return Response.json({items:[]});
 };
 assert.equal(await auth.boot(),true);assert.equal(store.get('me').tier,'pro');assert.equal(auth.loadToken(),next);
 assert.deepEqual(calls,['/auth/refresh','/me','/watchlist']);
});
test('cookie-only restoration survives unavailable local storage',async()=>{
 reset();const proto=Object.getPrototypeOf(window.localStorage),get=proto.getItem,set=proto.setItem;
 proto.getItem=()=>{throw new Error('storage unavailable');};proto.setItem=()=>{throw new Error('storage unavailable');};
 try{
  globalThis.fetch=async url=>url==='/auth/refresh'?Response.json({token:next}):url==='/me'?me():Response.json({items:[]});
  assert.equal(await auth.boot(),true);assert.equal(store.get('me').user_id,1);
 }finally{proto.getItem=get;proto.setItem=set;}
});
test('logout does not bootstrap a still-pending cookie in the same browser',async()=>{
 saved();let calls=[];globalThis.fetch=async url=>{calls.push(url);return Response.json({ok:true});};
 auth.logout();assert.equal(await auth.boot(),false);assert.deepEqual(calls,['/auth/logout']);
});
test('late refresh cannot revive a logged-out account or overwrite a new login',async()=>{
 saved();let resolve;
 globalThis.fetch=url=>url==='/auth/refresh'?new Promise(r=>resolve=r):Promise.resolve(Response.json({ok:true}));
 const pending=auth.renewSession();auth.logout();auth.saveToken(next);store.set('token',next);store.set('me',{user_id:2});
 resolve(Response.json({token:old}));await assert.rejects(pending,error=>error.body.detail==='session_changed');
 assert.equal(auth.loadToken(),next);assert.equal(store.get('me').user_id,2);
});
test('simultaneous renewals share one request',async()=>{
 saved();let resolve,count=0;globalThis.fetch=()=>{count++;return new Promise(r=>resolve=r);};
 const a=auth.renewSession(),b=auth.renewSession();resolve(Response.json({token:next}));
 assert.deepEqual(await Promise.all([a,b]),[true,true]);assert.equal(count,1);
});
test('an authenticated 401 renews and retries exactly once',async()=>{
 saved();let reads=0,refreshes=0;
 globalThis.fetch=async url=>url==='/auth/refresh'?(refreshes++,Response.json({token:next})):(++reads===1?denied():me());
 assert.equal((await api.me()).user_id,1);assert.equal(reads,2);assert.equal(refreshes,1);
});
test('renewal outage keeps the account for a later retry',async()=>{
 saved();store.set('me',{user_id:1});
 globalThis.fetch=async url=>url==='/auth/refresh'?Response.json({error:'unavailable'},{status:503}):denied();
 await assert.rejects(api.me(),error=>error.status===503);assert.equal(store.get('me').user_id,1);assert.equal(auth.loadToken(),old);
});
test('late credential exchange cannot establish after logout',async()=>{
 saved();let resolve;globalThis.fetch=url=>url==='/auth/password'?new Promise(r=>resolve=r):Promise.resolve(Response.json({ok:true}));
 const pending=api.auth.password('a@example.test','fixture-password');auth.logout();resolve(Response.json({token:next}));
 await assert.rejects(pending,error=>error.body.detail==='session_changed');assert.equal(store.get('me'),null);
});
test('avatar is an accessible profile link with safe URL and error fallback',()=>{
 renderAccountAvatar({account_name:'Ada',avatar_url:'https://lh3.googleusercontent.com/fixture'});
 const link=document.getElementById('account-avatar');assert.equal(link.hidden,false);assert.match(link.getAttribute('aria-label'),/Ada/);
 assert.equal(link.querySelector('img').referrerPolicy,'no-referrer');
 link.querySelector('img').dispatchEvent(new window.Event('error'));assert.equal(link.querySelector('img'),null);assert.equal(link.textContent,'A');
 renderAccountAvatar({account_name:'安全',avatar_url:'https://evil.test/avatar'});assert.equal(link.querySelector('img'),null);
 renderAccountAvatar(null);assert.equal(link.hidden,true);assert.equal(link.textContent,'');
});
