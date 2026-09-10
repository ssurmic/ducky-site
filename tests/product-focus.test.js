import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const today=await import('../public/js/app/views/today.js');
const stock=await import('../public/js/app/views/stock.js');
const briefs=await import('../public/js/app/views/stock-briefs.js');
const watch=await import('../public/js/app/views/watchlist.js');
const {reading,compactPrice,dayWindow}=await import('../public/js/app/stock-reading.js');
const {closingPoints,closingChart}=await import('../public/js/app/stock-price-chart.js');
const {parse}=await import('../public/js/app/router.js');
const {safeTarget,takeTarget}=await import('../public/js/app/login-target.js');
const {closeModal}=await import('../public/js/app/ui.js');
const pause=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,0));};
function node(id='source',stance='support'){return {id,kind:'creator',priority:'direct',intent:'opinion',stance,conditional:true,
 title:{en:'Orders may recover if customers resume spending.',zh:'如果客户恢复支出，订单可能回升。'},published_at:'2026-09-09',
 evidence:[{kind:'creator',author:'Sample Author',source_url:'https://example.com/original',published_at:'2026-09-09',observed_at:'2026-09-10T01:00:00Z'}]};}
function item(ticker='NVDA'){return {ticker,status:'ready',as_of:'2026-09-09T22:00:00Z',records:4,
 overview:{en:'Sample Author expects orders to recover, conditional on spending.',zh:'作者认为订单可能恢复，取决于支出。',citations:['source']},sources:[node()]};}
const change=(id=1)=>({id:'change:'+id,ticker:'NVDA',kind:'added',state:'available',node:node(),published_at:'2026-09-09',available_at:'2026-09-10T01:00:00Z'});
function setup(){closeModal();store.bumpEpoch();store.set('me',{user_id:12,tier:'pro',access:{billing_enabled:false}});store.set('token','synthetic-only');store.set('watchlist',['NVDA']);const root=document.querySelector('main');root.replaceChildren();return root;}

test('stock briefs reuse the exact shared paragraph and original citations with one cached read',async()=>{
 const root=setup(),calls=[];
 const config=window.DUCKY;window.DUCKY={SHARED_STOCK_BRIEFS_ENABLED:true};
 globalThis.fetch=async(input,options)=>{calls.push([input,options.method]);return Response.json({watchlist_count:1,items:[item()]});};
 const dispose=await briefs.mountStockBriefs(root);
 assert.equal(calls.length,1);assert.equal(calls[0][0],'/me/stock-research');assert.equal(calls[0][1],'GET');
 assert.match(root.textContent,/conditional on spending/);
 root.querySelector('.brief-citation').click();assert.equal(calls.length,1);
 assert.ok(root.querySelector('a[href="#/briefing?archive=1"]'));
 closeModal();dispose();window.DUCKY=config;
});

test('shared brief read failures and account changes cannot expose an earlier paragraph',async()=>{
 let root=setup();globalThis.fetch=async()=>Response.json({unexpected:true});
 let dispose=await briefs.mountStockBriefs(root);assert.ok(root.querySelector('.errbox'));dispose();
 root=setup();let finish;globalThis.fetch=async()=>await new Promise(resolve=>finish=resolve);
 const pending=briefs.mountStockBriefs(root);await pause();store.bumpEpoch();finish(Response.json({items:[item()]}));
 dispose=await pending;assert.doesNotMatch(root.textContent,/conditional on spending/);dispose();
});

test('a late stock detail response is discarded after the account epoch changes',async()=>{
 const root=setup();let finish;
 globalThis.fetch=async input=>input.startsWith('/bars/')?Response.json({bars:[]}):await new Promise(resolve=>finish=resolve);
 const pending=stock.mount(root,{ticker:'NVDA'});await pause();store.bumpEpoch();
 finish(Response.json({ticker:'NVDA',price:{company:'Old account result'},evidence:{nodes:[],analysis_status:'pending'}}));
 const dispose=await pending;assert.doesNotMatch(root.textContent,/Old account result/);dispose();
});

