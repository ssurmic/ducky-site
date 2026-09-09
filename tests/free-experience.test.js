import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body><div id="modal" hidden></div></body></html>',{url:'http://localhost/app/#/evidence/AVGO'});
for(const k of ['window','document','Node','location','history'])globalThis[k]=dom.window[k];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount}=await import('../public/js/app/views/evidence.js');
const {upsell,closeModal}=await import('../public/js/app/ui.js');
const {freeGuide}=await import('../public/js/app/experience.js');
const {exampleMap}=await import('../public/js/app/evidence-examples.js');
const {safeTarget}=await import('../public/js/app/login-target.js');
const response=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});
const me=()=>({tier:'free',watch_cap:5,alert_cap:3,experience:{watches:{cap:5},alerts:{cap:3},evidence:{cap:3,selected:[]},creators:{cap:2}}});
const tick=()=>new Promise(r=>setTimeout(r,0));

test('free guide exposes actions and actual server caps; paid users keep their workspace',()=>{
 store.set('me',me());const guide=freeGuide();assert.equal(guide.querySelectorAll('.free-guide-links a').length,4);
 assert.match(guide.textContent,/5 watched stocks/);assert.match(guide.textContent,/Research 3 stocks/);assert.match(guide.textContent,/2 creators/);
 store.set('me',{tier:'pro'});assert.equal(freeGuide(),null);
});
test('watchlist limit names the correct feature and keeps the free path available',()=>{
 store.set('me',me());upsell({error:'watch_limit',feature:'watches',cap:5,tier:'free'});
 const box=document.querySelector('.modal-box');assert.match(box.textContent,/5 watched stocks/);
 assert.ok(!box.textContent.includes('5 custom alerts'));assert.match(box.textContent,/Keep using Free/);
 box.querySelector('.modal-actions a').click();assert.equal(document.querySelector('#modal').hidden,true);
});
test('historical examples retain losses and never read current private reports',async()=>{
 store.set('me',me());let calls=[];globalThis.fetch=async url=>{calls.push(url);return response({selected:[],cap:3});};
 const root=document.createElement('div');document.body.append(root);
 const stop=await mount(root,{query:new URLSearchParams({example:'GLW'})});
 assert.deepEqual(calls,['/me/evidence']);assert.equal(root.querySelectorAll('.evidence-node').length,3);
 assert.match(root.textContent,/-15.02%/);assert.match(root.textContent,/-51.48%/);
 assert.match(root.textContent,/Historical example/);assert.ok(!root.textContent.includes('AI point of view'));
 assert.equal(safeTarget('#/evidence?example=GLW&token=secret'),'#/evidence?example=GLW');stop();root.remove();
 const original=JSON.parse(readFileSync('public/media/ducky-demo-cases-2026-09-07.json'));
 for(const t of ['NOK','GLW','HOOD']){
   const node=exampleMap(t).nodes[2],c=original.cases[t.toLowerCase()];
   assert.match(node.title.en,new RegExp((c.whole_path||c.after_disclosure_20).max_close_drawdown_pct.toFixed(2)));
 }
});
test('a chosen free map stays locked until explicit save; unavailable data costs no slot',async()=>{
 store.set('me',me());let saved=false,ready=false,calls=[];
 globalThis.fetch=async(url,opts)=>{
  calls.push([url,opts.method]);
  if(url==='/me/evidence')return response({selected:[],cap:3});
  if(url==='/me/evidence/AVGO'){saved=ready;return response({status:ready?'ready':'unavailable',selected:ready?['AVGO']:[]});}
  if(url==='/evidence/AVGO'){assert.ok(saved);return response({ticker:'AVGO',nodes:[{id:'one',title:{en:'Saved evidence'},stance:'context',evidence:[]}],status:'ready'});}
  throw Error('Unexpected request '+url);
 };
 const root=document.createElement('div');document.body.append(root);const stop=await mount(root,{ticker:'AVGO'});
 assert.deepEqual(calls,[['/me/evidence','GET']]);
 root.querySelector('.card .btn-primary').click();await tick();assert.match(root.textContent,/No slot was used/);
 assert.ok(!calls.some(([u])=>u==='/evidence/AVGO'));
 ready=true;root.querySelector('.card .btn-primary').click();await tick();await tick();
 assert.match(root.textContent,/Research stocks 1 \/ 3/);assert.match(root.textContent,/Saved evidence/);
 assert.equal(root.querySelectorAll('.evidence-node').length,1);
 assert.ok(root.querySelector('a[href="#/billing"]').textContent);stop();root.remove();closeModal();
});


