import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/#/watchlist'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount}=await import('../public/js/app/views/watchlist.js');
const {referenceSummary}=await import('../public/js/app/watchlist-overview.js');
const root=document.querySelector('main');
const view={status:'ready',generated_at:'2026-09-25T20:00:00Z',session:'2026-09-25',overall:{en:'Synthetic main view.',zh:'测试总评。'},
 left:{en:'Synthetic long-term condition.',zh:'测试长线条件。'},right:{en:'Synthetic trend condition.',zh:'测试趋势条件。'}};
const row={ticker:'NVDA',company:'Synthetic NVIDIA',price:220,price_session:'2026-09-25',price_status:'ready',change_pct:0,market_cap:5e12,market_cap_status:'ready',digest:{views:view},
 quote:{price:224,status:'current',quote_at:new Date(Date.now()-2000).toISOString(),age_seconds:2,change_pct:1.8,provider:'test-provider',feed:'test-feed'},
 metrics:{ytd:{status:'ready',value:0,as_of:'2026-09-25'},drawdown:{status:'ready',value:-4,as_of:'2026-09-25'},relative:{status:'ready',value:1.2,symbols:['QQQ'],as_of:'2026-09-25'},
 iv_hv:{status:'ready',value:.8,iv:40,hv:50,as_of:'2026-09-25',expiry:'2026-10-16'},attention:{status:'ready',value:30,as_of:'2026-09-25'},degen:{status:'ready',value:45,as_of:'2026-09-25'}}};
const unknown={ticker:'TSM',company:'Synthetic unavailable company',price:null,change_pct:null,price_status:'missing',metrics:{}};
const research={ticker:'NVDA',status:'ready',as_of:'2026-09-25T20:10:00Z',overview:{en:'Synthetic reviewed source-bound summary.',zh:'测试已审摘要。',citations:['source']},
 sources:[{id:'source',kind:'creator',stance:'support',title:{en:'Synthetic source',zh:'测试来源'},published_at:'2026-09-24',evidence:[{author:'Synthetic author',source_url:'https://example.com/synthetic-only'}]}]};
const brief={items:[{ticker:'NVDA',evidence:[{topic:'option_concentrations',observed_at:'2026-09-24T21:00:00Z',data:{put_wall:210,call_wall:230,expiries:['2026-10-16']}},
 {topic:'price_position',observed_at:'2026-09-25T20:00:00Z',data:{price:220,low:205,high:240,sessions:20}}]}]};
async function setup({tickers=['NVDA','TSM'],query=new URLSearchParams()}={}){
 store.bumpEpoch();store.set('me',{user_id:123,tier:'pro',watch_cap:50,access:{billing_enabled:false}});store.set('token','synthetic-only');store.set('watchlist',tickers);store.set('snapshots',{});
 root.replaceChildren();history.replaceState(null,'','#/watchlist'+(query.size?'?'+query:''));
 const requests=[];
 globalThis.fetch=async(url,options={})=>{
  assert.equal(options.method||'GET','GET','view changes and references never write to the account');requests.push(url);
  if(url==='/watchlist')return Response.json({items:tickers,cap:50,overview:{items:[row,unknown].filter(item=>tickers.includes(item.ticker)),session:'2026-09-25'}});
  if(url==='/me/stock-research')return Response.json({items:tickers.includes('NVDA')?[research]:[],watchlist_count:tickers.length});
  if(url==='/briefing/stocks?fields=signals')return Response.json(brief);
  if(url.startsWith('/radar/archive.json'))return Response.json({items:[],next_cursor:null});
  throw Error('Unexpected data request: '+url);
 };
 return {requests,dispose:await mount(root,{query})};
}