test('core destinations and stock deep links survive sign-in without arbitrary queries',()=>{
 setup();assert.equal(parse('').name,'today');assert.equal(takeTarget(),'#/today');
 for(const path of ['#/today','#/explore','#/stock/NVDA'])assert.equal(safeTarget(path+'?token=secret'),path);
 assert.equal(parse('#/stock/nvda?source=a').params.ticker,'NVDA');
 assert.equal(parse('#/evidence/NVDA').name,'evidence');assert.equal(parse('#/chart/NVDA').name,'chart');
});

test('one sentence retains the accepted date and exact source; unbound text is hidden',()=>{
 setup();const old={...item(),status:'refresh_pending'};
 const block=reading(old);document.querySelector('main').append(block);
 assert.match(block.textContent,/Previous analysis/);assert.match(block.textContent,/conditional on spending/);
 block.querySelector('button').click();assert.match(document.querySelector('#modal').textContent,/Sample Author/);
 assert.equal(document.querySelector('#modal a[target=_blank]').href,'https://example.com/original');
 assert.doesNotMatch(reading({...old,sources:[]}).textContent,/conditional on spending/);
 assert.doesNotMatch(reading({...old,status:'source_changed'}).textContent,/conditional on spending/);
});

test('old and unavailable content cannot appear as current quoted statements',()=>{
 setup();const old=today.changeCard({...change(),earlier_content:true});
 assert.match(old.textContent,/Earlier content added/);assert.match(old.textContent,/2026-09-09/);
 const removed=today.changeCard({...change(),state:'unavailable'});
  assert.doesNotMatch(removed.textContent,/Orders may recover/);assert.equal(removed.querySelector('button'),null);
  assert.equal(reading({status:'pending',records:0}).textContent,copy['app.focus.no_research']);
  assert.equal(reading({status:'pending',records:null}).textContent,copy['app.focus.analysis_waiting']);
  assert.equal(reading({status:'read_pending',records:null}).textContent,copy['app.focus.summary_loading']);
});

test('Today search reaches the backend, preserves pagination and performs no per-card requests',async()=>{
 const root=setup(),calls=[];
 globalThis.fetch=async(input,options)=>{const url=new URL(input,'https://ducky.test');calls.push([url,options.method]);
  if(url.pathname==='/me/stock-research')return Response.json({items:[item()]});
  return Response.json({items:[change(url.searchParams.has('q')?99:1)],next_cursor:url.searchParams.has('before')?null:'next'});
 };
 const dispose=await today.mount(root);
 assert.equal(calls.length,2);assert.equal(calls.find(c=>c[0].pathname==='/me/research-changes')[0].searchParams.get('earlier'),'false');
 root.querySelector('.change-card button').click();assert.equal(calls.length,2);closeModal();
 root.querySelector('input[type=search]').value='unloaded author';root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));await pause();
 assert.ok(calls.at(-1)[0].searchParams.get('q')==='unloaded author');
 [...root.querySelectorAll('button')].find(b=>b.textContent==='More records').click();await pause();
 assert.equal(calls.at(-1)[0].searchParams.get('before'),'next');assert.ok(calls.every(c=>c[1]==='GET'));dispose();
});

test('malformed/failed research is not a successful empty day and late accounts do not receive text',async()=>{
 const root=setup();globalThis.fetch=async()=>Response.json({unexpected:true});
 let dispose=await today.mount(root);assert.equal(root.querySelector('.focus-empty'),null);assert.ok(root.querySelector('.errbox'));dispose();
 root.replaceChildren();let finish;globalThis.fetch=async url=>url.startsWith('/me/stock-research')?Response.json({items:[]}):await new Promise(r=>finish=r);
 const pending=today.mount(root);await pause();store.bumpEpoch();finish(Response.json({items:[change()]}));dispose=await pending;
 assert.equal(root.querySelector('.change-card'),null);dispose();
});