test('Pro watchlist has no free guide or placeholder text',async()=>{
 store.set('me',{tier:'pro',watch_cap:50});store.set('watchlist',[]);
 globalThis.fetch=async()=>response({items:[],cap:50,overview:{items:[]}});
 const {mount:watch}=await import('../public/js/app/views/watchlist.js');
 const root=document.createElement('div');document.body.append(root);const stop=await watch(root);
 assert.equal(root.querySelector('.free-guide'),null);assert.ok(!root.textContent.includes('null'));
 assert.match(root.textContent,/0\/50/);stop();root.remove();
});

test('unselected creator content is unavailable, never falsely reported as no summaries',async()=>{
 store.set('me',me());
 globalThis.fetch=async url=>response(String(url).includes('/trial-feed')?{kols:[{id:'one',name:'One',platform:'youtube'}],posts:[],pages:{}}:String(url).includes('/me/kols')?{subs:[],cap:2}:{items:[]});
 const {mount:creators}=await import('../public/js/app/views/creators.js');
 const root=document.createElement('div');document.body.append(root);const stop=await creators(root,{query:new URLSearchParams('scope=discover')});
 assert.match(root.textContent,/Follow for full summaries/);
 assert.ok(!root.textContent.includes(copy['app.creatorpage.no_summary']));
 root.querySelector('.creator-name').click();
 assert.equal(root.querySelector('.creator-overview'),null);
 assert.equal(root.querySelector('.creator-video-archive'),null);
 assert.ok(!root.textContent.includes(copy['app.creatorpage.no_summary']));stop();root.remove();
});

test('default Free map opens the selected stock, and removing it revokes the local research access',async()=>{
 store.set('me',{...me(),experience:{...me().experience,evidence:{cap:3,selected:['VST']}}});store.set('watchlist',['VST']);
 let selected=['VST'],calls=[];
 globalThis.fetch=async(url,opts)=>{
  calls.push(String(url));
  if(url==='/me/evidence')return response({selected,cap:3});
  if(url==='/me/evidence/VST'&&opts.method==='DELETE'){selected=[];return response({selected});}
  if(url==='/evidence/VST')return response({ticker:'VST',status:'ready',nodes:[]});
  throw Error('Unexpected '+url);
 };
 const root=document.createElement('div');document.body.append(root);const stop=await mount(root,{});
 try{
  assert.ok(calls.includes('/evidence/VST'));assert.doesNotMatch(root.textContent,/Historical example:|GLW.*Historical/);
  assert.equal(root.querySelector('.evidence-examples').open,false);
  root.querySelector('.evidence-selection button').click();await tick();await tick();
  assert.deepEqual(store.get('me').experience.evidence.selected,[]);
  assert.match(root.textContent,/Choose a stock to research/);
 }finally{stop();root.remove();}
});

test('Discovery keeps stance, timestamped source and missing English explicit',async()=>{
 const {discoveryPreview}=await import('../public/js/app/views/creator-discovery.js');
 const view={ticker:'NVDA',stance:'counter',text:{en:'Margins may weaken.',zh:'利润率可能下降。'},published_at:'2026-08-01T12:00:00Z',
  source_url:'https://www.youtube.com/watch?v=fixture&t=123s',condition_text:'If demand slows.',conditional:true};
 const card=discoveryPreview({latest_view:view,coverage:{scan_limited:false}});
 assert.match(card.textContent,/Bearish.*NVDA/);assert.match(card.textContent,/Margins may weaken/);assert.match(card.textContent,/If demand slows/);
 assert.ok(card.querySelector('a').href.endsWith('t=123s'));
 const missing=discoveryPreview({latest_view:{...view,text:{zh:'不能当成英文'},condition_text:null}});
 assert.match(missing.textContent,/English version is not available/);assert.doesNotMatch(missing.textContent,/不能当成英文/);
});
