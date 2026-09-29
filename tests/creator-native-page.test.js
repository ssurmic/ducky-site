import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {opinionFixture,opinionsFixture} from './fixtures/qa-creator-opinions.js';
const dom=new JSDOM('<html lang="en" data-lang="en"><body><main></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/en/app/#/creators?creator=alpha',pretendToBeVisual:true});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=fn=>{fn();return 0;};
window.HTMLElement.prototype.scrollIntoView=function(){};
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount}=await import('../public/js/app/views/creators.js');
const {mountCreatorOpinions,validOpinions}=await import('../public/js/app/creator-opinions.js');
const root=document.querySelector('main'),flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
const creators=['alpha','beta'].map(id=>({id,name:id==='alpha'?'Alpha Creator':'Beta Creator',platform:'youtube',profile:{}}));
const progress={schema:'creator-progress/1',status:'ready',shared:true,counts:{discovered_posts:19,archived:13,readable_summaries:5},window:{since_day:'2026-09-23',as_of:'2026-09-29T08:00:00Z'},provider:{allowed:false}};
const legacy={id:1,kol_id:'alpha',kol_name:'Alpha Creator',platform_post_id:'legacy00001',title:'Legacy reviewed source',published_at:'2026-09-28T10:00:00Z',url:'https://www.youtube.com/watch?v=legacy00001',tickers:[],calls:[],summary:{quality:'no_call',en:'Retained transcript summary.',zh:'保留原字幕摘要。',source:{kind:'transcript',status:'ready',summary_reviewed:true}}};
const doc=(creator,n=3)=>opinionsFixture({creator,items:Array.from({length:n},(_,i)=>opinionFixture(i+1,{creator_id:creator,author:creators.find(c=>c.id===creator).name,claim:{en:creator+' native view '+i,zh:creator+'原生观点'}}))});
function setup({opinionReply=url=>doc(url.searchParams.get('creator')),tier='pro'}={}){
 store.bumpEpoch();store.set('token','synthetic-only');store.set('me',{user_id:3,tier});history.replaceState(null,'','#/creators?creator=alpha');root.replaceChildren();
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url,'https://ducky.test');calls.push({url:u,options});assert.equal(options.method||'GET','GET');
  if(u.pathname==='/kol/opinions')return Response.json(await opinionReply(u));
  if(['/kol/feed','/kol/trial-feed'].includes(u.pathname))return Response.json({kols:creators,posts:[legacy],pages:{}});
  if(u.pathname==='/me/kols')return Response.json({subs:[],cap:2,analysis:{alpha:{status:'paused',progress}}});
  if(u.pathname==='/watchlist')return Response.json({items:[]});
  if(u.pathname==='/kol/discover')return Response.json({status:'ready',items:creators.map(creator=>({creator,latest_view:null}))});
  if(u.pathname==='/kol/research')return Response.json({items:[],next_cursor:null});
  if(u.pathname.endsWith('/page'))return Response.json({kol_id:u.pathname.split('/')[2],status:'ready',content_hash:'same'});
  if(u.pathname==='/kol/alpha/posts/legacy00001')return Response.json({creator:creators[0],post:legacy});
  throw Error('Unexpected request '+url);
 };
 return calls;
}
after(()=>window.close());

test('creator filtering validates request, envelope, every row and grouped source identity',async()=>{
 assert.equal(validOpinions(doc('alpha'),{creator:'alpha'}),true);
 assert.equal(validOpinions(doc('beta'),{creator:'alpha'}),false);
 const wrong=doc('alpha');wrong.items[0].records[0].creator_id='beta';assert.equal(validOpinions(wrong,{creator:'alpha'}),false);
 const empty=doc('alpha',0);empty.selection.creator='beta';assert.equal(validOpinions(empty,{creator:'alpha'}),false);
 const calls=setup();const invalid=mountCreatorOpinions(root,{creator:'alpha/beta'});await invalid.ready;assert.equal(calls.length,0);assert.match(root.textContent,/Video views are unavailable/);invalid.dispose();root.replaceChildren();
 const mounted=mountCreatorOpinions(root,{creator:'alpha',initial:1});await mounted.ready;
 assert.equal(calls[0].url.searchParams.get('creator'),'alpha');assert.equal(calls[0].url.searchParams.get('scope'),'discover');
 root.querySelector('.opinions-more').click();root.querySelector('.opinion-records').open=true;mounted.dispose();root.replaceChildren();
 const other=mountCreatorOpinions(root,{creator:'beta',initial:1});await other.ready;
 assert.equal(root.querySelectorAll('.creator-opinion').length,1,'show-all is scoped by creator');assert.equal(root.querySelector('.opinion-records').open,false,'source disclosure state is scoped by creator');
 other.dispose();root.replaceChildren();
 const returned=mountCreatorOpinions(root,{creator:'alpha',initial:1});await returned.ready;
 assert.equal(root.querySelectorAll('.creator-opinion').length,3);assert.equal(root.querySelector('.opinion-records').open,true);returned.dispose();
});