test('returning to research restores filters and pages through fresh source checks; another account starts clean',async()=>{
 const root=setup(),calls=[];
 globalThis.fetch=async input=>{const url=new URL(input,'https://ducky.test');calls.push(url);
  if(url.pathname==='/me/stock-research')return Response.json({items:[]});
  return Response.json({items:[change(url.searchParams.has('before')?2:1)],next_cursor:url.searchParams.has('before')?null:'second'});
 };
 let dispose=await today.mount(root);
 const range=root.querySelector('select');range.value='365';range.dispatchEvent(new window.Event('change'));await pause();
 root.querySelector('input[type=search]').value='specific author';root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));await pause();
 [...root.querySelectorAll('button')].find(b=>b.textContent==='More records').click();await pause();dispose();root.replaceChildren();
 const start=calls.length;dispose=await today.mount(root);
 assert.equal(root.querySelector('select').value,'365');assert.equal(root.querySelector('input[type=search]').value,'specific author');
 assert.equal(root.querySelectorAll('.change-card').length,2);
 const reads=calls.slice(start).filter(u=>u.pathname==='/me/research-changes');
 assert.equal(reads.length,2);assert.ok(reads.every(u=>u.searchParams.get('q')==='specific author'));assert.equal(reads[1].searchParams.get('before'),'second');
 dispose();store.bumpEpoch();root.replaceChildren();dispose=await today.mount(root);
 assert.equal(root.querySelector('select').value,'1');assert.equal(root.querySelector('input[type=search]').value,'');dispose();
});

test('watchlist defaults to a compact list with shared research and direct maps',async()=>{
 const root=setup();globalThis.fetch=async url=>Response.json(url==='/me/stock-research'?{items:[item()]}:
  {items:[{ticker:'NVDA'}],overview:{items:[{ticker:'NVDA',company:'NVIDIA',price:98,price_status:'ready',price_session:'2026-09-09',change_pct:0}]}});
 const dispose=await watch.mount(root);assert.equal(root.querySelectorAll('.watch-compact-table tbody tr').length,1);
 assert.equal(root.querySelector('.stock-name').getAttribute('href'),'#/stock/NVDA');assert.match(root.textContent,/conditional on spending/);
 assert.ok(root.querySelector('.watch-metric'));assert.ok(root.querySelector('a[href="#/evidence/NVDA"]'));assert.equal(root.querySelector('[data-mode=list]').getAttribute('aria-pressed'),'true');dispose();
});

test('an explicitly empty watchlist shows onboarding, while unreadable research does not imply no watches',async()=>{
 const root=setup();let count=0;
 globalThis.fetch=async url=>Response.json(url==='/me/stock-research'?{items:[],watchlist_count:count}:{items:[],next_cursor:null});
 let dispose=await today.mount(root);assert.equal(root.querySelector('.focus-filters').hidden,true);
 assert.ok(root.querySelector('a[href="#/watchlist"]'));dispose();root.replaceChildren();count=2;
 dispose=await today.mount(root);assert.equal(root.querySelector('.focus-filters').hidden,false);
 assert.doesNotMatch(root.textContent,/Follow stocks you are researching/);dispose();
});

test('quotes render before slow research and failed membership is not erased by a late summary',async()=>{
 const root=setup();let finish;
 globalThis.fetch=async url=>url==='/me/stock-research'?await new Promise(r=>finish=r):Response.json({items:[{ticker:'NVDA'}],overview:{items:[{ticker:'NVDA',price:98,price_status:'ready',price_session:'2026-09-09'}]}});
 let pending=watch.mount(root);await pause();assert.match(root.querySelector('.watch-compact-table tbody tr').textContent,/98/);
 assert.equal(root.querySelector('.stock-reading').textContent,copy['app.focus.summary_loading']);
 assert.equal(root.querySelector('button[data-mode="list"]').getAttribute('aria-pressed'),'true');
 assert.ok(root.querySelector('a[href="#/evidence/NVDA"]'));
 finish(Response.json({items:[item()]}));let dispose=await pending;
 assert.match(root.querySelector('.stock-one-sentence').textContent,/conditional on spending/);
 assert.doesNotMatch(root.querySelector('.stock-reading').textContent,/Loading saved analysis/);
 dispose();root.replaceChildren();
 globalThis.fetch=async url=>url==='/me/stock-research'?await new Promise(r=>finish=r):Response.json({error:'unavailable'},{status:503});
 pending=watch.mount(root);await pause();assert.ok(root.querySelector('.errbox'));
 finish(Response.json({items:[item()]}));dispose=await pending;assert.ok(root.querySelector('.errbox'));assert.equal(root.querySelector('.watch-compact-table tbody tr'),null);dispose();
});

