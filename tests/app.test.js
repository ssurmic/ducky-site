import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
const dom = new JSDOM('<main class="app-main"><div id="view"></div></main><div id="modal" hidden></div>', {url:'https://ducky.test/app/'});
for (const k of ['window','document','Node','MutationObserver','location','history']) globalThis[k] = dom.window[k];
globalThis.requestAnimationFrame = f => setTimeout(f,0);
const strings = document.createElement('script'); strings.id='ducky-strings';
const copy=JSON.parse(readFileSync('i18n/en.json')); strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.appendChild(strings);
const store=await import('../public/js/app/store.js');
const router=await import('../public/js/app/router.js');
const boards=await import('../public/js/app/views/boards.js');
const creators=await import('../public/js/app/views/creators.js');
const login=await import('../public/js/app/views/login.js');
const watch=await import('../public/js/app/views/watchlist.js');
const alerts=await import('../public/js/app/views/alerts.js');
const response = body => new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});

test('economic release names preserve distinctions',()=>{
 assert.equal(boards.waMacroLabel('Nonfarm Productivity',true),'非农生产率');
 assert.equal(boards.waMacroLabel('Continuing Jobless Claims',true),'续请失业金');
 assert.equal(boards.waMacroLabel('ADP Nonfarm Employment Change',true),'小非农 ADP');
 assert.equal(boards.waMacroLabel('Nonfarm Payrolls',false),'Nonfarm payrolls');
});
test('legacy/title-only creator views cannot acquire a grounded badge',()=>{
 assert.equal(creators.hasGroundedCalls({summary:'from title',calls:[{stance:'bear'}]}),false);
 assert.equal(creators.hasGroundedCalls({summary:JSON.stringify({quality:'grounded',source:{kind:'metadata'}}),calls:[{evidence:'a long source excerpt'}]}),false);
 assert.equal(creators.hasGroundedCalls({summary:JSON.stringify({quality:'grounded',source:{kind:'transcript'}}),calls:[{evidence:'a long source excerpt'}]}),true);
});
test('email sign-in neither starts nonce polling nor exposes three forms',async()=>{
 const requests=[]; globalThis.fetch=async(url)=>{requests.push(String(url));return response({google:true});};
 const root=document.createElement('div');document.body.appendChild(root);const cleanup=await login.mount(root);
 assert.deepEqual(requests,["/auth/providers"]); assert.equal(root.querySelector('.pw-form').hidden,false);
 assert.equal(root.querySelector('.invite-form').hidden,true); assert.equal(root.querySelector('.qr-block').hidden,true);
 assert.ok(root.querySelector('label input[type="password"]'));
 assert.equal(root.querySelector('[name="email"]').type,'text');
 assert.ok(root.querySelector('a[href="#/forgot"]'));
 assert.ok(root.querySelector('.invite-form input[type="password"][required]'));
 cleanup();root.remove();
});

test('recovery preserves a reset link across stale sessions, removes its secret and clears old state',async()=>{
 const recovery=await import('../public/js/app/views/recovery.js');
 const auth=await import('../public/js/app/auth.js');
 const secret='x'.repeat(43);
 history.replaceState(null,'','#/reset?token='+secret);
 auth.logout();assert.ok(location.hash.includes(secret));
 let submitted;globalThis.fetch=async(url,opts)=>{submitted=JSON.parse(opts.body);return response({ok:true});};
 const root=document.createElement('div');document.body.appendChild(root);
 const cleanup=await recovery.mount(root,{query:new URLSearchParams('token='+secret)});
 assert.equal(location.hash,'#/reset');assert.ok(!root.textContent.includes(secret));
 store.set('watchlist',['PRIVATE']);store.set('snapshots',{PRIVATE:{spot:1}});
 root.querySelector('[name="password"]').value='new-password';root.querySelector('[name="confirm"]').value='different';
 root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));
 assert.equal(submitted,undefined);
 root.querySelector('[name="confirm"]').value='new-password';
 root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));
 for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,0));
 assert.deepEqual(submitted,{token:secret,password:'new-password'});
 assert.deepEqual(store.get('watchlist'),[]);assert.deepEqual(store.get('snapshots'),{});
 assert.equal(root.querySelector('form').hidden,true);assert.ok(root.textContent.includes(copy['app.recovery.done']));
 cleanup();root.remove();history.replaceState(null,'','#/login');
});

