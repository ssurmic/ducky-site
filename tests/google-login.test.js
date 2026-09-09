import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
const dom = new JSDOM('<main><div id="view"></div></main>', {url:'https://ducky.test/app/#/oauth'});
for (const k of ['window','document','Node','MutationObserver','location','history']) globalThis[k]=dom.window[k];
globalThis.requestAnimationFrame=f=>setTimeout(f,0);
const text=document.createElement('script');text.id='ducky-strings';
const copy=JSON.parse(readFileSync('i18n/en.json'));
text.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(text);
const auth=await import('../public/js/app/auth.js');
const api=await import('../public/js/app/api.js');
const store=await import('../public/js/app/store.js');
const google=await import('../public/js/app/views/google.js');
const register=await import('../public/js/app/views/register.js');
const reply=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});

test('OAuth return skips stale stored auth and exchanges only its secure cookie',async()=>{
  auth.saveToken('old-account-token');
  let calls=[];
  globalThis.fetch=async(url,opts)=>{
    calls.push({url,opts});
    if (url.endsWith('/auth/session')) return reply({token:'new-account-token'});
    if (url.endsWith('/me')) return reply({user_id:12,tier:'free'});
    if (url.endsWith('/watchlist')) return reply({items:[]});
    throw new Error('unexpected request');
  };
  assert.equal(await auth.boot(),false);assert.equal(calls.length,0);
  await google.mount(document.getElementById('view'));
  assert.equal(calls[0].url,'/auth/session');
  assert.equal(calls[0].opts.credentials,'include');
  assert.equal(calls[0].opts.headers.Authorization,undefined);
  assert.equal(auth.loadToken(),'new-account-token');
  assert.equal(location.hash,'#/watchlist');
});

test('Google cancellation makes no session request and shows a retry route',async()=>{
  globalThis.fetch=async()=>{throw new Error('should not fetch');};
  const root=document.createElement('div');
  await google.mount(root,{query:new URLSearchParams('error=google_cancelled')});
  assert.ok(root.textContent.includes(copy['app.google.cancelled']));
  assert.ok(root.querySelector('a[href="#/login"]'));
});

test('email registration checks confirmation then sends one request and returns to verification',async()=>{
  store.set('token',null);let registrations=0;
  globalThis.fetch=async(url,opts)=>{
    if(url.endsWith('/auth/register')) {registrations++;assert.equal(opts.credentials,'include');return reply({token:'signup-token',email_sent:true});}
    return reply(url.endsWith('/me')?{user_id:15}: {items:[]});
  };
  const root=document.createElement('div');document.body.append(root);await register.mount(root);
  root.querySelector('[name=email]').value='new@example.test';
  root.querySelector('[name=password]').value='test-password';
  root.querySelector('[name=confirm]').value='different-password';
  root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  assert.equal(registrations,0);
  root.querySelector('[name=confirm]').value='test-password';
  root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  for(let i=0;i<20 && location.hash!=='#/profile';i++) await new Promise(r=>setTimeout(r,5));
  assert.equal(registrations,1);assert.equal(location.hash,'#/profile');
  assert.equal(root.querySelector('[name=password]').value,'');
});
