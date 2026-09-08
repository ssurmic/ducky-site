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
const {researchRows,mountResearch,safeSource,normalizedStance}=await import('../public/js/app/views/creator-research.js');
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
   recorded:{status:'missing_price'}},price_context:{publication_reference:{status:'ready',price:100,d:'2025-01-03'},latest_close:{status:'ready',price:90,d:'2025-02-03'},since_publication:{status:'ready',ret:-10},publication_20:{status:'ready',base_d:'2025-01-03',base_px:100,end_d:'2025-02-03',end_px:90,ret:-10}}}]};
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({items:[item]}),{headers:{'content-type':'application/json'}});};
 const root=document.createElement('section');document.body.append(root);await mountResearch(root,{});
 assert.equal(calls,1);assert.ok(root.textContent.includes('-10.0%'));assert.ok(root.textContent.includes('2025-01-06'));
 assert.ok(root.textContent.includes('Historical import'));assert.ok(!root.textContent.includes('LIVE'));
 assert.equal(root.querySelector('select'),null);assert.ok(!root.textContent.includes('From Ducky’s record'));
 assert.ok(root.querySelector('.study-bear .cr-bear'));assert.equal(calls,1);root.remove();
});

test('superseded interpretation is available only in historical view',()=>{
 const old={...posts[0],calls:[{sym:'NVDA',attribution_status:'superseded'}]};
 assert.equal(researchRows([old]).length,0);
 assert.equal(researchRows([old],{history:true}).length,1);
});

test('canonical points survive later empty legacy revisions and collapse only their exact legacy duplicates',()=>{
 const canonical={id:1,revision_id:'point:avgo',canonical:true,kol_id:'talk',calls:[{sym:'AVGO',stance:'bull',point_id:'a'}]};
 const legacy={id:1,revision_id:20,kol_id:'talk',calls:[]};
 const nke={...canonical,id:2,revision_id:'point:nke',calls:[{sym:'NKE',stance:'bull',intent:'conditional'}]};
 const rows=researchRows([canonical,legacy,nke],{kolId:'talk'});
 assert.deepEqual(rows.map(r=>r.call.sym),['AVGO','NKE']);
 const duplicate={...legacy,calls:[{sym:'AVGO',stance:'bull',canonical_replacement:true}]};
 assert.equal(researchRows([canonical,duplicate]).length,1);
 assert.equal(researchRows([canonical,duplicate],{history:true}).length,2);
});


test('unmatured window shows known prices and condition; more pages retain previous views',async()=>{
 store.set('me',{tier:'pro'});
 const item={id:10,revision_id:'point:a',canonical:true,kol_id:'talk',kol_name:'TALK',published_at:'2026-09-07T00:00:00Z',calls:[{
  sym:'NKE',point_id:'a',stance:'bull',condition_text:'Add only if demand improves.',note:'Conditional view',
  price_context:{publication_reference:{status:'ready',price:38,d:'2026-09-04'},latest_close:{status:'ready',price:39,d:'2026-09-08'},since_publication:{status:'ready',ret:2.63},publication_20:{status:'pending'}}}]};
 const second={...item,id:11,revision_id:'point:b',calls:[{...item.calls[0],sym:'AVGO',point_id:'b'}]};
 const requests=[];
 globalThis.fetch=async url=>{requests.push(String(url));return new Response(JSON.stringify(requests.length===1?{items:[item],next_cursor:'page2'}:{items:[second],next_cursor:null}),{headers:{'content-type':'application/json'}});};
 const root=document.createElement('section');document.body.append(root);await mountResearch(root,{kolId:'talk'});
 assert.ok(root.textContent.includes('$38.00'));assert.ok(root.textContent.includes('+2.6%'));assert.ok(root.textContent.includes('Add only if demand improves.'));
 assert.ok(root.querySelector('.study-bull .cr-bull'));assert.equal(root.querySelectorAll('.study-row').length,1);
 [...root.querySelectorAll('button')].find(b=>b.textContent==='Load more views').click();
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(root.querySelectorAll('.study-row').length,2);assert.match(requests[0],/kol_id=talk/);assert.match(requests[1],/before=page2/);
 assert.ok(!root.textContent.includes('Load more views'));root.remove();
});

test('stance aliases normalize without making a mere mention bullish',()=>{
 assert.equal(normalizedStance(' Bullish '),'bull');assert.equal(normalizedStance('support'),'bull');
 assert.equal(normalizedStance('counter'),'bear');assert.equal(normalizedStance('mention'),'neutral');
 assert.equal(normalizedStance(null),'neutral');
});
