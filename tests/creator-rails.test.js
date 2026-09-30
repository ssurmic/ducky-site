import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {opinionFixture,opinionsFixture} from './fixtures/qa-creator-opinions.js';

const dom=new JSDOM('<html lang="en" data-lang="en"><body class="page-app"><main></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/en/app/#/creators',pretendToBeVisual:true});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=fn=>{fn();return 0;};
window.HTMLElement.prototype.scrollIntoView=function(){};
window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const {creatorRail}=await import('../public/js/app/creator-rail.js');
const {mountCreatorOpinions}=await import('../public/js/app/creator-opinions.js');
const {discoveryPreview}=await import('../public/js/app/views/creator-discovery.js');
const {mount}=await import('../public/js/app/views/creators.js');
const {el,modal,closeModal}=await import('../public/js/app/ui.js');
const store=await import('../public/js/app/store.js');
const root=document.querySelector('main');
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
after(()=>window.close());
function reset(){closeModal();store.bumpEpoch();store.set('token','synthetic-only');store.set('me',{tier:'pro',user_id:900});root.replaceChildren();history.replaceState(null,'','#/creators');}
function attachRail(ids,state={}){const rail=creatorRail(ids.map(id=>({id,node:el('li',el('button',{'data-id':id},id))})),{key:'author:alpha',label:'Alpha views',state});root.append(rail.node);const track=rail.node.querySelector('.creator-rail-track');Object.defineProperty(track,'clientWidth',{value:300,configurable:true});return {...rail,track};}
function nativeDoc(items,revision='a',generated='2026-09-29T05:02:00Z'){return {...opinionsFixture({creator:'alpha',items,revision:revision.repeat(64)}),generated_at:generated};}
function nativeRows(n=8){return Array.from({length:n},(_,i)=>opinionFixture(i+1,{creator_id:'alpha',author:'Alpha',claim:{en:'Full native view '+i+' remains conditional and attributable.',zh:'完整观点'+i}}));}
function fetchNative(reply){const calls=[];globalThis.fetch=async(url,options={})=>{calls.push({url:new URL(url,'https://ducky.test'),options});assert.equal(options.method||'GET','GET');const next=await reply();return next instanceof Response?next:Response.json(next);};return calls;}

test('rail keeps a stable source on insertion and adjacent withdrawal, and supports keyboard/swipe without extra reads',()=>{
 reset();globalThis.fetch=()=>assert.fail('rail presentation must not fetch');const state={},ids=Array.from({length:12},(_,i)=>'view'+i);let rail=attachRail(ids,state);
 try{
  const next=rail.node.querySelectorAll('.creator-rail-nav')[1];next.focus();next.click();assert.equal(state.anchor,'view4');assert.equal(rail.track.scrollLeft,300);assert.equal(document.activeElement,next);
  rail.dispose();rail.node.remove();rail=attachRail(['new',...ids],state);
  assert.equal(rail.node.dataset.page,'1');assert.ok([...rail.node.querySelectorAll('.creator-rail-page')][1].textContent.includes('view4'));
  rail.dispose();rail.node.remove();rail=attachRail(['new',...ids.filter(id=>id!=='view2')],state);
  assert.ok([...rail.node.querySelectorAll('.creator-rail-page')][Number(rail.node.dataset.page)].textContent.includes('view3'),'the prior anchored record remains in view after an earlier record is withdrawn');
  rail.track.focus();rail.track.dispatchEvent(new window.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));assert.equal(rail.node.dataset.page,'2');assert.equal(document.activeElement,rail.track);
  rail.track.scrollLeft=0;rail.track.dispatchEvent(new window.Event('scroll'));assert.equal(rail.node.dataset.page,'0');
 }finally{rail.dispose();rail.node.remove();}
});

test('native rail modal retains complete conditions, all repeated receipts and exact navigation timestamp after an unchanged refresh',async()=>{
 reset();const rows=nativeRows(),earlier={...rows[0].records[0],id:'earlier-record',video_id:'sample00009',published_at:'2026-09-20T20:00:00Z',original_source_url:'https://www.youtube.com/watch?v=sample00009&t=0s',navigation_seconds:0};rows[0].records.push(earlier);rows[0].record_count=2;
 let reply=nativeDoc(rows);const calls=fetchNative(()=>reply),reader=mountCreatorOpinions(root,{creator:'alpha',rail:true,from:'creators'});await reader.ready;
 try{
  const open=root.querySelector('.opinion-preview-open');open.focus();open.click();let dialog=document.querySelector('[data-opinion-dialog]');assert.ok(dialog);assert.match(dialog.textContent,/If funding costs decline/);assert.match(dialog.textContent,/Next quarter/);assert.equal(dialog.querySelectorAll('.opinion-records li').length,2);
  assert.equal(dialog.querySelector('.opinion-original').href,'https://www.youtube.com/watch?v=sample00001&t=32s');assert.ok([...dialog.querySelectorAll('.opinion-original')].some(a=>a.href.endsWith('sample00009&t=0s')));
  dialog.querySelector('.opinion-records').open=true;reply=nativeDoc(rows,'b','2026-09-29T05:03:00Z');await reader.refresh();assert.equal(document.querySelector('[data-opinion-dialog]'),dialog);assert.equal(dialog.querySelector('.opinion-records').open,true);
  closeModal();assert.equal(document.activeElement.dataset.readingKey,open.dataset.readingKey);assert.ok(document.activeElement.isConnected);
  assert.equal(calls.length,2);assert.ok(calls.every(c=>c.url.pathname==='/kol/opinions'&&c.url.searchParams.get('creator')==='alpha'&&c.url.searchParams.get('scope')==='discover'));
 }finally{reader.dispose();closeModal();}
});

