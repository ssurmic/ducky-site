import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<main></main>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history']) globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';
const copy=JSON.parse(readFileSync('i18n/en.json'));
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {researchRows,mountResearch,safeSource}=await import('../public/js/app/views/creator-research.js');
const posts=[{id:1,revision_id:1,kol_id:'a',kol_name:'Alpha',calls:[{sym:'NVDA'}]},
 {id:1,revision_id:2,kol_id:'a',kol_name:'Alpha',calls:[{sym:'AMD'}]},
 {id:2,revision_id:3,kol_id:'b',kol_name:'Beta',calls:[{sym:'NVDA'}]}];

test('creator history preserves versions and composes with following and stock search',()=>{
 assert.equal(researchRows(posts).length,2);
 assert.equal(researchRows(posts,{history:true}).length,3);
 assert.equal(researchRows(posts,{allowedIds:[]}).length,0);
 assert.equal(researchRows(posts,{allowedIds:['a'],query:'NVDA'}).length,0);
 assert.equal(researchRows(posts,{allowedIds:['a'],query:'NVDA',history:true}).length,1);
 assert.equal(safeSource('javascript:alert(1)'),null);
 assert.equal(safeSource('https://youtube.com.evil.test/'),null);
});

test('free creator research never requests or mounts private results',async()=>{
 store.set('me',{tier:'free'});globalThis.fetch=()=>assert.fail('private fetch');
 const root=document.createElement('section');document.body.append(root);
 await mountResearch(root,{});
 assert.ok(root.querySelector('a[href="#/billing"]'));assert.equal(root.querySelector('.study-row'),null);root.remove();
});

test('paid history keeps a loss, exact dates, and unavailable windows visible',async()=>{
 store.set('me',{tier:'pro'});
 const item={...posts[0],title:'Synthetic opinion',published_at:'2025-01-03T23:00:00Z',recorded_at:'2025-01-06T12:00:00Z',
  provenance:'legacy_import',content_hash:'abc',url:'https://www.youtube.com/watch?v=f8kUx5_1cWc',calls:[{sym:'NVDA',stance:'bear',evidence:'NVDA margins may weaken.',windows:{
   published:{status:'ready',base_d:'2025-01-06',base_px:100,horizons:{20:{status:'ready',end_d:'2025-02-03',end_px:90,ret:-10,spy_ret:2,excess:-12,min_close_return:-12,max_close_return:0}}},
   recorded:{status:'missing_price'}}}]};
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({items:[item]}),{headers:{'content-type':'application/json'}});};
 const root=document.createElement('section');document.body.append(root);await mountResearch(root,{});
 assert.equal(calls,1);assert.ok(root.textContent.includes('-10.0%'));assert.ok(root.textContent.includes('2025-01-06'));
 assert.ok(root.textContent.includes('Historical import'));assert.ok(!root.textContent.includes('LIVE'));
 [...root.querySelectorAll('button')].find(b=>b.textContent==='From Ducky’s record').click();
 assert.ok(root.textContent.includes('Prices are missing'));assert.equal(calls,1);root.remove();
});

test('superseded interpretation is available only in historical view',()=>{
 const old={...posts[0],calls:[{sym:'NVDA',attribution_status:'superseded'}]};
 assert.equal(researchRows([old]).length,0);
 assert.equal(researchRows([old],{history:true}).length,1);
});