test('List starts compact with both perspectives and direct research, map, metric, alert and disclosure actions',async()=>{
 const {requests,dispose}=await setup();
 try{
  assert.equal(root.querySelector('[data-mode=list]').getAttribute('aria-pressed'),'true');
  assert.equal(root.querySelectorAll('thead th').length,5);
  const stock=root.querySelector('[data-reading-anchor=NVDA]');
  assert.match(stock.textContent,/Synthetic main view/);assert.match(stock.textContent,/Synthetic long-term condition/);assert.match(stock.textContent,/Synthetic trend condition/);
  const routes=[...stock.querySelectorAll('a')].map(a=>a.getAttribute('href'));
  for(const href of ['#/stock/NVDA','#/stock/NVDA?tab=evidence','#/stock/NVDA?tab=metrics','#/alerts?ticker=NVDA','#/boards?mode=archive&ticker=NVDA','#/chart/NVDA'])assert.ok(routes.includes(href),JSON.stringify({href,routes}));
  assert.equal(root.querySelectorAll('button a, a button').length,0);
  const reads=requests.length;root.querySelector('[data-mode=metrics]').click();
  assert.equal(requests.length,reads);assert.equal(root.querySelectorAll('thead .watch-signal-col').length,5);assert.equal(root.querySelectorAll('thead .watch-help-col').length,6);
  const headers=[...root.querySelectorAll('thead th')];
  assert.deepEqual(headers.slice(0,8).map(th=>th.querySelector('[data-sort]')?.dataset.sort),['ticker','change_pct','ytd','drawdown','relative','iv_hv','attention','degen']);
  assert.ok(headers.at(-1).classList.contains('watch-cap-col'));assert.equal(headers.length,14);
  assert.equal(root.querySelector('.watch-overview-col,.watch-overview-cell,.watch-view-col,.watch-view-cell'),null);
  const cells=[...root.querySelector('[data-reading-anchor=NVDA]').children];
  assert.equal(cells[2].querySelector('.watch-metric').dataset.metric,'ytd');assert.match(cells[2].textContent,/0.0%/);
  assert.ok(cells.at(-1).classList.contains('watch-cap-col'));
  assert.doesNotMatch(root.querySelector('.watch-comparison-table').textContent,/Synthetic main view|Synthetic long-term condition|Synthetic trend condition/);
  assert.match(root.querySelector('.watch-mode-note').textContent,/Attention indicators do not measure valuation/);
  root.querySelector('[data-mode=list]').click();assert.equal(root.querySelectorAll('thead th').length,5);assert.ok(root.querySelector('thead th:nth-child(3)').classList.contains('watch-overview-col'));
 }finally{dispose();}
});

test('Overview keeps independent quote and reference clocks, both views and reviewed citations',async()=>{
 const {requests,dispose}=await setup();
 try{
  const reads=requests.length;root.querySelector('[data-mode=reading]').click();assert.equal(requests.length,reads);
  const card=root.querySelector('[data-reading-anchor=NVDA]');
  assert.match(card.querySelector('.watch-research-price').textContent,/224/);
  assert.match(card.querySelector('.watch-reference-strip').textContent,/210.*230.*205.*2026-09-24.*2026-09-25.*2026-10-16/);
  assert.equal(card.querySelector('.watch-reference-strip').nextElementSibling.className,'watch-research-reading');
  assert.equal(card.querySelectorAll('.brief-citation').length,1);assert.match(card.querySelector('.watch-research-reading').textContent,/source-bound summary/);
  assert.equal(card.querySelectorAll('.watch-research-lenses .watch-view-text').length,2);
  const missing=root.querySelector('[data-reading-anchor=TSM]');assert.doesNotMatch(missing.textContent,/\$0|NaN|null|undefined/);
  assert.deepEqual([...missing.querySelectorAll('.watch-reference-level strong')].map(node=>node.textContent),['—','—','—']);
  root.dispatchEvent(new window.CustomEvent('ducky:shared-read',{detail:{path:'/me/stock-research',value:{items:[{ticker:'NVDA',status:'withdrawn',sources:[]}]}}}));
  assert.equal(root.querySelector('.stock-one-sentence'),null);assert.ok(root.querySelector('.watch-reference-strip'));
 }finally{dispose();}
});

