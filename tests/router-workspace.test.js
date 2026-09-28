import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<html data-lang="en"><body><nav class="app-nav focus-nav"><a data-route="watchlist"></a><a data-route="explore"></a></nav><main class="app-main"><div id="view"></div></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/#/watchlist',pretendToBeVisual:true});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const focusCalls=[];window.HTMLElement.prototype.scrollIntoView=function(){focusCalls.push(this.dataset.metricFocus||this.id);};
const script=document.createElement('script');script.id='ducky-strings';script.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(script);
const store=await import('../public/js/app/store.js');
const router=await import('../public/js/app/router.js');
const main=document.querySelector('.app-main'),root=document.querySelector('#view');
let user='account-a';const requests=[];
let archiveRows=[];
const record={id:'synthetic:canonical',ticker:'NVDA',kind:'insider',board:'insider',direction:1,ts:'2026-09-25T12:00:00Z',reporter_name:'Synthetic officer',summary:'Synthetic filing for navigation testing',extra:{message_text:'Synthetic filing for navigation testing',asset_type:'ST'}};
const row={ticker:'NVDA',company:'Synthetic company',price:220,price_status:'ready',price_session:'2026-09-25',change_pct:0,market_cap:100,metrics:{iv_hv:{status:'ready',value:.8}}};
globalThis.fetch=async(url,options={})=>{
 assert.equal(options.method||'GET','GET');requests.push({url,user});
 if(url==='/watchlist')return Response.json({items:['NVDA'],cap:50,overview:{items:[row],session:'2026-09-25'}});
 if(url==='/me/stock-research')return Response.json({items:[{ticker:'NVDA',status:'pending'}],watchlist_count:1});
 if(url==='/stock-research/NVDA')return Response.json({ticker:'NVDA',price:{...row,company:user+' synthetic company'},evidence:{ticker:'NVDA',nodes:[],analysis_status:'pending'}});
 if(url==='/snapshot/NVDA')return Response.json({ticker:'NVDA',built_at:'2026-09-25T20:00:00Z',snapshot:{ok:true,retrace:{d20:{lo:205,hi:240}},gamma:{put_wall:210,call_wall:230,scope:{expiries:['2026-10-16']}},vol:{iv:40,hv:50,ratio:.8}}});
 if(url.startsWith('/public/company/'))return Response.json({ticker:url.split('/').pop(),company:'Synthetic company'});
 if(url.startsWith('/bars/'))return Response.json({bars:[]});
 if(url.startsWith('/me/research-changes'))return Response.json({items:[],next_cursor:null});
 if(url==='/briefing/stocks?fields=signals'||url.startsWith('/radar/archive.json'))return Response.json({items:archiveRows,next_cursor:null,filter_version:3});
 if(url==='/radar/social.json')return Response.json({status:'ready',collected_at:'2026-09-25T12:00:00Z',items:[{ticker:'NVDA',rank:1,mentions:0}]});
 if(url.startsWith('/radar/record.json'))return Response.json({item:record});
 if(url==='/alerts'||url==='/screens/hits')return Response.json({items:[]});
 if(url==='/screens')return Response.json({items:[],cap:10,evaluation_enabled:true,active_ids:[]});
 if(url.includes('/radar/coverage.json'))return Response.json({sources:[]});
 if(url.includes('/radar/facets.json'))return Response.json({sectors:[]});
 if(url==='/radar-history.json')return Response.json({items:[]});
 if(url.startsWith('/public/symbols'))return Response.json({items:[]});
 throw Error('Unexpected request '+url);
};
store.bumpEpoch();store.set('me',{user_id:1,tier:'pro',watch_cap:50,access:{billing_enabled:false}});store.set('token','synthetic-a');store.set('watchlist',['NVDA']);
await router.start();
const settle=()=>new Promise(resolve=>setTimeout(resolve,15));
async function visit(hash,state=null){history.pushState(state,'',hash);await router.render();await settle();}
const backLink=()=>root.querySelector('.focus-heading a.small.muted');
after(()=>window.close());

