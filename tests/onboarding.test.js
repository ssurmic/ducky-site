import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<div id="view"></div><div id="modal" hidden></div>',{url:'https://ducky.test/en/app/#/watchlist',pretendToBeVisual:true});
for(const k of ['window','document','Node','location','history','MutationObserver','requestAnimationFrame','cancelAnimationFrame'])globalThis[k]=typeof dom.window[k]==='function'&&k.endsWith('AnimationFrame')?dom.window[k].bind(dom.window):dom.window[k];
window.DUCKY={BILLING_ENABLED:true,API_BASE:''};document.documentElement.dataset.lang='en';
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {startOnboarding,matchesProgress,stepRoute}=await import('../public/js/app/onboarding.js');
const {tourEvent}=await import('../public/js/app/tour-events.js');
const cache=await import('../public/js/app/read-cache.js');
const next=()=>new Promise(r=>setTimeout(r,25));
const progress=()=>({version:'research-tour-v1',revision:0,status:'new',step:'add',ticker:'NVDA',enabled:true,eligible:true,completed:[],skipped:[],examples:null});
function setup(){
 const calls=[];let p=progress();store.set('token','test');store.set('me',{user_id:11,tier:'pro',onboarding_enabled:true,entitlement:{tier:'pro',capabilities:{research:true}}});
 globalThis.fetch=async(path,opts)=>{
  if(opts.method==='PATCH'){const body=JSON.parse(opts.body);calls.push(body);p={...p,revision:p.revision+1,status:body.action==='pause'?'paused':'active',step:body.action==='complete'?'map':p.step};}
  return Response.json(p);
 };
 const stop=startOnboarding();return{stop,calls};
}
test('effective tier comes from server independently of hidden billing',()=>{
 store.set('me',{tier:'free',access:{billing_enabled:false},entitlement:{tier:'free',capabilities:{research:false}}});assert.equal(store.isPro(),false);assert.equal(store.canResearch(),false);
 store.set('me',{tier:'free',entitlement:{tier:'pro',capabilities:{research:true}}});assert.equal(store.isPro(),true);
});
test('chart, source and video completion require real matching evidence',()=>{
 const p={status:'active',ticker:'AMD',step:'chart'};
 assert.equal(matchesProgress(p,{step:'chart',ticker:'AMD',changed:false,bars:2}),false);
 assert.equal(matchesProgress(p,{step:'chart',ticker:'NVDA',changed:true,bars:2}),false);
 assert.equal(matchesProgress(p,{step:'chart',ticker:'AMD',changed:true,bars:0}),false);
 assert.equal(matchesProgress(p,{step:'chart',ticker:'AMD',changed:true,bars:2}),true);
 p.step='video';p.examples={opinion:{post_id:'one',source_hash:'original'}};
 assert.equal(matchesProgress(p,{step:'video',post:'two',sourceHash:'original',outcome:'external_link_opened'}),false);
 assert.equal(matchesProgress(p,{step:'video',post:'one',sourceHash:'changed',outcome:'video_played'}),false);
 assert.equal(matchesProgress(p,{step:'video',post:'one',sourceHash:'original',outcome:'external_link_opened'}),true);
});
test('pinned source route retains the original stock and source snapshot',()=>{
 const p={ticker:'AMD',step:'opinion',examples:{graph_id:'saved'}};assert.match(stepRoute(p),/NVDA\?tour_snapshot=saved/);assert.equal(p.ticker,'AMD');
 p.step='finish';assert.equal(stepRoute(p),'#/watchlist');
});
test('welcome never performs an action; actual add event advances; exit and cleanup work',async()=>{
 const {calls,stop}=setup();try{
  await next();assert.equal(calls.length,0);
  [...document.querySelectorAll('.tour-card button')].find(b=>b.textContent==='Start tour').click();await next();
  assert.deepEqual(calls.map(c=>c.action),['start']);
  tourEvent('chart',{ticker:'NVDA',changed:true,bars:20});await next();assert.equal(calls.length,1);
  tourEvent('add',{ticker:'NVDA'});await next();assert.equal(calls[1].step,'add');
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}));await next();assert.equal(calls.at(-1).action,'pause');assert.equal(document.querySelector('.tour-card').hidden,true);
 }finally{stop();assert.equal(document.querySelector('.tour-card'),null);}
});
test('expired account cannot read retained in-memory research',()=>{
 store.set('me',{user_id:11,tier:'pro',entitlement:{capabilities:{research:true}}});cache.remember('/evidence/NVDA',{ticker:'NVDA',nodes:[]});assert.ok(cache.peek('/evidence/NVDA'));
 store.set('me',{user_id:11,tier:'free',entitlement:{capabilities:{research:false}}});assert.equal(cache.peek('/evidence/NVDA'),null);
});

test('open-access welcome does not promise a trial and Start opens Watchlist',async()=>{
 location.hash='#/briefing';
 const {stop}=setup();
 try{
  await next();
  const card=document.querySelector('.tour-card');
  assert.match(card.textContent,/Welcome to Ducky/);
  assert.doesNotMatch(card.textContent,/15-day Pro trial|Trial ends/);
  card.querySelector('[data-tour-action="tour.start"]').click();
  await next();assert.equal(location.hash,'#/watchlist');
 }finally{stop();}
});

test('existing accounts only open the tour when they request it',async()=>{
 const p={...progress(),eligible:false};
 store.set('me',{user_id:14,tier:'pro',onboarding_enabled:true,entitlement:{capabilities:{research:true}}});
 globalThis.fetch=async()=>Response.json(p);
 const stop=startOnboarding();
 try{
  await next();assert.equal(document.querySelector('.tour-card').hidden,true);
  document.querySelector('.tour-help').click();assert.equal(document.querySelector('.tour-card').hidden,false);
 }finally{stop();}
});

test('phone instructions stay outside the target at keyboard and landscape heights',async()=>{
 const {tourPlacement}=await import('../public/js/app/onboarding.js');
 for(const width of [320,390,430,844])for(const height of [320,420,844]){
  const r={left:12,right:width-12,top:height*.3,bottom:height*.3+50};
  const p=tourPlacement(r,{width,height},480);
  assert.ok(p.top>=0&&p.top+p.maxHeight<=height+1,JSON.stringify({width,height,p}));
  assert.ok(p.top>=r.bottom||p.top+p.maxHeight<=r.top);
 }
});

test('Escape exits immediately while the server write is pending, then saves pause',async()=>{
 let release;const calls=[];let p=progress();
 store.set('me',{user_id:12,tier:'pro',onboarding_enabled:true,entitlement:{capabilities:{research:true}}});
 globalThis.fetch=async(path,opts)=>{
  if(opts.method==='PATCH'){
   const body=JSON.parse(opts.body);calls.push(body.action);
   if(body.action==='start')await new Promise(resolve=>{release=resolve;});
   p={...p,revision:p.revision+1,status:body.action==='pause'?'paused':'active'};
  }return Response.json(p);
 };
 const stop=startOnboarding();
 try{
  await next();document.querySelector('[data-tour-action="tour.start"]').click();await next();
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}));
  assert.equal(document.querySelector('.tour-card').hidden,true);
  release();await next();await next();assert.deepEqual(calls,['start','pause']);
  tourEvent('add',{ticker:'NVDA'});await next();assert.deepEqual(calls,['start','pause']);
 }finally{stop();}
});
