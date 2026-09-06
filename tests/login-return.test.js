import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const dom = new JSDOM('<main class="app-main"><div id="view"></div></main>', {url:'https://ducky.test/app/#/creators'});
for (const key of ['window','document','Node','MutationObserver','location','history']) globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);
const strings=document.createElement('script'); strings.id='ducky-strings';
const copy=JSON.parse(readFileSync('i18n/en.json'));
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));
document.body.append(strings);
const target=await import('../public/js/app/login-target.js');
const reply=body=>new Response(JSON.stringify(body), {headers:{'content-type':'application/json'}});
const waitFor=async predicate=>{for(let i=0;i<200&&!predicate();i++)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(predicate());};

test('only canonical internal routes survive login; credentials and external destinations do not',()=>{
  for(const value of ['https://evil.test','//evil.test','#//evil.test','#/reset?token=secret','#/oauth','#/login','#/research/../../profile','#/chart/%2F%2Fevil.test','#/creators/extra']) assert.equal(target.safeTarget(value),null,value);
  assert.equal(target.safeTarget('#/chart/brk-b?token=secret'),'#/chart/BRK-B');
  assert.equal(target.safeTarget('#/boards?ticker=nvda&mode=archive&token=secret'),'#/boards?mode=archive&ticker=NVDA');
  assert.equal(target.safeTarget('#/calendar?ticker=orcl&token=secret'),'#/calendar?ticker=ORCL');
  assert.equal(target.safeTarget('#/alerts?ticker=mu&amount=999'),'#/alerts?ticker=MU');
  assert.equal(target.safeTarget('#/briefing?period=weekly&token=secret'),'#/briefing?period=weekly');
  target.rememberTarget('#/creators?token=secret');
  assert.ok(!window.sessionStorage.getItem('ducky.login-target').includes('secret'));
  assert.equal(target.takeTarget(),'#/creators');
  assert.equal(target.takeTarget(),'#/watchlist');
});

test('expired, malformed, future-dated or modified return state falls back safely',()=>{
  for(const value of ['not-json',JSON.stringify({target:'https://evil.test',at:Date.now()}),JSON.stringify({target:'#/billing',at:Date.now()-21*60000}),JSON.stringify({target:'#/billing',at:Date.now()+60000})]){
    window.sessionStorage.setItem('ducky.login-target',value);
    assert.equal(target.takeTarget(),'#/watchlist');
    assert.equal(window.sessionStorage.getItem('ducky.login-target'),null);
  }
  const original=Object.getOwnPropertyDescriptor(window,'sessionStorage');
  Object.defineProperty(window,'sessionStorage',{configurable:true,get(){throw new Error('storage disabled');}});
  assert.doesNotThrow(()=>target.rememberTarget('#/creators'));
  assert.equal(target.takeTarget(),'#/watchlist');
  Object.defineProperty(window,'sessionStorage',original);
});

test('homepage creator link survives boot, password login and destination rendering',async()=>{
  globalThis.fetch=async(url,options)=>{
    if(url.endsWith('/auth/providers'))return reply({google:true});
    if(url.endsWith('/auth/password'))return reply({token:'test-token'});
    if(url.endsWith('/me'))return reply({user_id:12,tier:'free'});
    return reply({items:[],kols:[],posts:[]});
  };
  await import('../public/js/app/main.js');
  await waitFor(()=>document.body.classList.contains('ready'));
  assert.equal(location.hash,'#/login');
  document.querySelector('.pw-form [name=email]').value='test@example.test';
  document.querySelector('.pw-form [name=password]').value='test-password';
  document.querySelector('.pw-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  await waitFor(()=>document.body.dataset.route==='creators');
  assert.equal(location.hash,'#/creators');
  assert.equal(window.sessionStorage.getItem('ducky.login-target'),null);
});

test('Google round trip returns to the requested chart; explicit linking still returns to profile',async()=>{
  const google=await import('../public/js/app/views/google.js');
  const store=await import('../public/js/app/store.js');
  store.set('me',null);
  globalThis.fetch=async url=>reply(url.endsWith('/auth/session')?{token:'google-test-token'}:url.endsWith('/me')?{user_id:12,tier:'free'}:{items:[]});
  target.rememberTarget('#/chart/NVDA');
  history.replaceState(null,'','#/oauth');
  await google.mount(document.createElement('div'));
  assert.equal(location.hash,'#/chart/NVDA');
  target.rememberTarget('#/creators');
  await google.mount(document.createElement('div'),{query:new URLSearchParams('linked=1')});
  assert.equal(location.hash,'#/profile');
  assert.equal(target.takeTarget(),'#/watchlist');
});

test('new email or invite account can verify its email before continuing to its requested page',()=>{
  target.rememberTarget('#/research/AMKR');
  assert.equal(target.verificationTarget(),'#/profile?next=research%2FAMKR');
  assert.equal(target.verificationTarget(),'#/profile');
});