test('native source change closes the old dialog and a denial returns focus to a visible reader control',async()=>{
 reset();const rows=nativeRows();let reply=nativeDoc(rows);fetchNative(()=>reply);const reader=mountCreatorOpinions(root,{creator:'alpha',rail:true});await reader.ready;
 try{
  let open=root.querySelector('.opinion-preview-open');open.focus();open.click();reply=nativeDoc(rows.map((row,i)=>i?row:{...row,claim:{en:'Changed recorded meaning.',zh:'变化后的观点'}}),'b','2026-09-29T05:03:00Z');await reader.refresh();
  assert.equal(document.querySelector('[data-opinion-dialog]'),null);assert.equal(document.activeElement.dataset.readingKey,open.dataset.readingKey);
  open=root.querySelector('.opinion-preview-open');open.focus();open.click();reply=Response.json({error:'forbidden'},{status:403});await reader.refresh();
  assert.equal(document.querySelector('[data-opinion-dialog]'),null);assert.equal(root.querySelector('.opinion-preview-card'),null);assert.equal(document.activeElement,root.querySelector('.creator-opinions-heading button'),'revoking the focused source must leave a visible focus target');
 }finally{reader.dispose();closeModal();}
});

test('native preview retains non-author speaker attribution and page position across an inserted source',async()=>{
 reset();const rows=nativeRows();rows[4]={...rows[4],speaker:{kind:'guest',name:'Named guest'}};let reply=nativeDoc(rows);const calls=fetchNative(()=>reply),reader=mountCreatorOpinions(root,{creator:'alpha',rail:true});await reader.ready;
 try{
  let rail=root.querySelector('.creator-rail');const next=rail.querySelectorAll('.creator-rail-nav')[1];next.focus();next.click();assert.equal(rail.dataset.page,'1');
  const before=calls.length;reply=nativeDoc([opinionFixture(20,{creator_id:'alpha',author:'Alpha'}),...rows],'b','2026-09-29T05:03:00Z');await reader.refresh();rail=root.querySelector('.creator-rail');assert.equal(rail.dataset.page,'1');
  const visible=[...rail.querySelectorAll('.creator-rail-page')][1];assert.ok(visible.querySelector('[data-opinion-id="sample-opinion-5"]'));assert.match(visible.querySelector('[data-opinion-id="sample-opinion-5"]').textContent,/Named guest/,'a guest view must not silently become the author’s own opinion');
  assert.equal(calls.length,before+1);assert.equal(document.activeElement.dataset.readingKey,next.dataset.readingKey);
 }finally{reader.dispose();closeModal();}
});

test('a closed native modal does not give its reader authority to close an unrelated modal on denial or disposal',async()=>{
 reset();let reply=nativeDoc(nativeRows());fetchNative(()=>reply);const reader=mountCreatorOpinions(root,{creator:'alpha',rail:true});await reader.ready;
 try{
  const open=root.querySelector('.opinion-preview-open');open.focus();open.click();closeModal();modal('Unrelated source',el('p','Keep this current dialog.'));const unrelatedFocus=document.activeElement;
  reply=Response.json({error:'forbidden'},{status:403});await reader.refresh();assert.equal(document.querySelector('#modal-title')?.textContent,'Unrelated source');
  assert.equal(document.activeElement,unrelatedFocus,'revocation must not steal focus from an unrelated dialog');
  reader.dispose();assert.equal(document.querySelector('#modal-title')?.textContent,'Unrelated source');
 }finally{reader.dispose();closeModal();}
});