test('local Watchlist mode, search and sort survive stock tabs and contextual return with their scroll position',async()=>{
 await visit('#/watchlist');
 root.querySelector('[data-mode=metrics]').click();
 const search=root.querySelector('.watch-filter');search.value='NVDA';search.dispatchEvent(new window.Event('input'));
 root.querySelector('[data-sort=iv_hv]').click();
 const original=location.hash;assert.match(original,/view=metrics/);assert.match(original,/q=NVDA/);assert.match(original,/sort=iv_hv/);
 main.scrollTop=417;
 await visit(root.querySelector('.watch-metrics-link').getAttribute('href'));
 assert.equal(backLink().getAttribute('href'),original);assert.equal(main.scrollTop,0);
 main.scrollTop=735;
 await visit(root.querySelector('[data-stock-tab=overview]').getAttribute('href'));
 assert.equal(main.scrollTop,0,'overview does not reuse the metric scroll');assert.equal(backLink().getAttribute('href'),original);
 await visit(root.querySelector('[data-stock-tab=history]').getAttribute('href'));
 assert.equal(backLink().getAttribute('href'),original);
 await visit(backLink().getAttribute('href'));
 assert.equal(main.scrollTop,417);assert.equal(root.querySelector('.watch-filter').value,'NVDA');
 assert.equal(root.querySelector('[data-mode=metrics]').getAttribute('aria-pressed'),'true');
 assert.equal(root.querySelector('[data-sort=iv_hv]').parentElement.getAttribute('aria-sort'),'descending');
});

test('stock focus targets run once for a history entry, support the plan, and ignore unknown targets',async()=>{
 focusCalls.length=0;
 await visit('#/stock/NVDA?tab=metrics&focus=support');assert.deepEqual(focusCalls,['support']);
 await router.render();assert.deepEqual(focusCalls,['support'],'a reread does not repeat deep-link scrolling');
 await visit('#/stock/NVDA?tab=overview&focus=plan');assert.deepEqual(focusCalls,['support','plan']);
 await visit('#/stock/NVDA?tab=metrics&focus=not-a-target');assert.deepEqual(focusCalls,['support','plan']);
});

test('applied activity filters survive the stock tabs and contextual return without another filter request',async()=>{
 await visit('#/boards?mode=archive&ticker=NVDA');
 const input=root.querySelector('input[name=q]');input.value='Chief Financial Officer';
 const before=requests.length;
 root.querySelector('form.radar-filters').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 await settle();const filtered=location.hash;assert.match(filtered,/q=Chief/);
 assert.equal(requests.slice(before).filter(({url})=>url.startsWith('/radar/archive.json')).length,1);
 main.scrollTop=333;
 await visit('#/stock/NVDA?from=boards&tab=evidence');assert.equal(backLink().getAttribute('href'),filtered);
 await visit(root.querySelector('[data-stock-tab=metrics]').getAttribute('href'));assert.equal(backLink().getAttribute('href'),filtered);
 await visit(backLink().getAttribute('href'));assert.equal(root.querySelector('input[name=q]').value,'Chief Financial Officer');assert.equal(main.scrollTop,333);
});

test('untrusted old history return paths cannot open external or unsupported routes',async()=>{
 await visit('#/stock/NVDA?from=explore&tab=overview',{duckyStockReturn:{epoch:store.epoch(),ticker:'NVDA',href:'#/explore?view=activity&ticker=NVDA'}});
 assert.equal(backLink().getAttribute('href'),'#/explore?view=activity&ticker=NVDA','an allowed return in the current account retains its query');
 for(const href of ['https://example.com/elsewhere','javascript:alert(1)','#/profile','#/stock/OTHER','#/watchlist/not-a-query']){
  await visit('#/watchlist');
  await visit('#/stock/NVDA?tab=overview',{duckyStockReturn:{epoch:store.epoch(),ticker:'NVDA',href}});
  assert.equal(backLink().getAttribute('href'),'#/watchlist',href);
 }
});