test('full table reading retains ticker, exact text and dates, then restores its opener and horizontal position',async()=>{
 const {requests,dispose}=await setup();
 try{
  const scroll=root.querySelector('.watch-table-scroll');scroll.scrollLeft=430;
  const button=root.querySelector('[data-reading-key="NVDA:view:left"]'),reads=requests.length;
  button.focus();button.click();
  const dialog=document.querySelector('[role=dialog]');
  assert.match(dialog.querySelector('h2').textContent,/NVDA.*Investment case/);
  assert.equal(dialog.querySelector('.watch-view-text').textContent,view.left.en);
  assert.equal(dialog.querySelector('.watch-view-date').textContent,button.parentElement.querySelector('.watch-view-date').textContent);
  assert.equal(requests.length,reads,'opening full text reuses the saved reading');
  // Independent prices can update without replacing the reader's paragraph.
  root.dispatchEvent(new window.CustomEvent('ducky:shared-read',{detail:{path:'/watchlist',value:{items:['NVDA','TSM'],cap:50,overview:{items:[{...row,price:221},unknown]}}}}));
  assert.equal(document.querySelector('[role=dialog]'),dialog);
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(document.querySelector('#modal').hidden,true);
  assert.equal(document.activeElement.dataset.readingKey,'NVDA:view:left');
  assert.equal(root.querySelector('.watch-table-scroll').scrollLeft,430);
 }finally{dispose();}
});

test('a revised or withdrawn saved view closes an obsolete full-text reading',async()=>{
 for(const next of [{...view,left:{en:'Revised condition.',zh:'已修订条件。'}},null]){
  const {dispose}=await setup();
  try{
   const button=root.querySelector('[data-reading-key="NVDA:view:left"]');button.focus();button.click();
   root.dispatchEvent(new window.CustomEvent('ducky:shared-read',{detail:{path:'/watchlist',value:{items:['NVDA','TSM'],cap:50,overview:{items:[{...row,digest:{views:next}},unknown]}}}}));
   assert.equal(document.querySelector('#modal').hidden,true);
   assert.equal(document.querySelector('.watch-view-dialog'),null);
  }finally{dispose();}
 }
});

test('filters and sorted metric mode round-trip through the route without another request or losing keyboard focus',async()=>{
 const {requests,dispose}=await setup();let restore;
 try{
  const reads=requests.length;let notices=0;const onRoute=()=>notices++;window.addEventListener('ducky:route-state',onRoute);
  root.querySelector('[data-mode=metrics]').click();const input=root.querySelector('.watch-filter');input.value='Synthetic';input.dispatchEvent(new window.Event('input'));
  const scroller=root.querySelector('.watch-table-scroll');scroller.scrollLeft=400;
  const header=root.querySelector('[data-sort=iv_hv]');header.focus();header.click();
  assert.equal(document.activeElement.dataset.readingKey,'sort:iv_hv');assert.equal(root.querySelector('.watch-table-scroll').scrollLeft,400);
  assert.equal(root.querySelector('tbody tr:last-child').dataset.readingAnchor,'TSM');
  root.querySelector('[data-sort=iv_hv]').click();assert.equal(root.querySelector('tbody tr:last-child').dataset.readingAnchor,'TSM');
  restore=new URLSearchParams(location.hash.split('?')[1]);assert.equal(restore.get('view'),'metrics');assert.equal(restore.get('q'),'Synthetic');assert.equal(restore.get('sort'),'iv_hv');
  assert.equal(requests.length,reads);assert.ok(notices>=3);window.removeEventListener('ducky:route-state',onRoute);
 }finally{dispose();}
 const next=await setup({query:restore});
 try{assert.equal(root.querySelector('[data-mode=metrics]').getAttribute('aria-pressed'),'true');assert.equal(root.querySelector('.watch-filter').value,'Synthetic');assert.equal(root.querySelector('[data-sort=iv_hv]').parentElement.getAttribute('aria-sort'),'ascending');}
 finally{next.dispose();}
});

test('an empty watchlist offers real search or Explore without inventing membership or price references',async()=>{
 const {dispose}=await setup({tickers:[]});
 try{
  assert.equal(root.querySelector('.watch-controls').hidden,true);assert.equal(root.querySelector('.watch-mode-note').hidden,true);
  assert.ok(root.querySelector('.watch-first-use a[href="#/explore?tab=research"]'));
  assert.equal(root.querySelector('.watch-add-options').open,true);assert.equal(root.querySelector('.watch-add-options>summary').hidden,true);
  assert.equal(root.querySelector('.watch-add-options .add-row>button').hidden,true);assert.equal(root.querySelector('.watch-first-use img'),null);
  assert.deepEqual(store.get('watchlist'),[]);
  const refs=referenceSummary({ticker:'EMPTY'},null);assert.deepEqual([...refs.querySelectorAll('strong')].map(n=>n.textContent),['—','—','—']);
 }finally{dispose();}
});