test('compact Discover preserves full qualifications and exact source links in the modal plus stable stock return identity',()=>{
 reset();let reads=0;globalThis.fetch=()=>{reads++;assert.fail('opening a saved discovery preview must not fetch');};
 const view={creator_id:'alpha',post_id:'sample00001',point_id:'point:1',ticker:'MU',stance:'support',published_at:'2026-09-28T10:00:00Z',text:{en:'A complete attributed claim with a condition at the end.',zh:'完整观点'},condition_text:'Only if all announced orders close.',horizon_text:'Within the next two quarters.',source_url:'https://www.youtube.com/watch?v=sample00001&t=60'};
 const preview=discoveryPreview({creator:{id:'alpha',name:'Alpha'},latest_view:view},'ready',{compact:true});root.append(preview);
 const ticker=preview.querySelector('.creator-discovery-stance a');assert.equal(ticker.dataset.readingKey,'creator-discovery:alpha:point:1:stock');
 const open=preview.querySelector('.creator-discovery-open');open.focus();open.click();const dialog=document.querySelector('[role="dialog"]');assert.match(dialog.textContent,/Only if all announced orders close/);assert.match(dialog.textContent,/Within the next two quarters/);assert.match(dialog.textContent,/A complete attributed claim with a condition at the end/);
 assert.equal(dialog.querySelector('a[target="_blank"]').href,view.source_url);assert.match(dialog.querySelector('.creator-discovery-links a').href,/creator=alpha&post=sample00001&point=point%3A1/);closeModal();assert.equal(document.activeElement,open);assert.equal(reads,0);
});

const summary={quality:'no_call',en:'The complete reviewed source summary.',zh:'完整字幕摘要',source:{kind:'transcript',status:'ready',summary_reviewed:true}};
function post(i,{condition='Prices must hold.',title='Margins depend on contract pricing.',stance='support',date='2026-09-28T10:00:00Z'}={}){
 const id='legacy'+String(i).padStart(5,'0');return {id:i,kol_id:'alpha',kol_name:'Alpha',platform_post_id:id,title:'Full source '+i,platform:'youtube',url:'https://www.youtube.com/watch?v='+id,published_at:date,first_seen_at:date,tickers:['MU'],summary,calls:[],reviewed_spans:[{creator_id:'alpha',post_id:id,point_id:'point:'+i,ticker:'MU',basis:'attributed_opinion',intent:'opinion',stance,title:{en:title,zh:'原始观点'+title},condition_text:condition,horizon_text:'Next quarter',conditional:true,source_url:'https://www.youtube.com/watch?v='+id,source_hash:'hash:'+i,published_at:date,observed_at:date,start_seconds:60,end_seconds:90,evidence:'The exact permitted excerpt from source '+i}]};
}
test('Following rails preserve separate conditions/opposition and the full repeated dated source chain without per-author reads',async()=>{
 reset();const posts=[post(1),post(2,{date:'2026-09-22T10:00:00Z'}),post(3,{stance:'counter'}),post(4,{condition:'Prices must rise.'}),...Array.from({length:10},(_,i)=>post(i+5,{title:'Distinct complete view '+i}))];const calls=[];
 globalThis.fetch=async(url,options={})=>{const path=new URL(url,'https://ducky.test').pathname;calls.push(path);assert.equal(options.method||'GET','GET');if(path==='/kol/feed')return Response.json({kols:[{id:'alpha',name:'Alpha'}],posts,pages:{}});if(path==='/me/kols')return Response.json({subs:['alpha'],analysis:{}});if(path==='/watchlist')return Response.json({items:[]});if(path==='/kol/discover')return Response.json({status:'ready',items:[]});assert.fail('Unexpected per-author request '+path);};
 const dispose=await mount(root);await flush();
 try{
  const group=root.querySelector('.creator-views-group');assert.equal(group.querySelectorAll('.creator-rail-page').length,3);assert.equal(group.querySelectorAll('.creator-preview-card').length,12);assert.ok(group.querySelector('.creator-all-views'));assert.ok(group.querySelector('.creator-preview-card.is-bear'));
  const open=group.querySelector('.creator-view-open[data-point="point:1"]');open.focus();open.click();let body=document.querySelector('.creator-view-detail');assert.match(body.textContent,/Prices must hold/);assert.match(body.textContent,/Next quarter/);assert.match(body.textContent,/The complete reviewed source summary/);
  const records=body.querySelector('.creators-ux-repeated');assert.equal(records.querySelectorAll('time').length,2);records.open=true;records.querySelectorAll('button')[1].click();body=document.querySelector('.creator-view-detail');assert.match(body.textContent,/2026-09-22/);assert.match(body.textContent,/The exact permitted excerpt from source 2/);assert.equal(body.querySelector('a.cr-orig').href,'https://www.youtube.com/watch?v=legacy00002&t=60');
  closeModal();assert.equal(document.activeElement,open);assert.equal(calls.some(path=>/\/kol\/(?:alpha|opinions)/.test(path)),false);
 }finally{dispose();closeModal();}
});
