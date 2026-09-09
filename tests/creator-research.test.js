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
const {researchRows,mountResearch,safeSource,normalizedStance,studyStatus}=await import('../public/js/app/views/creator-research.js');
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

test('free creator research reads the server-scoped results',async()=>{
 store.set('me',{tier:'free'});let calls=0;globalThis.fetch=async url=>{calls++;assert.match(url,/^\/kol\/research/);return Response.json({items:[]});};
 const root=document.createElement('section');document.body.append(root);
 await mountResearch(root,{});
 assert.equal(calls,1);assert.equal(root.querySelector('.study-row'),null);root.remove();
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

test('uncomputed, immature, missing-price and unknown-time views remain distinct',()=>{
 const context={publication_reference:{status:'ready'},latest_close:{status:'ready'},publication_20:{status:'pending'}};
 assert.equal(studyStatus({}),'processing');
 assert.equal(studyStatus({price_context:{}}),'processing');
 assert.equal(studyStatus({price_context:context}),'pending');
 assert.equal(studyStatus({price_context:{...context,latest_close:{status:'missing_price'}}}),'missing_price');
 assert.equal(studyStatus({price_context:{...context,publication_reference:{status:'time_unknown'}}}),'time_unknown');
 assert.equal(studyStatus({price_context:{...context,publication_20:{status:'ready'}}}),'ready');
});

test('coverage is for loaded views and an older mature view arrives on the next page',async()=>{
 store.set('me',{tier:'pro'});
 const base={...posts[0],title:'View',published_at:'2026-09-07T00:00:00Z'};
 const call={sym:'NKE',stance:'bull',note:'View'};
 const first={...base,calls:[call]};
 const second={...base,id:5,revision_id:5,published_at:'2025-01-03T23:00:00Z',calls:[{...call,price_context:{
  publication_reference:{status:'ready',price:100},latest_close:{status:'ready',price:80},
  since_publication:{status:'ready',ret:-20},publication_20:{status:'ready',ret:-10}}}]};
 let count=0;globalThis.fetch=async()=>new Response(JSON.stringify(++count===1?{items:[first],next_cursor:'older'}:{items:[second],next_cursor:null}),{headers:{'content-type':'application/json'}});
 const root=document.createElement('section');document.body.append(root);await mountResearch(root,{});
 assert.equal(root.querySelector('.study-coverage').dataset.scope,'loaded_views');
 assert.match(root.querySelector('.study-coverage').textContent,/Awaiting calculation: 1/);
 [...root.querySelectorAll('button')].find(b=>b.textContent==='Load more views').click();
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.match(root.textContent,/2 views loaded · 1 completed/);
 assert.match(root.textContent,/-10.0%/);assert.equal(root.querySelectorAll('.study-row').length,2);
 assert.match(root.textContent,/not the creator’s complete history/);root.remove();
});

const groupedItem=(id,point,date,{creator='talk',ticker='AVGO',start=0,stance='bull',reference=100,latest=90,ret=-10,...extra}={})=>({
 id,revision_id:'point:'+point,canonical:true,study_key:'version:'+point,cluster_key:'same-topic',kol_id:creator,kol_name:creator,published_at:date,
 calls:[{sym:ticker,point_id:point,stance,start_seconds:start,note:point,price_context:{publication_reference:{status:'ready',price:reference,d:'2026-09-02'},
  latest_close:{status:'ready',price:latest,d:'2026-09-08'},since_publication:{status:'ready',ret},publication_20:{status:'pending'}},...extra}]});

test('groups order by publication then same-video source position, never processing time or topic text',async()=>{
 const {researchGroups}=await import('../public/js/app/views/creator-research.js');
 const items=[groupedItem(1,'early-2028','2026-09-03T03:00:00Z',{start:606,stance:'neutral'}),
  groupedItem(1,'late','2026-09-03T03:00:00Z',{start:973,reference:200,latest:190,ret:-5}),
  groupedItem(2,'new-stock','2026-09-05T04:00:00Z',{ticker:'NKE'}),
  groupedItem(3,'other-author','2026-09-01T03:00:00Z',{creator:'other'}),
  {...groupedItem(4,'old','2026-08-01T03:00:00Z'),recorded_at:'2027-01-01T00:00:00Z'}];
 const groups=researchGroups(researchRows(items));
 assert.deepEqual(groups.map(g=>[g.latest.post.kol_id,g.latest.call.sym]),[['talk','NKE'],['talk','AVGO'],['other','AVGO']]);
 assert.deepEqual(groups[1].rows.map(r=>r.call.point_id),['late','early-2028','old']);
 assert.equal(groups[1].latest.call.price_context.since_publication.ret,-5);
 assert.equal(groups[1].rows[2].call.price_context.since_publication.ret,-10);
});

test('deduplication uses exact point identity and retains different conditions in one source topic',()=>{
 const a=groupedItem(1,'a','2026-09-03T03:00:00Z',{condition_text:'Add if demand grows.'});
 const b=groupedItem(1,'b','2026-09-03T03:00:00Z',{condition_text:'Hold if demand weakens.'});
 assert.equal(researchRows([a,a,b,b]).length,2);
 const legacy={id:2,revision_id:7,kol_id:'talk',calls:[{sym:'NKE',condition_text:'One condition'},{sym:'NKE',condition_text:'Another condition'}]};
 assert.equal(researchRows([legacy,legacy]).length,2);
});

test('groups default closed, keep distinct returns and stay open when another page merges',async()=>{
 store.set('me',{tier:'pro'});
 const latest=groupedItem(1,'latest','2026-09-03T03:00:00Z',{start:973,reference:200,latest:200,ret:0});
 const earlier=groupedItem(1,'earlier','2026-09-03T03:00:00Z',{start:606,stance:'neutral',condition_text:'Only after earnings.'});
 const missing=groupedItem(2,'missing','2026-08-01T00:00:00Z',{creator:'other',price_context:{publication_20:{status:'missing_price'}}});
 let calls=0;globalThis.fetch=async()=>Response.json(++calls===1?{items:[latest],next_cursor:'next'}:{items:[latest,earlier,missing]});
 const root=document.createElement('section');document.body.append(root);await mountResearch(root,{});
 let group=root.querySelector('.study-group');assert.equal(group.open,false);
 assert.match(group.querySelector('summary').textContent,/\$200.00/);assert.match(group.querySelector('summary').textContent,/0.0%/);
 group.open=true;[...root.querySelectorAll('button')].find(b=>b.textContent==='Load more views').click();
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(root.querySelectorAll('.study-group').length,2);assert.equal(root.querySelectorAll('.study-row').length,3);
 group=root.querySelector('.study-group');assert.equal(group.open,true);assert.equal(group.querySelectorAll('.study-row').length,2);
 assert.match(group.querySelector('summary').textContent,/differing views/);
 assert.match(group.querySelector('.study-group-views').textContent,/-10.0%/);
 assert.match(group.querySelector('.study-group-views').textContent,/Only after earnings/);
 assert.match(root.querySelectorAll('.study-group')[1].querySelector('summary').textContent,/—/);
 assert.match(root.textContent,/3 views loaded/);assert.match(root.textContent,/2 creator–stock groups/);
 root.remove();
});

test('exact point link opens its own group while keeping other creators collapsed',async()=>{
 store.set('me',{tier:'pro'});
 globalThis.fetch=async()=>Response.json({items:[groupedItem(1,'a','2026-09-03T00:00:00Z'),groupedItem(2,'target','2026-09-01T00:00:00Z',{creator:'other'})]});
 const root=document.createElement('section');document.body.append(root);await mountResearch(root,{point:'target'});
 const groups=root.querySelectorAll('.study-group');assert.equal(groups[0].open,false);assert.equal(groups[1].open,true);
 assert.equal(groups[1].querySelector('.is-focused-study').dataset.pointId,'target');root.remove();
});

test('an unloaded exact point is acknowledged and expands only after its explicit next page arrives',async()=>{
 store.set('me',{tier:'pro'});let calls=0;
 globalThis.fetch=async()=>Response.json(++calls===1?{items:[groupedItem(1,'first','2026-09-03T00:00:00Z')],next_cursor:'older'}:
  {items:[groupedItem(2,'target','2026-08-01T00:00:00Z')]});
 const root=document.createElement('section');document.body.append(root);await mountResearch(root,{point:'target'});
 assert.match(root.querySelector('[role=status]').textContent,/has not loaded yet/);
 assert.equal(calls,1);assert.equal(root.querySelectorAll('.study-group[open]').length,0);
 [...root.querySelectorAll('button')].find(b=>b.textContent==='Load more views').click();
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(calls,2);assert.equal(root.querySelector('[role=status]'),null);
 assert.equal(root.querySelector('.study-group[open] .is-focused-study').dataset.pointId,'target');root.remove();
});

test('stock entry filters on the server before pagination and keeps the filter on later pages',async()=>{
 store.set('me',{tier:'pro'});const requests=[];
 globalThis.fetch=async url=>{const u=new URL(url,'https://ducky.test');requests.push(u);
  assert.equal(u.searchParams.get('ticker'),'AVGO');assert.equal(u.searchParams.get('kol_id'),'talk');
  return Response.json(requests.length===1?{items:[groupedItem(1,'first','2026-09-03T00:00:00Z')],next_cursor:'avgo-older'}:
   {items:[groupedItem(2,'older','2026-08-01T00:00:00Z')]});};
 const root=document.createElement('section');document.body.append(root);await mountResearch(root,{kolId:'talk',tickers:['AVGO']});
 assert.equal(requests.length,1);assert.equal(root.querySelectorAll('.study-row').length,1);
 [...root.querySelectorAll('button')].find(b=>b.textContent==='Load more views').click();
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(requests.length,2);assert.equal(requests[1].searchParams.get('before'),'avgo-older');
 assert.equal(root.querySelectorAll('.study-row').length,2);root.remove();
});

test('an unmatched partial page does not claim that no stock views exist or load pages automatically',async()=>{
 store.set('me',{tier:'pro'});let requests=0;
 globalThis.fetch=async url=>{requests++;assert.equal(new URL(url,'https://ducky.test').searchParams.has('ticker'),false);
  return Response.json({items:[groupedItem(1,'unmatched','2026-09-03T00:00:00Z',{ticker:'TSLA'})],next_cursor:'older'});};
 const root=document.createElement('section');document.body.append(root);await mountResearch(root,{tickers:['AVGO','NKE']});
 assert.match(root.querySelector('.empty').textContent,/No matches in this batch/);
 assert.ok(!root.textContent.includes('No stock views are ready'));
 assert.ok([...root.querySelectorAll('button')].some(b=>b.textContent==='Load more views'));
 assert.equal(requests,1);root.remove();
});
