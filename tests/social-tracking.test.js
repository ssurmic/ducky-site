import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/boards?board=social'});
for(const k of ['window','document','Node','location','history'])globalThis[k]=dom.window[k];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {filterSocial,socialCard,mountSocial,rankSocial,xSourceSection}=await import('../public/js/app/views/social-tracking.js');
const {mount}=await import('../public/js/app/views/boards.js');
const store=await import('../public/js/app/store.js');
const row={ticker:'NVDA',company:'NVIDIA',rank:1,rank_previous:5,mentions:1000,mentions_previous:100,upvotes:500,change_pct:900,index:100,state:'overheated',overheated:true,components:{volume:50,growth:30,rank:20},id:'social:example:NVDA',collected_at:'2026-09-06T12:00:00Z',source_url:'https://apewisdom.io/stocks/NVDA/'};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,0));};
const doc={status:'ready',items:[row,{...row,ticker:'MU',id:'social:example:MU',state:'normal',index:30,overheated:false}],collected_at:row.collected_at,coverage:{provider_count:700}};

test('filters compose and include record IDs without calling a source',()=>{
 assert.equal(filterSocial(doc.items,'example:NVDA','hot',['NVDA']).length,1);
 assert.equal(filterSocial(doc.items,'','watchlist',[{ticker:'MU'}])[0].ticker,'MU');
 assert.equal(filterSocial(doc.items,'MU','hot').length,0);
});
test('evidence keeps missing post IDs, signed votes and unsafe provider text explicit',()=>{
 const card=socialCard({...row,company:'<img src=x>',upvotes:-6,source_url:'javascript:alert(1)'});
 assert.equal(card.querySelector('img'),null);assert.equal(card.querySelector('a[href^="javascript:"]'),null);
 assert.match(card.textContent,/social:example:NVDA/);assert.match(card.textContent,/Post IDs and unique-author/);
 assert.match(card.textContent,/-6/);assert.ok(card.querySelector('meter'));
 const small=socialCard({...row,index:null,state:'insufficient',components:null});
 assert.equal(small.querySelector('meter'),null);assert.match(small.textContent,/No score/);
 const stale=socialCard(row,{stale:true});assert.equal(stale.dataset.state,'stale');assert.match(stale.textContent,/Saved observation/);
});
test('radar social category mounts its own section and free access never fetches private rows',async()=>{
 store.set('me',{tier:'free'});let requests=0;globalThis.fetch=()=>{requests++;throw new Error('unexpected');};
 const root=document.createElement('div');const cleanup=await mount(root,{query:new URLSearchParams('board=social')});
 assert.equal(requests,0);assert.match(root.textContent,/Vibe Check/);assert.match(root.textContent,/X \/ Twitter · not available/);
 assert.ok(root.querySelector('a[href="#/billing"]'));assert.doesNotMatch(root.textContent,/NVDA/);cleanup();
});
test('current rows, search, history retry and cursor are usable without duplicated pages',async()=>{
 store.set('me',{tier:'pro'});let count=0,urls=[];
 globalThis.fetch=async url=>{urls.push(String(url));if(!String(url).includes('/history'))return response(doc);count++;
   if(count===2)throw new Error('offline');return response({items:[{...row,id:'history:'+count}],next_cursor:count===1?'next':null});};
 const root=document.createElement('div');document.body.append(root);const cleanup=await mountSocial(root);
 assert.equal(root.querySelectorAll('.social-card').length,2);
 assert.doesNotMatch(root.textContent,/null|undefined/);
 const search=root.querySelector('input');search.value='NVDA';search.dispatchEvent(new window.Event('input'));
 assert.equal(root.querySelectorAll('.social-card').length,1);
 const button=root.querySelector('.social-evidence button');button.click();await flush();
 assert.match(root.textContent,/history:1/);button.click();await flush();
 assert.match(root.textContent,/History could not be loaded/);assert.match(root.textContent,/history:1/);
 button.click();await flush();assert.equal(root.querySelectorAll('.social-history-row').length,2);
 assert.ok(urls.at(-1).includes('before=next'));assert.equal(button.hidden,true);
 assert.doesNotMatch(root.textContent,/social\.(title|method)/);cleanup();root.remove();
});
test('unavailable and stale sources cannot look like fresh empty scans',async()=>{
 store.set('me',{tier:'pro'});globalThis.fetch=async()=>response({status:'unavailable',items:[]});
 const root=document.createElement('div');let clean=await mountSocial(root);assert.match(root.textContent,/No social data is available yet/);clean();root.replaceChildren();
 globalThis.fetch=async()=>response({...doc,status:'stale'});clean=await mountSocial(root);
 assert.match(root.textContent,/Showing the last saved readings/);assert.equal(root.querySelectorAll('[data-state="overheated"]').length,0);clean();
});
test('navigation or logout discards an in-flight private snapshot',async()=>{
 store.set('me',{tier:'pro'});let finish;globalThis.fetch=()=>new Promise(r=>finish=r);
 const root=document.createElement('div');const task=mountSocial(root);store.bumpEpoch();store.set('me',null);
 finish(response(doc));const cleanup=await task;assert.doesNotMatch(root.textContent,/NVIDIA/);cleanup();
});
test('social search and scope survive language navigation without an extra snapshot fetch',async()=>{
 store.set('me',{tier:'pro'});globalThis.fetch=async url=>response(String(url).includes('/watchlist')?{items:[{ticker:'MU'}]}:doc);
 const lang=document.createElement('a');lang.setAttribute('data-lang-toggle','');lang.href='/en/app/#/boards?board=social&ticker=NVDA';document.body.append(lang);
 const root=document.createElement('div');document.body.append(root);
 const clean=await mountSocial(root,{query:new URLSearchParams('ticker=NVDA&scope=watchlist')});await flush();
 const input=root.querySelector('input');input.value='MU';input.dispatchEvent(new window.Event('input'));
 assert.match(location.hash,/ticker=MU/);assert.match(lang.hash,/ticker=MU/);assert.match(lang.hash,/scope=watchlist/);
 assert.equal(root.querySelectorAll('.social-card').length,1);assert.match(root.querySelector('.social-card').textContent,/MU/);
 clean();root.remove();lang.remove();
});

