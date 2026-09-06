import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/boards?board=social'});
for(const k of ['window','document','Node','location','history'])globalThis[k]=dom.window[k];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {filterSocial,socialCard,mountSocial}=await import('../public/js/app/views/social-tracking.js');
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
 assert.equal(requests,0);assert.match(root.textContent,/Degen Index/);assert.match(root.textContent,/not connected/);
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