test('selected author exposes native views before historical progress and retains legacy material across rerenders',async()=>{
 const calls=setup();const dispose=await mount(root,{query:new URLSearchParams('creator=alpha')});await flush();
 const native=root.querySelector('.creator-native-opinions');assert.ok(native);assert.equal(native.closest('details'),null);
 assert.match(native.textContent,/alpha native view/);assert.match(native.querySelector('.opinion-original').textContent,/about 0:32/);
 const batch=root.querySelector('.creator-delivery-progress');assert.ok(native.compareDocumentPosition(batch)&Node.DOCUMENT_POSITION_FOLLOWING);
 assert.match(batch.textContent,/Historical summary batch/);assert.match(batch.textContent,/2026-09-23 to 2026-09-29/);assert.match(batch.textContent,/does not describe new-upload processing/);
 assert.match(root.textContent,/Retained transcript summary/);
 native.querySelector('.opinion-records').open=true;const before=calls.filter(c=>c.url.pathname==='/kol/opinions').length;
 root.querySelector('.creator-workspace-tabs button').click();await flush();
 assert.equal(root.querySelector('.creator-native-opinions'),native);assert.equal(native.querySelector('.opinion-records').open,true);
 assert.equal(calls.filter(c=>c.url.pathname==='/kol/opinions').length,before,'legacy repaint does not restart native polling');
 root.querySelectorAll('.creator-workspace-tabs button')[1].click();await flush();
 assert.equal(root.querySelector('.creator-native-opinions'),null);native.querySelector('.creator-opinions-heading button').click();await flush();
 assert.equal(calls.filter(c=>c.url.pathname==='/kol/opinions').length,before,'disposed reader cannot request again');
 dispose();
});

test('switching creators aborts the old reader and cannot paint its late response into the new author',async()=>{
 let release;const calls=setup({opinionReply:url=>url.searchParams.get('creator')==='alpha'?new Promise(resolve=>release=resolve):doc('beta')});
 const dispose=await mount(root,{query:new URLSearchParams('scope=discover&creator=alpha')});await flush();
 const old=calls.find(c=>c.url.pathname==='/kol/opinions');
 [...root.querySelectorAll('button')].find(b=>b.textContent.startsWith('← ')).click();await flush();
 [...root.querySelectorAll('.creator-name')].find(b=>b.textContent==='Beta Creator').click();await flush();
 assert.equal(old.options.signal.aborted,true);release(doc('alpha'));await flush();
 assert.match(root.querySelector('.creator-native-opinions').textContent,/beta native view/);assert.doesNotMatch(root.querySelector('.creator-native-opinions').textContent,/alpha native view/);
 const refresh=root.querySelector('.creator-opinions-heading button'),before=calls.length;dispose();refresh.click();await flush();assert.equal(calls.length,before);
});

test('compact author preview needs no follow, while exact-source context does not add unrelated native reads',async()=>{
 let calls=setup({tier:'free'});let dispose=await mount(root,{query:new URLSearchParams('creator=alpha')});await flush();
 assert.match(root.querySelector('.creator-native-opinions').textContent,/alpha native view/);assert.ok(calls.every(c=>(c.options.method||'GET')==='GET'));dispose();
 calls=setup();dispose=await mount(root,{query:new URLSearchParams('scope=discover&creator=alpha&post=legacy00001')});await flush();
 assert.equal(root.querySelector('.creator-native-opinions'),null);assert.equal(calls.some(c=>c.url.pathname==='/kol/opinions'),false);
 assert.match(root.querySelector('.cr-post').textContent,/Retained transcript summary/);dispose();
});
