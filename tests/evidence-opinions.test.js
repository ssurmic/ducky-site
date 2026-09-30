import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {opinionFixture,opinionsFixture} from './fixtures/qa-creator-opinions.js';
const dom=new JSDOM('<html lang="en" data-lang="en"><body class="page-app"><main></main><div id="modal"></div></body></html>',{url:'https://ducky.test/en/app/',pretendToBeVisual:true});
for(const key of ['window','document','location','history','localStorage','CustomEvent','Event','HTMLElement','Node'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=callback=>setTimeout(callback,0);
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const stock=await import('../public/js/app/views/stock.js');
const evidence=await import('../public/js/app/views/evidence.js');
const {closeModal}=await import('../public/js/app/ui.js');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setTimeout(resolve,0));};
const graph={ticker:'NVDA',nodes:[{id:'legacy',kind:'creator',stance:'support',title:{en:'Retained transcript claim',zh:'保留的字幕观点'},
 evidence:[{id:'legacy-source',kind:'creator',author:'Transcript author',source_url:'https://example.com/retained',published_at:'2026-09-20',observed_at:'2026-09-21T12:00:00Z'}]}],analysis_status:'pending'};
function setup(){
 closeModal();store.bumpEpoch();store.set('me',{user_id:42,tier:'pro'});store.set('token','synthetic');store.set('watchlist',[]);
 const root=document.querySelector('main');root.replaceChildren();root.className='';
 let reply=opinionsFixture({ticker:'NVDA'});const calls=[];
 globalThis.fetch=async(path,options)=>{
  const url=new URL(path,'https://ducky.test');calls.push({url,options});
  if(url.pathname==='/kol/opinions')return reply instanceof Promise?reply:reply instanceof Response?reply:Response.json(reply);
  if(url.pathname==='/bars/NVDA')return Response.json({bars:[]});
  if(url.pathname==='/stock-research/NVDA')return Response.json({ticker:'NVDA',evidence:graph,price:null});
  if(url.pathname==='/evidence/NVDA/history')return Response.json({items:[{id:'old-map',recorded_at:'2026-09-20T12:00:00Z'}],next_cursor:null});
  if(url.pathname==='/evidence/NVDA')return Response.json(graph);
  throw new Error('Unexpected fixture route '+url.pathname);
 };
 return {root,calls,setReply:value=>reply=value};
}
async function mount(kind,root){return kind==='stock'?stock.mount(root,{ticker:'NVDA',query:new URLSearchParams('tab=evidence&from=explore')}):evidence.mount(root,{ticker:'NVDA'});}

for(const kind of ['stock','standalone'])test(kind+' map exposes exact stock video views, full sources and keyboard return without altering evidence counts',async()=>{
 const f=setup(),dispose=await mount(kind,f.root);await flush();
 try{
  const requests=f.calls.filter(c=>c.url.pathname==='/kol/opinions');assert.equal(requests.length,1);
  assert.equal(requests[0].url.searchParams.get('ticker'),'NVDA');assert.equal(requests[0].url.searchParams.get('scope'),'discover');assert.equal(requests[0].url.searchParams.has('creator'),false);
  assert.ok(f.calls.every(c=>c.options.method==='GET'));assert.deepEqual(store.get('watchlist'),[]);
  const section=f.root.querySelector('.creator-opinions'),heading=section.querySelector('h2');assert.equal(heading.textContent,'Video views on NVDA');
  assert.equal(section.querySelectorAll('.opinion-preview-card').length,2);assert.equal(f.root.querySelectorAll('.evidence-node').length,1);
  assert.deepEqual([...section.querySelectorAll('.opinion-preview-author')].map(n=>n.textContent),['Sample Research','Sample Research']);
  assert.match(section.querySelector('.opinion-preview-card.is-bull').textContent,/customer budgets/);assert.match(section.querySelector('.opinion-preview-card.is-bear').textContent,/Margin risk/);
  let scrolled=false;heading.scrollIntoView=()=>scrolled=true;f.root.querySelector('[data-map-video-views]').click();assert.ok(scrolled);assert.equal(document.activeElement,heading);
  const opener=section.querySelector('.opinion-preview-open');opener.focus();opener.click();
  const dialog=document.querySelector('[data-opinion-dialog]');assert.ok(dialog);assert.match(dialog.textContent,/If funding costs decline/);assert.match(dialog.textContent,/Next quarter/);
  assert.equal(dialog.querySelector('.opinion-original').href,'https://www.youtube.com/watch?v=sample00003&t=32s');assert.match(dialog.querySelector('.opinion-original').textContent,/about 0:32/);
  dialog.querySelector('details').open=true;assert.match(dialog.textContent,/Source recorded/);closeModal();assert.equal(document.activeElement,opener);
 }finally{dispose();}
});