test('unavailable recovery does not claim an email was sent',async()=>{
 const recovery=await import('../public/js/app/views/recovery.js');
 history.replaceState(null,'','#/forgot');
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'recovery_unavailable'}),{status:503,headers:{'content-type':'application/json'}});
 const root=document.createElement('div');const cleanup=await recovery.mount(root);
 root.querySelector('input').value='test@example.test';
 root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));
 for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,0));
 assert.ok(root.textContent.includes(copy['app.recovery.unavailable']));
 assert.ok(!root.textContent.includes(copy['app.recovery.sent']));
 assert.equal(root.querySelector('button').disabled,false);cleanup();
});

test('homepage separates oversold research from the complete legacy method archive',()=>{
 const home=new JSDOM(readFileSync('dist/index.html','utf8')).window.document;
 assert.ok(home.querySelector('#features'));
 assert.equal(home.querySelectorAll('.proof-curve').length,0);
 assert.ok(home.querySelector('.proof-archive a[href="/track-record/"]'));
 const track=new JSDOM(readFileSync('dist/track-record/index.html','utf8')).window.document;
 assert.ok(track.querySelector('details#legacy-simulation #equity'));
 assert.ok(track.querySelector('#ledger'));
});
test('alert deep link prefills ticker and logout discards a late list',async()=>{
 store.set('me',{tier:'pro'});store.set('alerts',[]);
 let resolve;globalThis.fetch=()=>new Promise(r=>resolve=r);
 const root=document.createElement('div');document.body.appendChild(root);
 const pending=alerts.mount(root,{query:new URLSearchParams('ticker=nvda')});
 assert.equal(root.querySelector('input').value,'NVDA');
 assert.equal(root.querySelectorAll('.empty').length,0);
 store.bumpEpoch(); resolve(response({items:[{id:1,ticker:'PRIVATE'}]}));
 const cleanup=await pending;assert.deepEqual(store.get('alerts'),[]);cleanup();root.remove();
});
test('fast route changes keep late calendar results out of the active watchlist',async()=>{
 store.set('me',{tier:'pro'});store.set('watchlist',[]);let calendarResolve;const calendarPending=[];
 globalThis.fetch=async(url)=>{
  if(String(url).includes('calendar'))return new Promise(r=>{calendarResolve=r;calendarPending.push(r);});
  return response({items:[]});
 };
 history.replaceState(null,'','#/calendar');const first=router.render();
 for(let i=0;i<100&&!calendarResolve;i++)await new Promise(r=>setTimeout(r,1));
 assert.ok(calendarResolve);
 history.replaceState(null,'','#/watchlist');await router.render();
 calendarPending.splice(0).forEach(r=>r(response({events:[]})));
 // calendar may also request its static fallback; complete every bounded test request.
 for(let i=0;i<5;i++){await new Promise(r=>setTimeout(r,0));calendarPending.splice(0).forEach(r=>r(response({events:[]})));}
 await first;assert.equal(document.querySelector('#view h1').textContent,copy['app.watch.title']);
});

test('free research view does not fetch or leak a ticker report',async()=>{
 const research=await import('../public/js/app/views/research.js');
 store.set('me',{tier:'free'});let requests=0;
 globalThis.fetch=async()=>{requests++;return response({reports:[]});};
 const root=document.createElement('div');await research.mount(root,{ticker:'AMKR'});
 assert.equal(requests,0);assert.ok(root.querySelector('a[href="#/billing"]'));
 assert.equal(root.textContent.includes('AMKR'),false);
});