test('stock overview preserves opposing evidence and loads history only on expansion',async()=>{
 const root=setup(),calls=[];const n=node(),other=node('counter','counter');
 globalThis.fetch=async input=>{const url=new URL(input,'https://ducky.test');calls.push(url.pathname);
  if(url.pathname.startsWith('/bars/'))return Response.json({bars:[{t:'2026-09-08',c:100},{t:'2026-09-09',c:95}]});
  if(url.pathname==='/me/research-changes')return Response.json({items:[change()],next_cursor:null});
  return Response.json({ticker:'NVDA',price:{price:95,price_session:'2026-09-09'},evidence:{ticker:'NVDA',nodes:[n,node('b'),node('c'),other],analysis_status:'ready',analysis_generated_at:item().as_of,
    analysis:{overview:item().overview,sections:[]}}});
 };
 const dispose=await stock.mount(root,{ticker:'NVDA'});assert.equal(calls.length,2);
 assert.equal(root.querySelectorAll('.stock-source-card').length,3);assert.ok([...root.querySelectorAll('.stock-source-card')].some(card=>/Bearish viewpoint/.test(card.textContent)));
 assert.equal(root.querySelector('.focus-history').open,false);root.querySelector('.focus-history').open=true;await pause();
 assert.equal(calls.filter(p=>p==='/me/research-changes').length,1);dispose();
});

test('price inspection retains losses, missing quotes and the actual closing date',()=>{
 setup();const chart=closingChart({bars:[{t:'2026-09-08',c:100},{t:'2026-09-09',c:90}]});
 const slider=chart.querySelector('input');assert.match(chart.textContent,/90/);slider.value=0;slider.dispatchEvent(new window.Event('input'));assert.match(chart.querySelector('output').textContent,/2026-09-08.*100/);
 assert.equal(closingPoints({bars:[{t:Infinity,c:2},{t:'2026-09-09',c:null},{t:'2026-09-09',c:0}]}).length,0);
 const price=compactPrice({price:90,change_pct:-10,price_session:'2026-09-09'});assert.match(price.textContent,/-10/);assert.match(price.textContent,/2026-09-09/);
 assert.doesNotMatch(compactPrice({price:null,change_pct:null}).textContent,/0\.0/);
 const now=new Date(2026,8,10,0,30);assert.equal(new Date(dayWindow(now).since).getHours(),0);
});

const sharedUpdate=(root,path,value)=>{
 const detail={path,value,accepted:false};root.dispatchEvent(new window.CustomEvent('ducky:shared-read',{detail}));return detail.accepted;
};
test('shared watchlist updates preserve reading focus and filters, and never restore removed stocks',async()=>{
 const root=setup();let reads=0;
 globalThis.fetch=async url=>{reads++;return Response.json(url==='/me/stock-research'?{items:[{ticker:'NVDA',status:'pending'}]}:
  {items:['NVDA'],overview:{items:[{ticker:'NVDA',price:100}]}});};
 const dispose=await watch.mount(root);const filter=root.querySelector('.watch-filter');filter.value='nvd';filter.dispatchEvent(new window.Event('input'));
 root.querySelector('[data-map-open]').focus();
 assert.ok(sharedUpdate(root,'/me/stock-research',{items:[item(),item('AMD')]}));
 assert.match(root.textContent,/conditional on spending/);assert.equal(root.querySelectorAll('.watch-compact-table tbody tr').length,1);
 assert.equal(root.querySelector('.watch-filter').value,'nvd');assert.equal(document.activeElement.dataset.readingKey,'NVDA:map');
 assert.equal(reads,2);store.bumpEpoch();assert.equal(sharedUpdate(root,'/me/stock-research',{items:[]}),false);dispose();
});