test('Explore to a stock metric price draft returns to its exact tab and original Explore context without any write',async()=>{
 const start=requests.length;
 await visit('#/explore');main.scrollTop=281;
 await visit(root.querySelector('[data-explore-link="NVDA:metrics"]').getAttribute('href'));
 const stockHash=location.hash;main.scrollTop=642;
 const priceAction=root.querySelector('.stock-level-alert a');assert.ok(priceAction);
 await visit(priceAction.getAttribute('href'));
 const alertHash=location.hash,alertState=structuredClone(history.state);
 assert.match(root.querySelector('.alert-prompt').value,/NVDA/);assert.match(root.querySelector('.alert-prompt').value,/210/);
 assert.equal(root.querySelector('.alert-stock-return').getAttribute('href'),stockHash);
 await router.render();assert.equal(root.querySelector('.alert-stock-return').getAttribute('href'),stockHash,'refresh keeps this history entry context');
 await visit(root.querySelector('.alert-stock-return').getAttribute('href'));
 assert.equal(root.querySelector('[data-stock-tab=metrics]').getAttribute('aria-current'),'page');
 assert.equal(backLink().getAttribute('href'),'#/explore');assert.equal(main.scrollTop,642);
 await visit(backLink().getAttribute('href'));assert.equal(main.scrollTop,281);
 assert.ok(requests.slice(start).every(({url})=>!url.includes('/alerts/translate')),'opening the draft does not submit or translate');
 for(const change of [{href:'https://example.com'}, {href:'#/stock/OTHER?tab=metrics'}, {at:'#/alerts?ticker=OTHER'}, {epoch:store.epoch()-1}]){
  await visit('#/watchlist');
  await visit(alertHash,{duckyAlertReturn:{...alertState.duckyAlertReturn,...change}});
  assert.equal(root.querySelector('.alert-stock-return').getAttribute('href'),'#/stock/NVDA?tab=metrics','invalid account, entry, ticker and external paths fall back locally');
 }
 await visit('#/watchlist');
 await visit(alertHash,{duckyAlertReturn:{...alertState.duckyAlertReturn,stockReturn:'https://example.com'}});
 await visit(root.querySelector('.alert-stock-return').getAttribute('href'));
 assert.equal(backLink().getAttribute('href'),'#/watchlist','the inherited source return is separately validated');
});

test('chart return binds the account, entry and ticker and does not leak an origin to generic or changed-stock routes',async()=>{
 await visit('#/explore');
 await visit('#/stock/NVDA?from=explore&tab=overview');
 const stockHash=location.hash;
 await visit(root.querySelector('[data-stock-tool=kline]').getAttribute('href'));
 const chartHash=location.hash,chartState=structuredClone(history.state);
 assert.equal(root.querySelector('.chart-back').getAttribute('href'),stockHash);
 for(const change of [{href:'https://example.com'}, {href:'javascript:alert(1)'}, {href:'#/stock/OTHER?tab=overview'}, {href:'#/stock/NVDA/invalid'}, {ticker:'OTHER'}, {at:'#/chart/OTHER'}, {epoch:store.epoch()-1}]){
  await visit('#/watchlist');
  await visit(chartHash,{duckyChartReturn:{...chartState.duckyChartReturn,...change}});
  assert.equal(root.querySelector('.chart-back').getAttribute('href'),'#/stock/NVDA','unsafe, unrelated or old-account history falls back locally');
 }
 await visit('#/watchlist');
 await visit(chartHash,{duckyChartReturn:{...chartState.duckyChartReturn,stockReturn:'https://example.com'}});
 await visit(root.querySelector('.chart-back').getAttribute('href'));
 assert.equal(backLink().getAttribute('href'),'#/watchlist','the origin is separately validated');
 await visit(chartHash,chartState);
 await visit('#/stock/NVDA');
 assert.equal(backLink().getAttribute('href'),'#/watchlist','a generic stock entry is not the exact chart return');
 await visit(chartHash,chartState);
 await visit('#/chart/OTHER',chartState);
 assert.equal(root.querySelector('.chart-back').getAttribute('href'),'#/stock/OTHER','changing symbols drops the prior stock context');
 await visit('#/chart/NVDA');
 await visit(root.querySelector('.chart-back').getAttribute('href'));
 assert.equal(backLink().getAttribute('href'),'#/watchlist','changing back does not resurrect a prior chart entry');
 await visit(chartHash,chartState);
 store.bumpEpoch();store.set('token','synthetic-new-epoch');
 await router.render();
 assert.equal(root.querySelector('.chart-back').getAttribute('href'),'#/stock/NVDA','an actual account epoch change revokes the mounted chart context');
 await visit(root.querySelector('.chart-back').getAttribute('href'));
 assert.equal(backLink().getAttribute('href'),'#/watchlist');
});