test('creator following, quality and search filters compose independently',()=>{
 const posts=[{kol_id:'a',kol_name:'Alpha',title:'NVDA report'}, {kol_id:'b',kol_name:'Beta',title:'NVDA report'}];
 assert.equal(creators.filterPosts(posts,{following:new Set(['a']),mine:true,archive:true}).length,1);
 assert.equal(creators.filterPosts(posts,{following:new Set(['a']),mine:true,archive:false}).length,0);
 assert.equal(creators.filterPosts(posts,{following:new Set(['a']),mine:true,archive:true,query:'Beta'}).length,0);
 assert.equal(creators.filterPosts(posts,{following:new Set(),mine:false,archive:true,query:'Beta'}).length,1);
 assert.ok(creators.videoDate('2026-09-04T18:00:00-04:00','en-US').includes('10:00 PM'));
});

test('radar preserves the delivered body, historical dates and incomplete archive state',async()=>{
 store.set('me',{tier:'pro'});
 globalThis.fetch=async(url)=>{
  if(String(url).includes('radar-history'))return response({items:[{board:'insider',ticker:'TTMI',ts:'2026-08-26T07:42:00Z',summary:{zh:'Historical receipt',en:'Historical receipt'},body:{zh:'Identity not verified',en:'Identity not verified'}}]});
  if(String(url).includes('week-ahead'))return response({});
  return response({items:[{kind:'volscan',ts:'2026-09-04T19:02:00Z',summary:'IV scan',extra:{message_text:'META\nHV252 39%'}},{kind:'insider',ts:'2026-09-04',summary:null}]});
 };
 const root=document.createElement('div');const cleanup=await boards.mount(root,{query:new URLSearchParams()});
 assert.ok(root.textContent.includes('HV252 39%'));
 assert.ok(!root.textContent.includes('2026-08-26'));
 root.querySelector('[data-mode="excerpts"]').click();
 assert.ok(root.textContent.includes('2026-08-26'));
 assert.ok(root.textContent.includes('Identity not verified'));
 assert.ok(root.querySelector('use[href="#ducky-icon-insider"]'));
 const button=root.querySelector('.radar-record-toggle');assert.equal(button.getAttribute('aria-expanded'),'false');button.click();assert.equal(button.getAttribute('aria-expanded'),'true');cleanup();history.replaceState(null,'','#/boards');
});
test('both app shells carry every navigation icon locally, including briefing and More',()=>{
 for(const lang of ['', 'en/']) {
  const html=readFileSync(`dist/${lang}app/index.html`,'utf8');const page=new JSDOM(html).window.document;
  const links=[...page.querySelectorAll('.app-nav a')];
  assert.equal(new Set(links.map(a=>a.dataset.route)).size,9);
  assert.equal(page.querySelectorAll('.nav-more-panel a').length,5);
  for(const a of links){assert.ok(a.textContent.trim());assert.ok(a.querySelector('svg[aria-hidden="true"] use'));}
  for(const use of page.querySelectorAll('.app-nav use')) {
   const ref=use.getAttribute('href');
   assert.ok(ref.startsWith('#ducky-icon-'),'navigation must not depend on an external sprite cache');
   const target=page.getElementById(ref.slice(1));
   assert.ok(target?.querySelector('path,rect,circle,line,polyline,polygon,ellipse'),ref);
   assert.equal(page.querySelectorAll(`[id="${ref.slice(1)}"]`).length,1);
  }
  assert.ok(page.querySelector('.app-nav [data-route="briefing"] use[href="#ducky-icon-briefing"]'));
  assert.ok(page.querySelector('.nav-more summary'));
 }
});

test('snapshot browser cache preserves provenance and expires after one minute',async()=>{
 const {unpackSnapshot,reusableSnapshot}=await import('../public/js/app/snapshot-model.js');
 const snap=unpackSnapshot({snapshot:{ok:true,spot:123},built_at:'2026-09-04T20:00:00Z'},1000);
 assert.equal(snap.built_at,'2026-09-04T20:00:00Z');
 assert.equal(reusableSnapshot(snap,60999),true);assert.equal(reusableSnapshot(snap,61000),false);
 assert.equal(reusableSnapshot(snap,0),false);assert.equal(reusableSnapshot({ok:true}),false);
});