test('Today adopts a completed summary without rerunning searches, and withholds withdrawn text',async()=>{
 const root=setup();let reads=0;
 globalThis.fetch=async url=>{reads++;return Response.json(url==='/me/stock-research'?{watchlist_count:1,items:[{ticker:'NVDA',status:'pending'}]}:{items:[change()],next_cursor:null});};
 const dispose=await today.mount(root);assert.ok(root.querySelector('.focus-latest .stock-open'));
 const search=root.querySelector('input[type=search]');search.value='my unsubmitted search';search.focus();
 assert.ok(sharedUpdate(root,'/me/stock-research',{items:[item()]}));assert.equal(document.activeElement,search);
 assert.match(root.querySelector('.focus-latest').textContent,/conditional on spending/);assert.equal(reads,2);
 assert.ok(sharedUpdate(root,'/me/stock-research',{items:[{...item(),status:'withdrawn',sources:[]}]}));
 assert.doesNotMatch(root.querySelector('.focus-latest').textContent,/conditional on spending/);
 assert.match(root.querySelector('.focus-latest').textContent,/withdrawn/);assert.equal(search.value,'my unsubmitted search');dispose();
});

test('stock refresh keeps expanded reasons and exact source dialogs, closes withdrawn sources and retains inspected dates',async()=>{
 const root=setup(),n=node(),summary=item();
 const data={ticker:'NVDA',price:{price:100},evidence:{ticker:'NVDA',nodes:[n],analysis_status:'ready',analysis_generated_at:summary.as_of,
  analysis:{overview:summary.overview,sections:[{kind:'key_points',...summary.overview}]}}};
 globalThis.fetch=async url=>Response.json(url.startsWith('/bars/')?{bars:[{t:'2026-09-08',c:100},{t:'2026-09-09',c:95}]}:data);
 const dispose=await stock.mount(root,{ticker:'NVDA'});
 root.querySelector('.evidence-analysis-details').open=true;
 const button=root.querySelector('.evidence-analysis-overview .brief-citation');button.focus();button.click();
 assert.ok(sharedUpdate(root,'/stock-research/NVDA',{...data,price:{price:102}}));
 assert.equal(document.querySelector('#modal').hidden,false);assert.equal(root.querySelector('.evidence-analysis-details').open,true);
 closeModal();assert.equal(document.activeElement.dataset.readingKey,button.dataset.readingKey);
 const slider=root.querySelector('.stock-chart-scrub');slider.value='0';slider.dispatchEvent(new window.Event('input'));slider.focus();
 assert.ok(sharedUpdate(root,'/bars/NVDA?period=6mo',{bars:[{t:'2026-09-08',c:100},{t:'2026-09-09',c:95},{t:'2026-09-10',c:97}]}));
 assert.match(document.activeElement.getAttribute('aria-valuetext'),/^2026-09-08/);
 root.querySelector('.evidence-analysis-overview .brief-citation').click();
 assert.ok(sharedUpdate(root,'/stock-research/NVDA',{...data,evidence:{ticker:'NVDA',nodes:[],analysis_status:'withdrawn'}}));
 assert.equal(document.querySelector('#modal').hidden,true);assert.doesNotMatch(root.textContent,/conditional on spending/);dispose();
});

test('an untouched price chart follows the new close; unavailable summaries do not claim review is underway',async()=>{
 const root=setup();globalThis.fetch=async url=>Response.json(url.startsWith('/bars/')?{bars:[{t:'2026-09-08',c:100},{t:'2026-09-09',c:95}]}:
  {ticker:'NVDA',evidence:{nodes:[],analysis_status:'pending'}});
 const dispose=await stock.mount(root,{ticker:'NVDA'});
 sharedUpdate(root,'/bars/NVDA?period=6mo',{bars:[{t:'2026-09-08',c:100},{t:'2026-09-09',c:95},{t:'2026-09-10',c:97}]});
 assert.match(root.querySelector('.stock-chart-scrub').getAttribute('aria-valuetext'),/^2026-09-10/);dispose();
 for(const status of ['pending','failed','insufficient','source_changed','withdrawn'])assert.doesNotMatch(reading({status}).textContent,/being reviewed|Sources are available/);
});