test('stock filings open with compact filters and exact record breadcrumbs retain applied filters through canonical aliases',async()=>{
 archiveRows=[{...record,id:'synthetic:alias'}];
 try{
  await visit('#/stock/NVDA?from=watchlist&tab=overview');
  await visit(root.querySelector('.stock-disclosure-links a').getAttribute('href'));
  const toggle=root.querySelector('.radar-filter-toggle');assert.equal(toggle.getAttribute('aria-expanded'),'false','all content and purchases do not expand seven advanced controls');
  assert.equal(root.querySelector('[name=ticker]').value,'NVDA');toggle.click();assert.equal(toggle.getAttribute('aria-expanded'),'true');toggle.click();
  const input=root.querySelector('[name=q]');input.value='Synthetic officer';root.querySelector('[name=direction]').value='1';
  root.querySelector('form.radar-filters').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await settle();
  const filtered=location.hash;main.scrollTop=365;
  await visit(root.querySelector('.radar-record-toggle').getAttribute('href'));
  const canonical=location.hash,state=structuredClone(history.state);
  assert.equal(canonical,'#/record/synthetic%3Acanonical');assert.equal(root.querySelector('.record-breadcrumb a').getAttribute('href'),filtered);
  await router.render();assert.equal(root.querySelector('.record-breadcrumb a').getAttribute('href'),filtered,'canonical alias reread preserves the entry return');
  await visit(root.querySelector('.record-breadcrumb a').getAttribute('href'));
  assert.equal(root.querySelector('[name=q]').value,'Synthetic officer');assert.equal(root.querySelector('[name=ticker]').value,'NVDA');assert.equal(root.querySelector('[name=direction]').value,'1');assert.equal(main.scrollTop,365);
  assert.equal(root.querySelector('.radar-filter-toggle').getAttribute('aria-expanded'),'true','a real directional constraint stays visible');
  for(const change of [{href:'https://example.com'}, {href:'#/boards/unexpected'}, {at:'#/record/other'}, {id:'other'}, {epoch:store.epoch()-1}]){
   await visit('#/watchlist');await visit(canonical,{duckyRecordReturn:{...state.duckyRecordReturn,...change}});
   assert.equal(root.querySelector('.record-breadcrumb a').getAttribute('href'),'#/boards','unsafe or unrelated history cannot supply a breadcrumb');
  }
 }finally{archiveRows=[];}
});

test('a new account cannot inherit an old account return context or scroll restoration',async()=>{
 await visit('#/watchlist');const search=root.querySelector('.watch-filter');search.value='old-account-private-query';search.dispatchEvent(new window.Event('input'));
 const oldRoute=location.hash;main.scrollTop=823;
 await visit('#/stock/NVDA?tab=overview');assert.equal(backLink().getAttribute('href'),oldRoute);
 const previousState=structuredClone(history.state);
 user='account-b';store.bumpEpoch();store.set('token','synthetic-b');store.set('me',{user_id:2,tier:'pro',watch_cap:50,access:{billing_enabled:false}});store.set('watchlist',['NVDA']);
 await visit('#/stock/NVDA?tab=overview',previousState);
 assert.equal(backLink().getAttribute('href'),'#/watchlist','neither saved history nor the mounted old stock can supply the new account return context');
 await visit('#/watchlist');assert.equal(main.scrollTop,0);
 await visit('#/stock/NVDA?tab=overview',previousState);
 assert.equal(backLink().getAttribute('href'),'#/watchlist');
 assert.match(root.querySelector('.focus-heading').textContent,/account-b synthetic company/);assert.doesNotMatch(root.textContent,/account-a synthetic company/);
});
