import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom = new JSDOM('<html><body></body></html>',{url:'https://ducky.test/app/#/profile'});
for(const key of ['window','document','location','history'])globalThis[key]=dom.window[key];
const store=await import('../public/js/app/store.js');
const auth=await import('../public/js/app/auth.js');
const link=await import('../public/js/app/telegram-link.js');
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
const signed={id:'123456789',auth_date:'1800000000',hash:'fixture-signature'};
async function fixture({status=200,error,uid=51,pause=false}={}){
 history.replaceState(null,'','/app/#/profile');window.localStorage.clear();window.sessionStorage.clear();
 store.bumpEpoch();store.set('token','owner-session');store.set('me',{user_id:51,email_verified:true});auth.saveToken('owner-session');link.takeTelegramLinkResult();
 const intent=await link.createTelegramLink();const url=new URL(intent.url);
 for(const [key,value]of Object.entries(signed))url.searchParams.set(key,value);
 const calls=[];let release;
 globalThis.fetch=async(raw,opts={})=>{
  const path=new URL(String(raw),location.origin).pathname;calls.push({path,method:opts.method,body:opts.body&&JSON.parse(opts.body),token:opts.headers?.Authorization,query:location.search});
  if(path==='/me')return reply({user_id:uid,email_verified:true,profile_complete:true});
  if(path==='/watchlist')return reply([]);
  if(path==='/auth/link/telegram'){
   const result=reply(status===200?{ok:true,linked:'telegram',identities:[{provider:'telegram'}]}:{error},status);
   if(pause)return new Promise(resolve=>release=()=>resolve(result));return result;
  }
  throw Error('Unexpected '+path);
 };
 return {url,intent,calls,release:()=>release(),start(){history.replaceState(null,'',url);store.set('token',null);store.set('me',null);return auth.boot();}};
}

test('a redirect link preserves the existing account and token, and removes signed fields before any request',async()=>{
 const f=await fixture();
 const saved=window.sessionStorage.getItem('ducky.telegram-link');assert.equal(saved.includes('owner-session'),false);assert.equal(f.intent.url.includes('owner-session'),false);
 assert.equal(await f.start(),true);assert.equal(auth.didAuthenticateOnBoot(),false);
 assert.equal(store.get('token'),'owner-session');assert.equal(store.get('me').user_id,51);assert.equal(auth.loadToken(),'owner-session');
 const posts=f.calls.filter(row=>row.method==='POST');assert.equal(posts.length,1);assert.equal(posts[0].path,'/auth/link/telegram');assert.deepEqual(posts[0].body,signed);
 assert.ok(f.calls.every(row=>row.query===''));assert.equal(location.hash,'#/profile');assert.equal(window.sessionStorage.getItem('ducky.telegram-link'),null);
 assert.equal(link.takeTelegramLinkResult(),'linked');assert.equal(link.takeTelegramLinkResult(),null);
});

test('invalid state, an expired intent, a changed session or a different account never binds or logs in the Telegram identity',async()=>{
 for(const alter of [f=>f.url.searchParams.set('state','wrong'),()=>{const key='ducky.telegram-link',d=JSON.parse(window.sessionStorage.getItem(key));d.at=Date.now()-11*60*1000;window.sessionStorage.setItem(key,JSON.stringify(d));},()=>auth.saveToken('new-session'),()=>window.sessionStorage.clear()]){
  const f=await fixture();alter(f);assert.equal(await f.start(),true);assert.equal(f.calls.some(row=>row.method==='POST'),false);assert.equal(link.takeTelegramLinkResult(),'session');
 }
 const f=await fixture({uid:52});assert.equal(await f.start(),true);assert.equal(f.calls.some(row=>row.method==='POST'),false);assert.equal(store.get('me').user_id,52);
});

test('a signed linking return with no current session cannot fall through to widget login',async()=>{
 const f=await fixture();window.localStorage.clear();assert.equal(await f.start(),false);assert.equal(f.calls.length,0);assert.equal(link.takeTelegramLinkResult(),'session');
 history.replaceState(null,'',f.url);assert.equal(await auth.consumeWidgetRedirect(),false);assert.equal(f.calls.length,0);
});

test('an already linked identity and an invalid Telegram signature leave the current account signed in',async()=>{
 for(const [status,error,result]of [[409,'telegram_linked_elsewhere','elsewhere'],[401,'bad_telegram','failed'],[503,'unavailable','failed']]){
  const f=await fixture({status,error});assert.equal(await f.start(),true);assert.equal(store.get('token'),'owner-session');assert.equal(auth.loadToken(),'owner-session');assert.equal(store.get('me').user_id,51);
  assert.equal(link.takeTelegramLinkResult(),result);assert.equal(f.calls.some(row=>row.path==='/auth/widget'),false);
 }
});

test('an account switch during a linking request ignores its late result and cannot hydrate the new account',async()=>{
 const f=await fixture({pause:true});const pending=f.start();await flush();
 store.bumpEpoch();store.set('token','other-session');store.set('me',{user_id:52});f.release();await pending;
 assert.equal(store.get('token'),'other-session');assert.equal(store.get('me').user_id,52);assert.equal(f.calls.filter(row=>row.path==='/me').length,1);assert.equal(link.takeTelegramLinkResult(),null);
});

test('the existing login widget stays in redirect mode without unsafe inline callbacks',()=>{
 const host=document.createElement('div');const script=auth.injectWidget(host);
 assert.equal(script.getAttribute('data-onauth'),null);assert.equal(script.getAttribute('data-request-access'),'write');
 assert.equal(script.getAttribute('data-auth-url'),location.origin+location.pathname+'?tglogin=1');
});