test('column sorting toggles direction, keeps unknown values last and does not refetch',async()=>{
 const root=setup();store.set('watchlist',['AAA','BBB','CCC']);let reads=0;
 const rows=[{ticker:'AAA',price:10,market_cap:100,metrics:{ytd:{status:'ready',value:0}}},
  {ticker:'BBB',price:9,market_cap:200,metrics:{ytd:{status:'ready',value:-12}}},
  {ticker:'CCC',price:null,market_cap:null,metrics:{ytd:{status:'insufficient'}}}];
 globalThis.fetch=async url=>{reads++;return Response.json(url==='/me/stock-research'?{items:rows.map(r=>item(r.ticker))}:{items:rows,overview:{items:rows}});};
 const dispose=await watch.mount(root),order=()=>[...root.querySelectorAll('tbody tr')].map(n=>n.dataset.readingAnchor);
 assert.deepEqual(order(),['BBB','AAA','CCC']);
 const select=()=>root.querySelector('[data-sort=ytd]');select().click();assert.deepEqual(order(),['AAA','BBB','CCC']);
 assert.equal(select().parentElement.getAttribute('aria-sort'),'descending');select().focus();select().click();
 assert.deepEqual(order(),['BBB','AAA','CCC']);assert.equal(document.activeElement.dataset.readingKey,'sort:ytd');
 assert.equal(select().parentElement.getAttribute('aria-sort'),'ascending');assert.equal(reads,2);
 const table=root.querySelector('.watch-table-scroll');table.scrollLeft=380;
 root.querySelector('[data-sort=ticker]').click();assert.equal(root.querySelector('.watch-table-scroll').scrollLeft,380);
 assert.equal(root.querySelector('.watch-controls select'),null);
 assert.deepEqual([...root.querySelectorAll('[data-mode]')].map(n=>n.dataset.mode),['list','reading','heatmap']);
 assert.equal(root.querySelectorAll('[data-map-open]').length,3);dispose();
});

test('Explore has useful examples without watches, opens a seven-day feed and never generates on read',async()=>{
 const {mount}=await import('../public/js/app/views/explore.js');
 const root=setup();store.set('watchlist',[]);const calls=[];
 globalThis.fetch=async(input,options)=>{calls.push({url:new URL(input,'https://ducky.test'),method:options.method});return Response.json({items:[]});};
 const dispose=await mount(root);
 assert.equal(root.querySelectorAll('.research-example').length,3);
 assert.ok(root.querySelector('a[href="#/evidence/GLW?example=GLW"]'));
 assert.equal(root.querySelector('.focus-filters select').value,'7');
 assert.ok(root.querySelector('a[href="#/creators?scope=discover"]'));
 assert.equal(root.querySelector('details.focus-tools'),null);
 assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');assert.equal(calls[0].url.searchParams.get('scope'),'all');dispose();
});

test('pending stock analysis still shows the saved information map without an extra fetch',async()=>{
 const root=setup(),calls=[];globalThis.fetch=async input=>{calls.push(input);return Response.json(input.startsWith('/bars/')?{bars:[]}:
  {ticker:'NEW',price:{price:22},evidence:{ticker:'NEW',nodes:[node()],analysis_status:'pending'}});};
 const dispose=await stock.mount(root,{ticker:'NEW'});
 assert.ok(root.querySelector('.stock-core-actions a[href="#/evidence/NEW"]'));
 assert.ok(root.querySelector('.stock-information-map .evidence-node'));
 assert.equal(root.querySelectorAll('.evidence-analysis').length,1);assert.equal(calls.length,2);dispose();
});