test('stock graph refresh retains native source disclosure and does not refetch its independent reader',async()=>{
 const f=setup(),dispose=await mount('stock',f.root);await flush();
 try{
  const opener=f.root.querySelector('.opinion-preview-open');opener.focus();opener.click();const dialog=document.querySelector('[data-opinion-dialog]');dialog.querySelector('details').open=true;
  const update={path:'/stock-research/NVDA',value:{ticker:'NVDA',evidence:{...graph,checked_at:'2026-09-29T12:00:00Z'},price:null}};
  f.root.dispatchEvent(new CustomEvent('ducky:shared-read',{detail:update}));await flush();
  assert.equal(update.accepted,true);assert.equal(document.querySelector('[data-opinion-dialog]'),dialog);assert.ok(dialog.querySelector('details').open);
  assert.equal(f.calls.filter(c=>c.url.pathname==='/kol/opinions').length,1);closeModal();assert.equal(document.activeElement,opener);
 }finally{dispose();}
});

test('source denial clears native views and its modal while retained transcript evidence remains',async()=>{
 const f=setup(),dispose=await mount('standalone',f.root);await flush();
 try{
  f.root.querySelector('.opinion-preview-open').click();assert.ok(document.querySelector('[data-opinion-dialog]'));
  f.setReply(Response.json({error:'forbidden'},{status:403}));f.root.querySelector('.creator-opinions-heading button').click();await flush();
  assert.equal(document.querySelector('[data-opinion-dialog]'),null);assert.equal(f.root.querySelector('.opinion-preview-card'),null);
  assert.match(f.root.querySelector('.creator-opinions').textContent,/unavailable/);assert.match(f.root.querySelector('.evidence-node').textContent,/Retained transcript claim/);
 }finally{dispose();}
});

test('historical map versions and examples never receive current video views',async()=>{
 const f=setup(),dispose=await mount('standalone',f.root);await flush();
 try{
  [...f.root.querySelectorAll('.evidence-links button')].find(b=>b.textContent==='Map history').click();await flush();
  f.root.querySelector('.evidence-history button').click();await flush();
  assert.equal(f.root.querySelector('.creator-opinions'),null);assert.equal(f.root.querySelector('[data-map-video-views]'),null);
  assert.equal(f.calls.filter(c=>c.url.pathname==='/kol/opinions').length,1);
 }finally{dispose();}
 const next=setup(),archive=await evidence.mount(next.root,{ticker:'NVDA',query:new URLSearchParams('tour_snapshot=old-map')});await flush();
 assert.equal(next.calls.some(c=>c.url.pathname==='/kol/opinions'),false);archive();
 const sample=setup(),example=await evidence.mount(sample.root,{query:new URLSearchParams('example=NOK')});await flush();
 assert.equal(sample.calls.some(c=>c.url.pathname==='/kol/opinions'),false);example();
});

test('wrong-ticker responses fail closed and leaving the map aborts late native reads',async()=>{
 const f=setup();f.setReply(opinionsFixture({items:[opinionFixture(1)]}));const dispose=await mount('stock',f.root);await flush();
 assert.equal(f.root.querySelector('.opinion-preview-card'),null);assert.match(f.root.querySelector('.creator-opinions').textContent,/unavailable/);dispose();
 const next=setup();let resolve;next.setReply(new Promise(done=>resolve=done));const stop=await mount('standalone',next.root);
 const request=next.calls.find(c=>c.url.pathname==='/kol/opinions');stop();assert.equal(request.options.signal.aborted,true);
 resolve(Response.json(opinionsFixture({ticker:'NVDA'})));await flush();assert.equal(next.root.querySelector('.creator-opinions'),null);
});
