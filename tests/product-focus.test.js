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

test('three destinations and stock deep links survive sign-in without arbitrary queries',()=>{
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

test('watchlist defaults to readable research and a single stock destination',async()=>{
 const root=setup();globalThis.fetch=async url=>Response.json(url==='/me/stock-research'?{items:[item()]}:
  {items:[{ticker:'NVDA'}],overview:{items:[{ticker:'NVDA',company:'NVIDIA',price:98,price_status:'ready',price_session:'2026-09-09',change_pct:0}]}});
 const dispose=await watch.mount(root);assert.equal(root.querySelectorAll('.stock-list-row').length,1);
 assert.equal(root.querySelector('.stock-name').getAttribute('href'),'#/stock/NVDA');assert.match(root.textContent,/conditional on spending/);
 assert.equal(root.querySelector('.watch-metric'),null);dispose();
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
 let pending=watch.mount(root);await pause();assert.match(root.querySelector('.stock-list-row').textContent,/98/);
 finish(Response.json({items:[item()]}));let dispose=await pending;dispose();root.replaceChildren();
 globalThis.fetch=async url=>url==='/me/stock-research'?await new Promise(r=>finish=r):Response.json({error:'unavailable'},{status:503});
 pending=watch.mount(root);await pause();assert.ok(root.querySelector('.errbox'));
 finish(Response.json({items:[item()]}));dispose=await pending;assert.ok(root.querySelector('.errbox'));assert.equal(root.querySelector('.stock-list-row'),null);dispose();
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
 assert.equal(root.querySelectorAll('.stock-source-card').length,3);assert.match(root.querySelectorAll('.stock-source-card')[2].textContent,/Bearish viewpoint/);
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
