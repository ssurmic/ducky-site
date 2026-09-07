import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<html><body><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/#/profile?setup=email&next=alerts%3Fticker%3DNOK',pretendToBeVisual:true});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const target=await import('../public/js/app/login-target.js');
const {mount}=await import('../public/js/app/views/profile.js');
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});

test('explicit sign-in collects missing or unverified email without losing its safe destination',()=>{
 for(const me of [{profile_complete:false,email_verified:false},{profile_complete:true,email_verified:false}]){
  target.rememberTarget('#/alerts?ticker=NOK');
  assert.equal(target.signedInTarget(me),'#/profile?setup=email&next=alerts%3Fticker%3DNOK');
  assert.equal(target.takeTarget(),'#/watchlist');
 }
 assert.equal(target.signedInTarget({profile_complete:true,email_verified:true},'#/calendar?ticker=BE&date=2026-09-21'),'#/calendar?ticker=BE&date=2026-09-21');
 assert.equal(target.signedInTarget({email_verified:false},'https://other.test'),'#/profile?setup=email&next=watchlist');
 assert.equal(target.signedInTarget({email_verified:false},'#/boards?board=social&ticker=mu&token=secret'),'#/profile?setup=email&next=boards%3Fboard%3Dsocial%26ticker%3DMU');
});

function fixture({email=null,pauseAt='',verifyStatus=200,verified=true}={}){
 history.replaceState(null,'','/app/#/profile?setup=email&next=alerts%3Fticker%3DNOK');
 store.bumpEpoch();store.set('token','account-a-token');store.set('me',{user_id:21,profile_complete:!!email,email_verified:false});
 document.getElementById('toasts').textContent='';
 let profile={user_id:21,email,email_verified:false,has_password:false},release;
 const calls=[];const root=document.createElement('main');document.body.append(root);const ctl=new AbortController();
 globalThis.fetch=async(url,options={})=>{
  const path=new URL(String(url),'https://ducky.test').pathname,method=options.method||'GET';calls.push({path,method,body:options.body,token:options.headers?.Authorization});
  let result;
  if(path==='/auth/providers')result=reply({google:false});
  else if(path==='/me')result=reply({user_id:21,profile_complete:!!profile.email,email_verified:profile.email_verified});
  else if(path==='/me/profile'&&method==='GET')result=reply(profile);
  else if(path==='/me/profile'&&method==='POST'){profile={...profile,...JSON.parse(options.body),email_verified:false};result=reply({...profile,code_sent:true});}
  else if(path==='/me/profile/verify'){
   if(verifyStatus===200){profile={...profile,email_verified:verified};result=reply(profile);}
   else result=reply({error:'code_expired'},verifyStatus);
  }else if(path==='/me/profile/resend')result=reply({sent:true,dry_run:false},202);
  else throw Error('Unexpected '+path);
  if(path===pauseAt&&method==='POST')return new Promise(resolve=>release=()=>resolve(result));
  return result;
 };
 return {root,calls,async mount(){await mount(root,{signal:ctl.signal,query:new URLSearchParams('setup=email')});},release(){release();},close(){ctl.abort();root.remove();},get continuation(){return root.querySelector('a[href="#/alerts?ticker=NOK"]');}};
}

test('save sends one code request, verification keeps the account and unlocks its destination',async()=>{
 const f=fixture({pauseAt:'/me/profile'});await f.mount();
 assert.equal(f.root.querySelector('h1').textContent,copy['app.profile.setup_title']);
 assert.equal(f.continuation,null);
 const form=f.root.querySelector('form');form.querySelector('[name=email]').value='receiving@example.test';
 const submit=()=>form.dispatchEvent(new window.Event('submit',{cancelable:true}));submit();submit();await flush();
 assert.equal(f.calls.filter(r=>r.method==='POST'&&r.path==='/me/profile').length,1);
 f.release();await flush();assert.equal(f.continuation,null);
 const code=f.root.querySelector('.verify input'),button=f.root.querySelector('.verify button');
 code.value='abc';button.click();await flush();assert.equal(f.calls.some(r=>r.path.endsWith('/verify')),false);
 code.value='123456';button.click();button.click();await flush();
 assert.equal(f.calls.filter(r=>r.path.endsWith('/verify')).length,1);
 assert.equal(store.get('me').user_id,21);assert.equal(store.get('me').email_verified,true);assert.ok(f.continuation);
 assert.equal(f.root.querySelector('h1').textContent,copy['app.profile.setup_ready_title']);
 assert.equal(f.root.querySelector('.profile-email-change').open,false);f.close();
});

test('expired or unconfirmed verification never offers continue or announces verified',async()=>{
 for(const options of [{verifyStatus:410},{verified:false}]){
  const f=fixture({email:'receiving@example.test',...options});await f.mount();f.root.querySelector('.verify input').value='123456';f.root.querySelector('.verify button').click();await flush();
  assert.equal(f.continuation,null);assert.equal(f.root.querySelector('.verify .ok'),null);assert.equal(store.get('me').email_verified,false);f.close();
 }
});

test('leaving or switching accounts during verification cannot hydrate the wrong account',async()=>{
 for(const leave of [f=>f.close(),()=>{store.set('token','account-b-token');store.set('me',{user_id:22,email_verified:true});}]){
  const f=fixture({email:'receiving@example.test',pauseAt:'/me/profile/verify'});await f.mount();f.root.querySelector('.verify input').value='123456';f.root.querySelector('.verify button').click();await flush();
  leave(f);f.release();await flush();assert.equal(f.calls.filter(r=>r.path==='/me').length,0);assert.equal(document.getElementById('toasts').textContent,'');f.close();
 }
});
