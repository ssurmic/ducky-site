import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="zh"><body></body></html>',{url:'https://ducky.test/app/#/creators'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=fn=>fn();
const copy=JSON.parse(readFileSync('i18n/zh.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount}=await import('../public/js/app/views/creators.js');
const tick=()=>new Promise(r=>setImmediate(r));
const candidate={channel_id:'UCqK8Ddg4g_n3UTVVIPIGzkA',name:'卓野聊美股',url:'https://www.youtube.com/@Joey-SMC',recent:[],profile:{}};
const post=(id,tk)=>({id,kol_id:'known',kol_name:'Other Creator',title:'Recorded source '+tk,tickers:[tk],calls:[],
  published_at:'2026-09-07T00:00:00Z',summary:{quality:'no_call',zh:'博主讨论业务。',source:{kind:'transcript',status:'ready',summary_reviewed:true}},
  url:'https://www.youtube.com/watch?v=abcdefghijk'});

test('Chinese name lookup finds a channel with no summaries and never applies watchlist filtering',async()=>{
  store.set('me',{tier:'pro',user_id:1});const calls=[];
  globalThis.fetch=async(url,options)=>{
    calls.push([url,options]);
    if(url==='/kol/feed')return Response.json({kols:[{id:'known',name:'Other Creator',profile:{}}],posts:[]});
    if(url==='/me/kols')return Response.json({subs:[],analysis:{}});
    if(url==='/watchlist')return Response.json({items:[{ticker:'NVDA'}]});
    if(url==='/kol/lookups')return Response.json({items:[]});
    if(url.startsWith('/kol/suggest'))return Response.json({items:[candidate]});
    if(url==='/kol/resolve'){
      assert.equal(JSON.parse(options.body).input,'卓野聊美股');
      return Response.json({id:'lookup',status:'ready',candidates:[candidate]});
    }
    assert.fail(url);
  };
  const root=document.createElement('main');document.body.append(root);
  const dispose=await mount(root,{query:new URLSearchParams('scope=watchlist&ticker=NVDA')});await tick();
  assert.equal(root.querySelector('.creator-stock-filter'),null);
  assert.ok(!root.textContent.includes(copy['app.creatorstocks.watchlist']));
  assert.equal(root.querySelectorAll('input').length,1);
  const field=root.querySelector('[role=combobox]');field.value='卓野聊美股';field.dispatchEvent(new window.Event('input'));
  field.dispatchEvent(new window.Event('focus'));await tick();
  assert.ok(root.querySelector('[role=listbox]').textContent.includes(candidate.name));
  assert.equal(root.querySelector('.creator-recent-feed'),null,'empty summaries must not masquerade as no matching creator');
  root.querySelector('.creator-find-form').dispatchEvent(new window.Event('submit',{cancelable:true}));await tick();
  assert.ok(root.querySelector('.creator-find-results').textContent.includes(candidate.name));
  assert.ok(calls.some(([url,options])=>url==='/kol/resolve'&&options.method==='POST'));
  assert.ok(!calls.some(([url])=>url.endsWith('/sub')||url.endsWith('/confirm')),'finding a person must not follow automatically');
  dispose();root.remove();
});

test('creator feed retains unrelated posts and marks watched stocks only on reviewed content',async()=>{
  store.set('me',{tier:'pro',user_id:1});
  globalThis.fetch=async url=>Response.json(url==='/kol/feed'?{kols:[{id:'known',name:'Other Creator',profile:{}}],posts:[post(1,'NVDA'),post(2,'TSLA')]}:
    url==='/me/kols'?{subs:['known'],analysis:{}}:url==='/watchlist'?{items:[{ticker:'NVDA'}]}:{items:[]});
  const root=document.createElement('main');document.body.append(root);
  const dispose=await mount(root,{query:new URLSearchParams('scope=watchlist&ticker=NVDA')});await tick();
  assert.equal(root.querySelectorAll('.cr-post').length,2);
  assert.equal(root.querySelectorAll('.creator-watch-match').length,1);
  assert.ok(root.querySelector('.creator-watch-match').textContent.includes('NVDA'));
  assert.ok(root.querySelector('.creator-directory').textContent.includes('Other Creator'));
  dispose();root.remove();
});

test('restored lookup keeps the visible name and discovery results in sync without replacing Following',async()=>{
 store.set('me',{tier:'pro',user_id:1});const calls=[];
 globalThis.fetch=async url=>{calls.push(url);return Response.json(url==='/kol/feed'?{kols:[{id:'known',name:'Other Creator',profile:{}}],posts:[post(1,'NVDA')]}:
  url==='/me/kols'?{subs:['known'],analysis:{}}:url==='/watchlist'?{items:[]}:
  url==='/kol/lookups'?{items:[{id:'old',input:candidate.name,status:'ready',candidates:[candidate]}]}:{items:[]});};
 const root=document.createElement('main');document.body.append(root);
 const dispose=await mount(root,{query:new URLSearchParams('scope=following')});await tick();
 assert.equal(root.querySelector('[role=combobox]').value,'');assert.equal(root.querySelectorAll('.cr-post').length,1);
 assert.ok(!calls.includes('/kol/lookups'));
 root.querySelector('[data-creator-scope="discover"]').click();await tick();
 assert.equal(root.querySelector('[role=combobox]').value,candidate.name);
 assert.equal(root.querySelector('[data-creator-scope="discover"]').getAttribute('aria-pressed'),'true');
 assert.equal(root.querySelector('.creator-recent-feed'),null);
 assert.ok(root.querySelector('.creator-find-results').textContent.includes(candidate.name));
 dispose();root.remove();
});
