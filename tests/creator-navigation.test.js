import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="en"><body><main id="view"></main></body></html>',{url:'https://ducky.test/app/#/creators?tab=lab&preview=fictional'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {creatorRoute,creatorTarget}=await import('../public/js/app/creator-route.js');
const {safeTarget,rememberTarget,takeTarget}=await import('../public/js/app/login-target.js');
const {mount}=await import('../public/js/app/views/creators.js');
const store=await import('../public/js/app/store.js');
const {filterPosts}=await import('../public/js/app/views/creators.js');
const {researchRows}=await import('../public/js/app/views/creator-research.js');
const tick=()=>new Promise(r=>setImmediate(r));

test('creator research uses private endpoint and does not fall back when Pro expires',async()=>{
  const api=await import('../public/js/app/api.js');const calls=[];
  store.set('me',{tier:'pro'});
  globalThis.fetch=async(url)=>{calls.push(url);return Response.json({error:'pro_required'},{status:402});};
  await assert.rejects(api.kol.feed());
  assert.deepEqual(calls,['/kol/feed']);
  store.set('me',{tier:'free'});calls.length=0;
  globalThis.fetch=async(url)=>{calls.push(url);return Response.json({posts:[],access:'catalog_only'});};
  assert.equal((await api.kol.feed()).access,'catalog_only');
  assert.deepEqual(calls,['/public/kol-feed.json']);
});

test('creator feature links retain only safe public navigation choices through sign-in',()=>{
  const input='#/creators?tab=lab&scope=discover&creator=channel-a&preview=fictional&cash=100&token=SECRET&q=private';
  const expected='#/creators?tab=lab&scope=discover&creator=channel-a&preview=fictional';
  assert.equal(safeTarget(input),expected);
  rememberTarget(input);assert.equal(takeTarget(),expected);
  assert.ok(!window.sessionStorage.getItem('ducky.login-target'));
  assert.equal(creatorTarget(creatorRoute(new URLSearchParams('tab=bad&creator=../../secret&preview=unknown'))),'#/creators');
  assert.equal(safeTarget('#/creators?token=SECRET'),'#/creators');
  for(const screen of ['insider-oversold','institution-oversold']) {
    rememberTarget('#/boards?screen='+screen+'&token=SECRET&email=private');
    assert.equal(takeTarget(),'#/boards?screen='+screen);
  }
  assert.equal(safeTarget('#/boards?screen=https://evil.test'),'#/boards');
  assert.equal(safeTarget('#/creators?ticker=mu&token=SECRET'),'#/creators?scope=discover&ticker=MU');
  assert.equal(safeTarget('#/creators?scope=watchlist'),'#/creators?scope=watchlist');
});

test('stock matching spans creators but is exact, quality-aware and not a directional inference',()=>{
  const ready={quality:'no_call',source:{version:'short-video-v3',kind:'transcript',status:'ready'}};
  const posts=[{kol_id:'unfollowed',title:'Memory industry',tickers:['MU'],summary:ready},
    {kol_id:'followed',title:'Musk interview',tickers:['TSLA'],summary:ready},
    {kol_id:'unverified',title:'MU title only',tickers:['MU']}];
  const selection={following:new Set(['followed']),mine:false,archive:false,tickers:['MU']};
  assert.deepEqual(filterPosts(posts,selection).map(p=>p.kol_id),['unfollowed']);
  assert.equal(filterPosts(posts,{...selection,tickers:[]}).length,0);
  assert.equal(filterPosts(posts,{...selection,archive:true}).length,2);
  assert.equal(posts[0].calls,undefined,'mention filtering must not manufacture a call');
  const studies=[{id:1,revision_id:1,kol_id:'other',calls:[{sym:'MU'},{sym:'TSLA'}]}];
  assert.deepEqual(researchRows(studies,{tickers:['MU']}).map(r=>r.call.sym),['MU']);
});

test('simulation deep links, tab navigation and ranking preserve settings without publishing holdings',async()=>{
  store.set('me',{tier:'pro'});
  const rows=[{kol_id:'eligible',name:'Eligible Creator',eligible:true,rank:1,n:20,rate:55,wrong:9,pending:0,missing:0,repeated:0,flat:0,coverage:100,span_days:100},
    {kol_id:'incomplete',name:'Incomplete Creator',eligible:false,n:2,rate:50,wrong:1,pending:2,missing:1,repeated:3,flat:0,coverage:50,span_days:4}];
  globalThis.fetch=async(url,opts)=>{
    assert.ok(!opts?.method || opts.method==='GET','UI navigation must not create records');
    return Response.json(String(url).includes('/leaderboard')?{rows,as_of:'2026-09-06'}:String(url).includes('/subs')?{subs:[],analysis:{}}:{items:[],kols:[],posts:[]});
  };
  const root=document.querySelector('#view');
  const dispose=await mount(root,{query:new URLSearchParams('tab=lab&preview=fictional')});
  await tick();await tick();
  assert.ok(root.querySelector('.creator-sim-chart'));
  assert.equal(root.querySelector('.creator-intake'),null);
  const capital=root.querySelector('[aria-label="'+copy['app.creatorlab.capital']+'"]');
  capital.value='25000';capital.dispatchEvent(new window.Event('input'));
  assert.equal(location.hash.includes('25000'),false);
  [...root.querySelectorAll('.creator-workspace-tabs button')].find(b=>b.textContent===copy['app.creatorrank.tab']).click();
  await tick();await tick();
  assert.equal(location.hash,'#/creators?tab=rank');
  const collecting=root.querySelector('details.creator-rank-collecting');
  assert.ok(collecting);assert.equal(collecting.open,false);
  assert.ok(collecting.textContent.includes('Incomplete Creator'));
  assert.ok(collecting.textContent.includes('opposite outcomes'));
  assert.equal(root.querySelectorAll('.creator-rank-row').length,2);
  assert.ok(!collecting.textContent.includes('Eligible Creator'));
  [...root.querySelectorAll('.creator-workspace-tabs button')].find(b=>b.textContent===copy['app.creatorlab.tab']).click();
  await tick();await tick();
  assert.equal(root.querySelector('[aria-label="'+copy['app.creatorlab.capital']+'"]').value,'25000');
  assert.equal(location.hash,'#/creators?tab=lab&preview=fictional');
  dispose();
});

test('an exact research point remains shareable through login and language route serialization',()=>{
 const route='#/creators?tab=research&scope=discover&ticker=AVGO&creator=talk&point=claim:accepted';
 const safe=safeTarget(route);
 assert.match(safe,/point=claim%3Aaccepted/);
 assert.equal(creatorRoute(new URLSearchParams(safe.split('?')[1])).point,'claim:accepted');
 assert.ok(!safeTarget(route+'&token=secret').includes('secret'));
});
