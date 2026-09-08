import {test, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body><script id="ducky-strings"></script></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
document.querySelector('script').textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
const store=await import('../public/js/app/store.js');
const {candidateCard,ratingValue,discoveryQuery,mount}=await import('../public/js/app/views/opportunities.js');
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setTimeout(r,0));};
const event=(node,type='change')=>node.dispatchEvent(new dom.window.Event(type,{bubbles:true}));
const rating={status:'ready',stars:2,version:'opportunity-rating/1',basis:'research_attention_not_expected_return',components:[
 {key:'price_dislocation',value:1,max:1},{key:'stabilization',value:1,max:1},
 {key:'peer_lag',value:0,max:1},{key:'valuation_support',value:null,max:1},{key:'business_support',value:0,max:1}]};
const item=ticker=>({ticker,company:'Layout fixture only',sector:'Technology',market_cap:3e9,as_of:'2026-09-04',current_price:8,ma252:12,
 price_series:[{date:'2026-09-03',close:10},{date:'2026-09-04',close:8}],technical:{rsi_d:29,dd_pct:-30,ma252_pct:-33.3,iv_hv:null},
 relative:{status:'ready',kind:'industry_etf',benchmark:'SOXX',symbols:['SOXX'],as_of:'2026-09-04',excess20:-3,
 windows:{20:{status:'ok',start:'2026-08-07',end:'2026-09-04'}}},
 fundamentals:{status:'provider_snapshot',as_of:'2026-09-05T01:00:00Z',source_url:'https://finance.yahoo.com/quote/EXMP/key-statistics/',
 forward_pe:0,fcf_yield:5.2,revenue_growth:0,net_debt:-1000000},
 priority:structuredClone(rating),explanation:{status:'ready',why_fell:{en:'Fixture earnings context',zh:'布局测试财报背景'},
 risks:{en:'Fixture uncertainty',zh:'布局测试风险'},sources:[{url:'https://example.com/release',title:'Fixture source',published_at:'2026-09-03T10:00:00Z'}]},in_watchlist:false});
const packet=(items=[],extra={})=>({version:'oversold-discovery-v1',status:'partial',as_of:'2026-09-04',built_at:'2026-09-05T01:00:00Z',
 coverage:{universe_name:'Test directory',universe_count:500,checked:50,qualified:3,unknown:4,enriched:3,explained:1,scope_complete:false},
 filters:{sectors:['Technology','Financial Services']},total:items.length,next_cursor:null,items,...extra});
let cleanups=[];
afterEach(()=>{for(const fn of cleanups)fn();cleanups=[];document.querySelectorAll('.test-root').forEach(n=>n.remove());store.bumpEpoch();});
async function open(fetcher){store.set('me',{tier:'pro'});store.set('token','session-A');globalThis.fetch=fetcher;
 const root=document.createElement('div');root.className='test-root';document.body.append(root);cleanups.push(await mount(root));return root;}

