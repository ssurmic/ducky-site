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
const row={ticker:'NVDA',company:'Synthetic company',price:220,price_status:'ready',price_session:'2026-09-25',change_pct:0,market_cap:100,metrics:{iv_hv:{status:'ready',value:.8}}};
globalThis.fetch=async(url,options={})=>{
 assert.equal(options.method||'GET','GET');requests.push({url,user});
 if(url==='/watchlist')return Response.json({items:['NVDA'],cap:50,overview:{items:[row],session:'2026-09-25'}});
 if(url==='/me/stock-research')return Response.json({items:[{ticker:'NVDA',status:'pending'}],watchlist_count:1});
 if(url==='/stock-research/NVDA')return Response.json({ticker:'NVDA',price:{...row,company:user+' synthetic company'},evidence:{ticker:'NVDA',nodes:[],analysis_status:'pending'}});
 if(url==='/snapshot/NVDA')return Response.json({ticker:'NVDA',built_at:'2026-09-25T20:00:00Z',snapshot:{ok:true,retrace:{d20:{lo:205,hi:240}},gamma:{put_wall:210,call_wall:230,scope:{expiries:['2026-10-16']}},vol:{iv:40,hv:50,ratio:.8}}});
 if(url.startsWith('/bars/'))return Response.json({bars:[]});
 if(url.startsWith('/me/research-changes'))return Response.json({items:[],next_cursor:null});
 if(url==='/briefing/stocks?fields=signals'||url.startsWith('/radar/archive.json'))return Response.json({items:[],next_cursor:null});
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

test('untrusted old history return paths cannot open external or unsupported routes',async()=>{
 await visit('#/stock/NVDA?from=explore&tab=overview',{duckyStockReturn:{epoch:store.epoch(),ticker:'NVDA',href:'#/explore?view=activity&ticker=NVDA'}});
 assert.equal(backLink().getAttribute('href'),'#/explore?view=activity&ticker=NVDA','an allowed return in the current account retains its query');
 for(const href of ['https://example.com/elsewhere','javascript:alert(1)','#/profile','#/stock/OTHER','#/watchlist/not-a-query']){
  await visit('#/watchlist');
  await visit('#/stock/NVDA?tab=overview',{duckyStockReturn:{epoch:store.epoch(),ticker:'NVDA',href}});
  assert.equal(backLink().getAttribute('href'),'#/watchlist',href);
 }
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
