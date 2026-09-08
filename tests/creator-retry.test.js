import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="en" data-lang="en"><body><main id="view"></main></body></html>',{url:'https://ducky.test/app/#/creators?scope=discover&creator=talk&post=abcdefghijk&point=claim%3A123'});
for(const k of ['window','document','Node','location','history'])globalThis[k]=dom.window[k];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const block=document.createElement('script');block.id='ducky-strings';block.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(block);
const {mount}=await import('../public/js/app/views/creators.js');
const router=await import('../public/js/app/router.js');
const store=await import('../public/js/app/store.js');
const tick=()=>new Promise(r=>setImmediate(r));

test('a failed creator read retries the same source route with GETs and does not start analysis',async()=>{
  store.set('me',{tier:'pro'});let fail=true;const requests=[];
  globalThis.fetch=async(url,opts)=>{
    requests.push([url,opts.method]);
    if(url==='/kol/feed'&&fail)return Response.json({detail:'unavailable'},{status:503});
    return Response.json(url==='/kol/feed'?{kols:[{id:'talk',name:'Talk',profile:{}}],posts:[],pages:{talk:{coverage:{indexed:0}}}}:url==='/me/kols'?{subs:['talk'],analysis:{}}:{items:[]});
  };
  const target=location.hash;await router.render();
  const retry=document.querySelector('.creators-view button');
  assert.equal(retry.textContent,copy['app.common.retry']);
  assert.equal(document.querySelector('[role=alert]').textContent,copy['app.creators.load_error']);
  fail=false;retry.click();retry.click();
  for(let i=0;i<8;i++)await tick();
  assert.equal(location.hash,target);
  assert.equal(requests.filter(([url])=>url==='/kol/feed').length,2);
  assert.ok(requests.some(([url])=>url==='/kol/talk/posts/abcdefghijk'));
  assert.equal(document.querySelector('.creators-view [role=alert]'),null);
  assert.ok(document.querySelector('.creators-view').textContent.includes('Talk'));
  assert.ok(requests.every(([,method])=>method==='GET'));
  history.replaceState(null,'','#/login');store.set('me',null);await router.render();
});

test('a failed read from an aborted route does not leave a retry control on an old page',async()=>{
  store.set('me',{tier:'pro'});
  const root=document.createElement('section');document.body.append(root);const controller=new AbortController();
  let reject;globalThis.fetch=(url)=>url==='/kol/feed'?new Promise((_,r)=>reject=r):Promise.resolve(Response.json({items:[]}));
  const pending=mount(root,{signal:controller.signal});controller.abort();reject(new Error('connection lost'));await pending;
  assert.equal(root.querySelector('[role=alert]'),null);assert.equal(root.querySelector('button'),null);root.remove();
});