test('legacy entry starts with stocks; volume ranking includes small samples and ignores personal filters',async()=>{
 store.set('me',{tier:'pro'});
 const small={...row,ticker:'AGI',company:'Alamos Gold',mentions:2000,index:null,state:'insufficient',overheated:false};
 const items=[{...row,state:'elevated',overheated:false,mentions:30},small];
 assert.equal(rankSocial(items)[0].ticker,'AGI');assert.equal(items[0].ticker,'NVDA');
 globalThis.fetch=async()=>response({...doc,items});
 const root=document.createElement('div');document.body.append(root);
 const clean=await mountSocial(root,{view:'degen'});
 assert.equal(root.querySelector('select').value,'all');assert.match(root.textContent,/No sampled stock meets/);
 assert.match(root.querySelector('.social-rank-row').textContent,/AGI.*Insufficient sample/);
 root.querySelector('.social-rank-row').click();
 assert.equal(root.querySelector('input').value,'AGI');assert.equal(root.querySelectorAll('.social-card').length,1);
 assert.equal(root.querySelectorAll('.social-rank-row').length,2);
 clean();root.remove();
});

test('every overheated stock is reachable and empty hot filter offers a reset',async()=>{
 store.set('me',{tier:'pro'});globalThis.fetch=async()=>response(doc);
 const root=document.createElement('div');const clean=await mountSocial(root,{view:'vibe'});
 assert.equal(root.querySelectorAll('.social-hot-list button').length,1);
 const scope=root.querySelector('select');scope.value='hot';scope.dispatchEvent(new window.Event('change'));
 const search=root.querySelector('input');search.value='MU';search.dispatchEvent(new window.Event('input'));
 root.querySelector('.social-empty button').click();
 assert.equal(scope.value,'all');assert.equal(search.value,'');assert.equal(root.querySelectorAll('.social-card').length,2);
 clean();
});

test('expiry while watchlist loads does not leave the new filter loading or restore an old query',async()=>{
 store.set('me',{tier:'pro'});let finish;
 globalThis.fetch=async url=>String(url).includes('/watchlist')?new Promise(r=>finish=r):response({...doc,
   collected_at:new Date(Date.now()-970).toISOString(),stale_after_seconds:1});
 const root=document.createElement('div');document.body.append(root);
 const clean=await mountSocial(root,{query:new URLSearchParams('scope=watchlist&ticker=MU')});
 await new Promise(r=>setTimeout(r,60));
 const search=root.querySelector('input');search.value='NVDA';search.dispatchEvent(new window.Event('input'));
 finish(response({items:[{ticker:'NVDA'}]}));await flush();
 assert.equal(root.querySelector('input').value,'NVDA');assert.equal(root.querySelectorAll('.social-card').length,1);
 assert.equal(root.querySelector('.social-card').dataset.state,'stale');
 assert.doesNotMatch(root.querySelector('.social-rank-row').textContent,/Overheated discussion/);
 clean();root.remove();
});

test('X count coverage preserves zero and unavailable data separately from Reddit heat',async()=>{
 const now=new Date().toISOString();
 const x={status:'partial',items:[{ticker:'NVDA',status:'ready',posts:0,observed_at:now,window_end:now},
   {ticker:'AMD',status:'unavailable',posts:null}]};
 const panel=xSourceSection(x);assert.match(panel.textContent,/0 posts/);assert.match(panel.textContent,/— posts/);
 assert.doesNotMatch(panel.textContent,/Overheated/);assert.equal(xSourceSection({status:'not_connected'}),null);
 assert.match(xSourceSection({status:'ready',items:[{...x.items[0],observed_at:'2020-01-01',window_end:'2020-01-01'}]}).textContent,/Saved sample/);
 store.set('me',{tier:'pro'});globalThis.fetch=async()=>response({status:'unavailable',items:[],x});
 const root=document.createElement('div');const clean=await mountSocial(root);
 assert.ok(root.querySelector('.social-x'));assert.match(root.textContent,/No social data is available yet/);clean();
});
