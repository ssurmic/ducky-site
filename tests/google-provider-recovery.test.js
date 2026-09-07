import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';

const dom=new JSDOM('<div id="view"></div>',{url:'https://ducky.test/app/#/oauth'});
dom.window.document.documentElement.dataset.lang='en';
for(const key of ['window','document','Node','MutationObserver','location','history'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const auth=await import('../public/js/app/auth.js');
const store=await import('../public/js/app/store.js');
const login=await import('../public/js/app/views/login.js');
const google=await import('../public/js/app/views/google.js');
const register=await import('../public/js/app/views/register.js');
const reply=value=>Response.json(value);
const flush=async()=>{for(let i=0;i<20;i++)await new Promise(resolve=>setTimeout(resolve,0));};

test('Google Pro login → logout → failed provider lookup keeps a recoverable Google entry',async()=>{
  let offline=false,providerCalls=0,sessionCalls=0;
  globalThis.fetch=async(url,options)=>{
    if(url.endsWith('/auth/session'))return reply({token:'oauth-fixture-'+(++sessionCalls)});
    if(url.endsWith('/me'))return reply({user_id:12,tier:'pro',permanent:true});
    if(url.endsWith('/watchlist'))return reply({items:[]});
    if(url.endsWith('/auth/logout'))return reply({ok:true});
    if(url.endsWith('/auth/providers')){
      providerCalls++;assert.equal(options.headers.Authorization,undefined);
      if(offline)throw new TypeError('offline');
      return reply({google:true});
    }
    throw new Error('unexpected request');
  };
  await auth.boot();
  await google.mount(document.createElement('div'));
  assert.equal(store.tier(),'pro');
  auth.logout();assert.equal(store.get('me'),null);assert.equal(auth.loadToken(),null);
  offline=true;
  const root=document.createElement('div');document.body.append(root);
  const dispose=await login.mount(root);await flush();
  assert.equal(root.querySelector('.google-login-block').hidden,false,'a failed lookup must not erase Google login');
  const retry=root.querySelector('[data-google-retry]');assert.ok(retry);assert.equal(retry.disabled,false);
  assert.ok(root.textContent.includes(copy['app.google.load_failed']));
  offline=false;retry.click();retry.click();await flush();
  assert.equal(providerCalls,2,'rapid retry clicks share one request');
  assert.equal(root.querySelector('a.google-login').hidden,false);
  assert.equal(root.querySelector('a.google-login').getAttribute('href'),'/auth/google/start?lang=en');
  dispose();root.remove();history.replaceState(null,'','#/oauth');
  await google.mount(document.createElement('div'));
  assert.equal(store.tier(),'pro');assert.equal(store.get('me').user_id,12);
});

for(const [name,view] of [['login',login],['register',register]]){
  test(name+': unavailable and malformed provider responses show retry; explicit disabled stays hidden',async()=>{
    for(const body of [null,{}, {google:'true'}, {google:false}]){
      globalThis.fetch=async()=>reply(body);
      const root=document.createElement('div');document.body.append(root);
      const dispose=await view.mount(root);await flush();
      const block=root.querySelector('.google-login-block');
      assert.equal(block.hidden,body?.google===false);
      if(body?.google!==false)assert.equal(block.querySelector('[data-google-retry]').disabled,false);
      dispose?.();root.remove();
    }
  });
  test(name+': navigation cancels provider loading and ignores the late response',async()=>{
    let resolve,requestSignal;
    globalThis.fetch=(_url,options)=>{requestSignal=options.signal;return new Promise(r=>resolve=r);};
    const ctl=new AbortController(),root=document.createElement('div');document.body.append(root);
    const dispose=await view.mount(root,{signal:ctl.signal});
    assert.equal(root.querySelector('.google-login-block').hidden,false);
    ctl.abort();assert.equal(requestSignal.aborted,true);
    const before=root.innerHTML;resolve(reply({google:true}));await flush();
    assert.equal(root.innerHTML,before);dispose?.();root.remove();
  });
}

test('blocked, unavailable and stalled provider requests expose retry without ending a session',async()=>{
  store.set('token','active-fixture');store.set('me',{user_id:12,tier:'pro'});
  for(const code of [403,503,'timeout']){
    const originalTimer=globalThis.setTimeout;
    if(code==='timeout')globalThis.setTimeout=(fn,ms,...args)=>originalTimer(fn,ms===5000?0:ms,...args);
    globalThis.fetch=async(_url,options)=>{
      if(code!=='timeout')return new Response('{}',{status:code,headers:{'content-type':'application/json'}});
      return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
    };
    const root=document.createElement('div');let dispose;
    try {
      dispose=await login.mount(root);await flush();
      assert.equal(root.querySelector('.google-login-block').hidden,false);
      assert.equal(root.querySelector('[data-google-retry]').disabled,false);
      assert.equal(store.get('token'),'active-fixture');assert.equal(store.tier(),'pro');
    }finally{dispose?.();globalThis.setTimeout=originalTimer;}
  }
});

test('a stalled JSON body also times out; its late result cannot undo a successful retry',async()=>{
  const originalTimer=globalThis.setTimeout;let releaseBody,requestSignal,calls=0;
  globalThis.setTimeout=(fn,ms,...args)=>originalTimer(fn,ms===5000?0:ms,...args);
  globalThis.fetch=async(_url,options)=>{
    if(++calls>1)return reply({google:true});
    requestSignal=options.signal;
    return {ok:true,status:200,headers:new Headers({'content-type':'application/json'}),json:()=>new Promise(resolve=>releaseBody=resolve)};
  };
  const root=document.createElement('div');let dispose;
  try {
    dispose=await login.mount(root);await flush();
    const retry=root.querySelector('[data-google-retry]');
    assert.equal(requestSignal.aborted,true);assert.equal(retry.disabled,false);
    assert.ok(root.textContent.includes(copy['app.google.load_failed']));
    retry.click();await flush();assert.equal(calls,2);
    assert.equal(root.querySelector('a.google-login').hidden,false);
    releaseBody({google:false});await flush();
    assert.equal(root.querySelector('.google-login-block').hidden,false);
    assert.equal(root.querySelector('a.google-login').hidden,false);
  }finally{dispose?.();globalThis.setTimeout=originalTimer;}
});
