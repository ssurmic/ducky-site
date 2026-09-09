import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="zh" data-lang="zh"><body></body></html>',{url:'https://ducky.test/app/#/creators'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=fn=>fn();
const copy=JSON.parse(readFileSync('i18n/zh.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const {starterChoices,creatorStarters}=await import('../public/js/app/views/creator-starters.js');
const {mount}=await import('../public/js/app/views/creators.js');
const store=await import('../public/js/app/store.js');
const tick=()=>new Promise(r=>setImmediate(r));
const at=Date.now();
const entry=(id,{age=2,lang='zh',...extra}={})=>({creator:{id,name:'Creator '+id,lang,platform:'youtube',avatar:'https://yt3.googleusercontent.com/'+id},status:'available',latest_view:{
  creator_id:id,post_id:'abcdefghijk',point_id:'claim:'+id,ticker:'NVDA',stance:'support',
  published_at:new Date(at-age*86400000).toISOString(),source_url:'https://www.youtube.com/watch?v=abcdefghijk',
  text:{zh:'已核实的观点 '+id,en:'Reviewed view '+id},...extra}});
const doc=items=>({status:'ready',items});

test('entry selects recent reviewed sources, prioritises language and never relies on a creator name',()=>{
 const items=[entry('english',{age:1,lang:'en'}),entry('chinese',{age:3}),entry('followed'),entry('old',{age:61}),
   entry('future',{age:-1}),entry('wrong',{creator_id:'someone-else'}),entry('context',{stance:'context'}),
   entry('unknown-language',{text:{en:'Only English'}}),entry('missing-condition',{conditional:true}),
   entry('unsafe',{source_url:'https://evil.test/post'}),entry('bad-route',{post_id:'../post'}),
   {creator:{id:'famous',name:'投资TALK君'},status:'no_verified_view',latest_view:null},entry('chinese')];
 assert.deepEqual(starterChoices(doc(items),{following:new Set(['followed']),language:'zh',now:at}).map(r=>r.creator.id),['chinese','english']);
 assert.deepEqual(starterChoices({...doc(items),status:'unavailable'}),[]);
 assert.equal(starterChoices(doc(Array.from({length:8},(_,i)=>entry('c'+i)))).length,6);
 assert.equal(creatorStarters(doc([])),null);
});

test('avatar preview uses exact source links; follow requires a separate deliberate click',()=>{
 let called=[];const state={};const box=creatorStarters(doc([entry('one'),entry('two')]),{state,onFollow:c=>called.push(c.id)});document.body.append(box);
 assert.equal(box.querySelector('.creator-starter-person').getAttribute('aria-pressed'),'true');
 box.querySelector('[data-creator-id="two"]').click();
 assert.equal(state.selected,'two');assert.deepEqual(called,[]);
 assert.ok(box.querySelector('.creator-starter-excerpt').textContent.endsWith('two'));
 const target=box.querySelector('.creator-starter-actions a').getAttribute('href');
 assert.match(target,/creator=two/);assert.match(target,/post=abcdefghijk/);assert.match(target,/point=claim%3Atwo/);
 box.querySelector('.creator-starter-actions button').click();assert.deepEqual(called,['two']);
 const pause=box.querySelector('.creator-starters-motion');pause.click();assert.equal(pause.getAttribute('aria-pressed'),'true');assert.ok(box.classList.contains('is-paused'));
 const img=box.querySelector('img');img.dispatchEvent(new window.Event('error'));assert.ok(box.querySelector('.creator-monogram'));
 box.remove();
});

test('new accounts see ready creators without a lookup, auto-follow or model job',async()=>{
 store.set('me',{tier:'pro',user_id:71});const requests=[];let subs=[];
 const row=entry('ready');globalThis.fetch=async(url,options)=>{
   requests.push([url,options.method]);
   if(url==='/kol/ready/sub'){subs=['ready'];return Response.json({subscribed:true,kol_id:'ready',creator:row.creator});}
   if(url==='/kol/feed')return Response.json({kols:[row.creator],posts:[],pages:{}});
   if(url==='/me/kols')return Response.json({subs,analysis:{}});
   if(String(url).startsWith('/kol/discover'))return Response.json(doc([row]));
   return Response.json({items:[]});
 };
 const root=document.createElement('main');document.body.append(root);const dispose=await mount(root);await tick();
 assert.ok(root.querySelector('.creator-starters'));
 assert.ok(requests.every(([,method])=>method==='GET'));
 assert.ok(!requests.some(([url])=>url.includes('resolve')||url.includes('analy')));
 const button=root.querySelector('.creator-starter-actions button');button.click();button.click();await tick();
 assert.equal(requests.filter(([url,method])=>url==='/kol/ready/sub'&&method==='POST').length,1);
 assert.equal(root.querySelector('.creator-starters'),null);
 assert.ok(root.textContent.includes('Creator ready'));
 assert.match(location.hash,/creator=ready&post=abcdefghijk&point=claim%3Aready/);
 dispose();root.remove();
});

test('search, followed workspace and source pages do not add an unrelated recommendation panel',async()=>{
 store.set('me',{tier:'pro',user_id:71});const row=entry('ready');
 globalThis.fetch=async url=>Response.json(url==='/kol/feed'?{kols:[row.creator],posts:[],pages:{}}:url==='/me/kols'?{subs:['other'],analysis:{}}:String(url).startsWith('/kol/discover')?doc([row]):{items:[]});
 const root=document.createElement('main');document.body.append(root);const dispose=await mount(root);await tick();
 assert.equal(root.querySelector('.creator-starters'),null);
 root.querySelector('[data-creator-scope="discover"]').click();await tick();assert.ok(root.querySelector('.creator-starters'));
 const input=root.querySelector('[role="combobox"]');input.value='Other';input.dispatchEvent(new window.Event('input'));assert.equal(root.querySelector('.creator-starters'),null);
 dispose();root.remove();
});

test('refresh removes withdrawn discovery recommendations rather than reusing stale cards',async()=>{
 store.set('me',{tier:'pro',user_id:71});let ready=true;const row=entry('ready');
 globalThis.fetch=async url=>Response.json(url==='/kol/feed'?{kols:[row.creator],posts:[],pages:{}}:url==='/me/kols'?{subs:[],analysis:{}}:String(url).startsWith('/kol/discover')?doc(ready?[row]:[]):{items:[]});
 const root=document.createElement('main');document.body.append(root);const dispose=await mount(root);await tick();assert.ok(root.querySelector('.creator-starters'));
 ready=false;[...root.querySelectorAll('.creator-page-actions button')].find(button=>button.textContent===copy['app.creatorflow.refresh']).click();await tick();await tick();
 assert.equal(root.querySelector('.creator-starters'),null);dispose();root.remove();
});