test('URL filters send USD bounds, server watchlist scope and a bounded search',()=>{
 const q=new URLSearchParams(discoveryQuery({cap:'mid',scope:'outside',sector:'Financial Services',query:' X & Y ',iv_hv_max:1,sort:'drawdown'},30));
 assert.equal(q.get('cap_min'),'2000000000');assert.equal(q.get('cap_max'),'10000000000');
 assert.equal(q.get('scope'),'outside');assert.equal(q.get('query'),'X & Y');assert.equal(q.get('sector'),'Financial Services');
 assert.equal(q.get('cursor'),'30');assert.equal(q.get('iv_hv_max'),'1');
 assert.equal(new URLSearchParams(discoveryQuery({query:'A'.repeat(100)})).get('query').length,80);
});
test('ratings preserve genuine zero, but never create stars for missing or malformed evidence',()=>{
 assert.equal(ratingValue({...rating,stars:0}),0);
 for(const p of [{...rating,status:'insufficient_evidence'},{...rating,stars:null},{...rating,stars:true},
  {...rating,basis:'expected_return'},{...rating,components:[{key:'x',value:Infinity,max:1}]},{...rating,components:[]},
  {...rating,components:rating.components.map(p=>({...p,key:'price_dislocation'}))},
  {...rating,components:rating.components.map(p=>({...p,value:true}))}])
  assert.equal(ratingValue(p),null);
 const card=candidateCard({...item('EXMP'),priority:{...rating,status:'insufficient_evidence',stars:5}});
 assert.equal(card.querySelector('.opportunity-stars'),null);assert.ok(card.textContent.includes('Insufficient evidence'));
});
test('provider ratios retain zero and percentage points without claiming comparable valuation',()=>{
 const card=candidateCard(item('EXMP'));
 assert.ok(card.textContent.includes('0.0×'));assert.ok(card.textContent.includes('+5.2%'));
 assert.ok(card.textContent.includes('accounting consistency'));assert.ok(card.textContent.includes('not available yet'));
 assert.ok(card.querySelector('a[href="https://finance.yahoo.com/quote/EXMP/key-statistics/"]'));
 assert.ok(card.textContent.includes('Industry ETF reference'));assert.ok(!card.textContent.includes('Business peers,'));
 assert.ok(card.textContent.includes('2026-08-07 to 2026-09-04'));
 assert.ok(card.textContent.includes('Fixture earnings context'));
 assert.ok(card.querySelector('a[href="#/research/EXMP"]'));assert.ok(card.querySelector('a[href="#/alerts?ticker=EXMP"]'));
});
test('stale comparisons and unsourced or unsafe explanations are withheld',()=>{
 const row=item('EXMP');row.relative.as_of='2026-09-03';row.explanation.sources=[{url:'javascript:alert(1)'}];
 const card=candidateCard(row);
 assert.ok(!card.textContent.includes('3.0 pp behind'));assert.ok(!card.textContent.includes('Fixture earnings context'));
 assert.equal(card.querySelector('a[href^="javascript:"]'),null);
 row.relative.as_of=row.as_of;row.relative.windows[20].end='2026-09-02';
 assert.ok(!candidateCard(row).textContent.includes('3.0 pp behind'));
 row.explanation.sources=[{url:'https://example.com'}];row.explanation.status='drafted';
 assert.ok(!candidateCard(row).textContent.includes('Fixture earnings context'));
});
test('comparable valuation requires a same-date supported metric and retains peer sample',()=>{
 const row=item('EXMP');row.priority.valuation={status:'ready',metric:'pe_ttm',target:10,median:14,sample:3,
 symbols:['AAA','BBB','CCC'],period_end:'2026-06-30',as_of:row.as_of};
 assert.ok(candidateCard(row).textContent.includes('median 14.0× across 3 peers'));
 row.priority.valuation.as_of='2026-09-03';assert.ok(!candidateCard(row).textContent.includes('median 14.0'));
});
test('filters operate through one cached endpoint and a late previous-filter response cannot overwrite the new result',async()=>{
 let resolveOld;const urls=[];
 const root=await open(async url=>{urls.push(String(url));const q=new URL(String(url),'https://ducky.test').searchParams;
  if(q.get('sector')==='Technology')return new Promise(r=>resolveOld=r);
  return response(packet([item(q.get('cap_min')?'NEWCAP':'INITIAL')]));});
 assert.equal(urls.length,1);assert.ok(urls[0].startsWith('/opportunities?'));
 const sector=root.querySelector('[name=sector]');sector.value='Technology';event(sector);await flush();
 assert.equal(root.querySelectorAll('.opportunity-card').length,0);
 const cap=root.querySelector('[name=cap]');sector.value='';event(sector);cap.value='mid';event(cap);await flush();
 resolveOld(response(packet([item('LATEOLD')])));await flush();
 assert.deepEqual([...root.querySelectorAll('.opportunity-card')].map(n=>n.dataset.ticker),['NEWCAP']);
 assert.ok(urls.every(url=>url.startsWith('/opportunities?')));
 assert.ok(root.textContent.includes('50 of 500 checked'));
});
test('pagination is single-flight, de-duplicates rows and focuses the first newly loaded stock',async()=>{
 let pageCalls=0,finish;
 const root=await open(async url=>new URL(String(url),'https://ducky.test').searchParams.has('cursor')?
  (pageCalls++,new Promise(r=>finish=r)):response(packet([item('AAA')],{next_cursor:30,total:3})));
 const more=root.querySelector('.opportunity-paging button');more.click();more.click();await flush();assert.equal(pageCalls,1);
 finish(response(packet([item('AAA'),item('BBB')],{total:3})));await flush();
 assert.equal(root.querySelectorAll('.opportunity-card').length,2);assert.equal(document.activeElement.textContent,'$BBB');
});
test('pagination restarts at the first page when its daily snapshot changed',async()=>{
 let firstCalls=0;
 const root=await open(async url=>{
  if(new URL(String(url),'https://ducky.test').searchParams.has('cursor'))return response(packet([item('MIDPAGE')],{built_at:'2026-09-05T02:00:00Z'}));
  firstCalls++;return response(packet([item(firstCalls===1?'OLDFIRST':'NEWFIRST')],{next_cursor:firstCalls===1?30:null,total:2,
   built_at:firstCalls===1?'2026-09-05T01:00:00Z':'2026-09-05T02:00:00Z'}));});
 root.querySelector('.opportunity-paging button').click();await flush();
 assert.equal(firstCalls,2);assert.deepEqual([...root.querySelectorAll('.opportunity-card')].map(n=>n.dataset.ticker),['NEWFIRST']);
});
test('unmount and token changes stop late DOM writes, including missing epoch changes',async()=>{
 for(const reason of ['abort','token']){
  store.set('me',{tier:'pro'});store.set('token','session-A');let finish;
  globalThis.fetch=()=>new Promise(r=>finish=r);
  const root=document.createElement('div'),ctl=new AbortController();
  const mounting=mount(root,{signal:ctl.signal});await flush();
  if(reason==='abort')ctl.abort();else store.set('token','session-B');
  finish(response(packet([item('SECRET')])));const cleanup=await mounting;cleanup();
  assert.ok(!root.textContent.includes('SECRET'));assert.ok(!root.classList.contains('opportunities-view'));
 }
});
test('payment expiry presents access information and never keeps candidate cards',async()=>{
 const root=await open(async()=>response({detail:'pro_required'},402));
 assert.equal(root.querySelector('.opportunity-card'),null);assert.ok(root.querySelector('a[href="#/billing"]'));
});

test('a complete universe directory does not imply its price scan is complete',async()=>{
 const root=await open(async()=>response(packet([item('EXMP')],{coverage:{universe_name:'US exchange directory',universe_count:3699,
   checked:2,qualified:2,unknown:null,enriched:2,explained:0,scope_complete:true}})));
 assert.ok(root.textContent.includes('2 of 3,699 checked'));
 assert.ok(root.textContent.includes('This directory scan is not yet complete.'));
 assert.ok(root.textContent.includes('Stock-check progress and data gaps are reported separately'));
 assert.ok(!root.textContent.includes('The directory scan is complete.'));
 assert.ok(root.textContent.includes('— lack sufficient data'));
});