test('long-running alert setup keeps polling with bounded backoff until ready',async()=>{
 const oldTimer=globalThis.setTimeout;const oldClear=globalThis.clearTimeout;
 const pending=[];let calls=0, timerId=0;const cancelled=new Set();
 globalThis.setTimeout=(fn,ms)=>{const id=++timerId;pending.push({fn,ms,id});return id;};globalThis.clearTimeout=id=>cancelled.add(id);
 globalThis.fetch=async url=>String(url).endsWith('/alerts')?response({items:[{id:42,ticker:'NVDA',condition_nl:'RSI below 10',compile_state:++calls>=7?'done':'pending'}]}):response({items:[],evaluation_enabled:true});
 store.set('alerts',[]);store.set('me',{tier:'pro'});const root=document.createElement('div');
 let cleanup;
 try {
  cleanup=await alerts.mount(root);
  for(let i=0;i<6;i++){
   while(pending.length&&cancelled.has(pending[0].id))pending.shift();
   const task=pending.shift();assert.ok(task,'polling stopped before the alert was ready');assert.ok(task.ms<=60000);task.fn();
   for(let n=0;n<20;n++)await Promise.resolve();
  }
  assert.equal(calls,7);assert.equal(store.get('alerts')[0].state,'done');assert.equal(pending.filter(t=>!cancelled.has(t.id)).length,0);
 }finally{cleanup?.();globalThis.setTimeout=oldTimer;globalThis.clearTimeout=oldClear;}
});

test('creator search keeps the input mounted and archives never show unsupported claims',async()=>{
 globalThis.fetch=async(url)=>String(url).includes('/subs')?response({subs:['creator-a']}):response({kols:[{id:'creator-a',name:'Wall Street'}],posts:[{kol_id:'creator-a',kol_name:'Wall Street',title:'Memory report',published_at:'2026-09-04T20:02:00Z',tickers:['WRONG'],summary:'UNSUPPORTED CLAIM'}],subs:['creator-a']});
 store.set('me',{tier:'pro'});const root=document.createElement('div');const dispose=await creators.mount(root);
 const search=root.querySelector('[role="combobox"]');search.value='Wall Street';search.dispatchEvent(new window.Event('input'));
 assert.equal(root.querySelector('[role="combobox"]'),search);assert.equal(search.value,'Wall Street');
 root.querySelector('.creator-name').click();
 const archive=[...root.querySelectorAll('button')].find(b=>b.textContent===copy['app.creators.show_archive']);archive.click();
 assert.ok(root.textContent.includes('Memory report'));assert.equal(root.textContent.includes('UNSUPPORTED CLAIM'),false);assert.equal(root.textContent.includes('$WRONG'),false);dispose();
});

test('short video summaries without stock calls are readable but never directional',()=>{
 const post={kol_id:'x',summary:{quality:'no_call',source:{kind:'transcript',version:'short-video-v2',status:'ready'}},calls:[]};
 assert.equal(creators.hasReviewedSummary(post),true);assert.equal(creators.hasGroundedCalls(post),false);
 assert.equal(creators.filterPosts([post],{following:new Set(['x']),mine:true,archive:false}).length,1);
});
test('homepage research retains both benchmarks and the failed validation period',()=>{
 const page=new JSDOM(readFileSync('dist/en/index.html','utf8')).window.document;
 const study=page.querySelector('.oversold-study');assert.ok(study);
 assert.equal(study.querySelectorAll('.os-line').length,3);
 assert.ok(study.textContent.includes('-40.1%'));
 assert.ok(study.textContent.includes('Historical IV/HV'));
 const data=JSON.parse(readFileSync('public/oversold-research.json'));
 assert.equal(data.mode,'BACKTEST');assert.equal(Object.keys(data.comparisons).length,3);
});
