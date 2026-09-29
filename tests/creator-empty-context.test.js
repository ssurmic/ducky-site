import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {opinionFixture,opinionsFixture} from './fixtures/qa-creator-opinions.js';

const dom=new JSDOM('<html lang="en" data-lang="en"><body><main></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/en/app/#/creators?creator=alpha',pretendToBeVisual:true});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=fn=>{fn();return 0;};
window.HTMLElement.prototype.scrollIntoView=function(){};
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mountCreatorOpinions}=await import('../public/js/app/creator-opinions.js');
const {mount}=await import('../public/js/app/views/creators.js');
const root=document.querySelector('main'),flush=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));};
const empty=()=>opinionsFixture({creator:'alpha',items:[]});
function reset(tier='pro'){
 store.bumpEpoch();store.set('token','synthetic-only');store.set('me',{user_id:31,tier});
 history.replaceState(null,'','#/creators?creator=alpha');root.replaceChildren();
}
after(()=>window.close());

test('only an accepted complete empty result with explicit other readable views becomes compact',async()=>{
 reset();let release,calls=0;
 globalThis.fetch=async()=>{calls++;return await new Promise(resolve=>release=resolve);};
 const reader=mountCreatorOpinions(root,{creator:'alpha',compactEmpty:true});
 const section=root.querySelector('.creator-opinions'),button=section.querySelector('.creator-opinions-heading button');
 assert.equal(section.classList.contains('is-empty-alongside'),false,'initial loading cannot be presented as empty');
 assert.equal(button.disabled,true);assert.equal(button.getAttribute('aria-busy'),'true');
 release(Response.json(empty()));await reader.ready;
 assert.equal(section.classList.contains('is-empty-alongside'),true);
 assert.equal(section.querySelector('h2').hidden,true);assert.equal(section.querySelector('.opinions-note').hidden,true);
 assert.equal(section.querySelector('.creator-opinions-list').hidden,true);assert.equal(section.querySelector('.opinions-empty-alongside').hidden,false);
 reader.setCompactEmpty(false);assert.equal(section.classList.contains('is-empty-alongside'),false);
 assert.equal(section.querySelector('.creator-opinions-list').hidden,false);
 reader.setCompactEmpty(true);assert.equal(section.classList.contains('is-empty-alongside'),true);
 assert.equal(calls,1,'changing the same-page context neither remounts nor fetches');reader.dispose();
});

test('refresh loading, failure and denied access remain visible; actual video views always expand',async()=>{
 reset();let reply=()=>Response.json(empty());globalThis.fetch=async()=>await reply();
 const reader=mountCreatorOpinions(root,{creator:'alpha',compactEmpty:true});await reader.ready;
 const section=root.querySelector('.creator-opinions'),refresh=section.querySelector('.creator-opinions-heading button');
 refresh.focus();let release;reply=()=>new Promise(resolve=>release=resolve);
 const pending=reader.refresh();assert.equal(section.classList.contains('is-empty-alongside'),false);assert.equal(section.querySelector('h2').hidden,false);
 release(Response.json({error:'unavailable'},{status:503}));await pending;
 assert.equal(section.classList.contains('is-empty-alongside'),false);assert.match(section.querySelector('.opinions-notice').textContent,/could not refresh/);
 assert.equal(document.activeElement,refresh,'state changes do not move focus from the refresh control');
 reply=()=>Response.json(empty());await reader.refresh();assert.equal(section.classList.contains('is-empty-alongside'),true);
 reply=()=>Response.json({error:'denied'},{status:403});await reader.refresh();
 assert.equal(section.classList.contains('is-empty-alongside'),false);assert.match(section.querySelector('.opinions-notice').textContent,/unavailable/);
 assert.equal(section.dataset.revision,undefined);assert.equal(section.querySelector('.creator-opinions-list').hidden,false);
 const ready=opinionsFixture({creator:'alpha',items:[opinionFixture(1,{creator_id:'alpha',stance:'bear'})]});
 reply=()=>Response.json(ready);await reader.refresh();
 assert.equal(section.classList.contains('is-empty-alongside'),false);assert.equal(section.querySelectorAll('.creator-opinion.is-bear').length,1);
 assert.equal(section.querySelector('.creator-opinions-list').hidden,false);assert.ok(section.querySelector('.opinion-original'));
 section.querySelector('.opinion-original').focus();
 reply=()=>Response.json({...empty(),revision:'b'.repeat(64),generated_at:'2026-09-29T05:03:00Z'});await reader.refresh();
 assert.equal(section.classList.contains('is-empty-alongside'),true);assert.equal(section.querySelectorAll('.creator-opinion').length,0);
 assert.equal(document.activeElement,refresh,'withdrawn focused content returns to a visible control, never the hidden heading');reader.dispose();
});

test('partial, paginated, invalid and default empty readers are never compressed',async()=>{
 for(const [body,opt] of [
  [(()=>{const d=empty();d.coverage.truncated=true;return d;})(),true],
  [{...empty(),next_cursor:'another-page'},true],
  [{...empty(),schema:'unknown'},true],
  [Response.json({status:'pending'},{status:202}),true],
  [empty(),false],
 ]){
  reset();globalThis.fetch=async()=>body instanceof Response?body:Response.json(body);
  const reader=mountCreatorOpinions(root,{creator:'alpha',compactEmpty:opt});await reader.ready;
  const section=root.querySelector('.creator-opinions');assert.equal(section.classList.contains('is-empty-alongside'),false);
  assert.equal(section.querySelector('h2').hidden,false);assert.equal(section.querySelector('.opinions-note').hidden,false);reader.dispose();
 }
});

test('Creators opts in only when the selected author has readable historical views in the current access scope',async()=>{
 const creator={id:'alpha',name:'Alpha Creator',platform:'youtube',profile:{}};
 const legacy={id:1,kol_id:'alpha',kol_name:'Alpha Creator',platform_post_id:'legacy00001',title:'Historical source',published_at:'2026-09-28T10:00:00Z',tickers:[],calls:[],url:'https://www.youtube.com/watch?v=legacy00001',
  summary:{quality:'no_call',en:'Retained transcript summary.',zh:'保留原字幕摘要。',source:{kind:'transcript',status:'ready',summary_reviewed:true}}};
 for(const [tier,posts,compact] of [['pro',[legacy],true],['pro',[],false],['free',[legacy],false]]){
  reset(tier);globalThis.fetch=async(input,options={})=>{
   assert.equal(options.method||'GET','GET');const path=new URL(input,'https://ducky.test').pathname;
   if(path==='/kol/opinions')return Response.json(empty());
   if(['/kol/feed','/kol/trial-feed'].includes(path))return Response.json({kols:[creator],posts,pages:{}});
   if(path==='/me/kols')return Response.json({subs:[],cap:2,analysis:{}});
   if(path==='/watchlist')return Response.json({items:[]});
   if(path==='/kol/discover')return Response.json({status:'ready',items:[{creator,latest_view:null}]});
   if(path==='/kol/alpha/page')return Response.json({kol_id:'alpha',status:'ready',content_hash:'same'});
   throw Error('Unexpected read '+path);
  };
  const dispose=await mount(root,{query:new URLSearchParams('creator=alpha')});await flush();
  assert.equal(root.querySelector('.creator-opinions').classList.contains('is-empty-alongside'),compact);
  if(compact){assert.match(root.querySelector('.creators-ux-author-views').textContent,/Retained transcript summary/);
   assert.equal(root.querySelector('.creator-native-opinions').closest('details'),null,'do not hide the entire distinct source reader');}
  dispose();
 }
});
