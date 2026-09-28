import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<html lang="en" data-lang="en"><body><main class="app-main"><div id="view"></div></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/en/app/#/creators?scope=discover',pretendToBeVisual:true});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const scrollTargets=[];
window.HTMLElement.prototype.scrollIntoView=function(){scrollTargets.push(this);};
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const router=await import('../public/js/app/router.js');
const {starterCards}=await import('../public/js/app/research-examples.js');
const {discoveryPreview}=await import('../public/js/app/views/creator-discovery.js');
const creator={id:'sample',name:'Synthetic creator',platform:'youtube'};
const point={creator_id:'sample',post_id:'sample-post',point_id:'point:sample',ticker:'MU',basis:'attributed_opinion',intent:'opinion',stance:'support',
  title:{en:'Margins depend on contract pricing.',zh:'利润率取决于合约价格。'},condition_text:'Only if prices hold.',horizon_text:'Next quarter',conditional:true,
  published_at:'2026-09-25T10:00:00Z',source_url:'https://www.youtube.com/watch?v=sample-post',source_hash:'synthetic',start_seconds:60,end_seconds:90,evidence:'A complete synthetic excerpt.'};
const post={id:1,kol_id:creator.id,kol_name:creator.name,platform_post_id:point.post_id,published_at:point.published_at,title:'Synthetic source',tickers:['MU'],calls:[],url:point.source_url,
  reviewed_spans:[point],summary:{quality:'no_call',en:'Synthetic summary.',source:{kind:'transcript',status:'ready',summary_reviewed:true}}};
const requests=[];
let hasAnalysis=true,macroReply={status:'unavailable'},deferredMacro=null;
globalThis.fetch=async(url,options={})=>{
  assert.equal(options.method||'GET','GET','reading must not subscribe or mutate an account');requests.push(url);
  if(url==='/kol/feed')return Response.json({kols:[creator],posts:[post],pages:{}});
  if(url==='/me/kols')return Response.json({subs:[],analysis:{}});
  if(url==='/watchlist')return Response.json({items:[]});
  if(url==='/macro/beta')return deferredMacro?await deferredMacro:Response.json(macroReply);
  if(url==='/me/stock-research')return Response.json({watchlist_count:1,items:hasAnalysis?[{ticker:'MU',status:'ready',as_of:new Date().toISOString(),
    overview:{en:'The exact synthetic condition.',citations:['source']},sources:[{id:'source',title:{en:'Margins depend on pricing.'},stance:'support',kind:'creator',evidence:[]}]}]:[]});
  if(url.startsWith('/me/research-changes'))return Response.json({items:[],next_cursor:null});
  if(url.startsWith('/kol/discover'))return Response.json({status:'ready',items:[{creator,latest_view:{...point,text:point.title}}]});
  if(url==='/kol/sample/posts/sample-post')return Response.json({creator,post});
  if(url==='/kol/sample/page')return Response.json({kol_id:'sample',status:'ready'});
  if(url==='/stock-research/MU')return Response.json({ticker:'MU',price:{ticker:'MU',company:'Synthetic company',price:100},evidence:{ticker:'MU',nodes:[],analysis_status:'pending'}});
  if(url.startsWith('/public/company/'))return Response.json({ticker:url.split('/').pop(),company:'Synthetic company'});
  if(url.startsWith('/bars/'))return Response.json({bars:[]});
  if(url==='/radar/social.json')return Response.json({status:'empty',items:[]});
  throw Error('Unexpected read '+url);
};
store.bumpEpoch();store.set('me',{user_id:901,tier:'pro'});store.set('token','synthetic-only');store.set('watchlist',[]);
const root=document.querySelector('#view'),main=document.querySelector('.app-main');
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
async function visit(hash){history.pushState(null,'',hash);await router.render();await settle();}
await router.start();
after(async()=>{await visit('#/explore');window.close();});

test('first-use dated stocks and creator discovery expose a stock workspace without losing the exact source or map',()=>{
  const card=starterCards({items:[{ticker:'MU',rank:1,mentions:12,overall:{en:'A dated synthetic observation.'}}]})[0];
  assert.equal(card.querySelector('.stock-open').getAttribute('href'),'#/stock/MU?from=today');
  assert.ok([...card.querySelectorAll('a')].some(a=>a.getAttribute('href')==='#/stock/MU?from=today&tab=evidence'),card.outerHTML);
  assert.match(card.textContent,/12 mentions/);assert.match(card.textContent,/dated synthetic observation/);
  assert.equal(card.querySelector('a a'),null,'secondary actions are not nested inside the card link');
  const preview=discoveryPreview({creator,latest_view:{...point,text:point.title}});
  assert.equal(preview.querySelector('.creator-discovery-stance a').getAttribute('href'),'#/stock/MU?from=creators');
  assert.match(preview.querySelector('.creator-discovery-links a').getAttribute('href'),/post=sample-post&point=point%3Asample/);
  assert.ok(preview.querySelector('a[target="_blank"]'));
  assert.match(preview.textContent,/Only if prices hold/);
});

test('selecting an author in place updates stock return context and retains the exact source route',async()=>{
  await visit('#/creators?scope=discover');
  root.querySelector('.creator-name').click();await settle();
  const authorRoute=location.hash;assert.match(authorRoute,/creator=sample/);
  const ticker=root.querySelector('.creator-view-takes a');ticker.focus();main.scrollTop=371;
  await visit(ticker.getAttribute('href'));
  assert.equal(root.querySelector('.focus-heading a.small.muted').getAttribute('href'),authorRoute);
  assert.ok(root.querySelector('.focus-heading button'),'the unwatched stock still exposes its follow action');
  await visit(authorRoute);assert.equal(main.scrollTop,371);
  assert.equal(document.activeElement?.dataset.readingKey,'creator-view:sample-post:point:sample:MU:stock');
  const exact='#/creators?scope=discover&creator=sample&post=sample-post&point=point%3Asample';
  await visit(exact);
  const stock=root.querySelector('a[data-reading-key="creator-source:sample-post:MU:stock"]');
  assert.ok(stock);assert.ok(root.querySelector('a[href^="#/evidence/MU"]'),'the exact-point map remains accessible');
  await visit(stock.getAttribute('href'));
  assert.equal(root.querySelector('.focus-heading a.small.muted').getAttribute('href'),exact);
});

test('selected creator to stock to chart returns to the exact stock tab and original author',async()=>{
  await visit('#/creators?scope=discover');
  root.querySelector('.creator-name').click();await settle();
  const authorRoute=location.hash;
  const ticker=root.querySelector('.creator-view-takes a');ticker.focus();main.scrollTop=371;
  await visit(ticker.getAttribute('href'));
  await visit(root.querySelector('[data-stock-tab=history]').getAttribute('href'));
  const stockRoute=location.hash;main.scrollTop=283;
  await visit(root.querySelector('[data-stock-tool=kline]').getAttribute('href'));
  assert.equal(root.querySelector('.chart-back').getAttribute('href'),stockRoute);
  await router.render();assert.equal(root.querySelector('.chart-back').getAttribute('href'),stockRoute,'reread retains this chart entry');
  await visit(root.querySelector('.chart-back').getAttribute('href'));
  assert.equal(root.querySelector('[data-stock-tab=history]').getAttribute('aria-current'),'page');
  assert.equal(root.querySelector('.focus-heading a.small.muted').getAttribute('href'),authorRoute);
  assert.equal(main.scrollTop,283);
  await visit(root.querySelector('.focus-heading a.small.muted').getAttribute('href'));
  assert.equal(location.hash,authorRoute);assert.equal(main.scrollTop,371);
  assert.equal(document.activeElement?.dataset.readingKey,'creator-view:sample-post:point:sample:MU:stock');
});

test('creator search, stance, scope and disclosure survive a stock visit and rerender but never another account',async()=>{
  await visit('#/creators?scope=discover');
  const panel=root.querySelector('.creators-ux-filters');panel.open=true;await settle();
  const field=panel.querySelector('input');field.value='private research phrase';field.dispatchEvent(new window.Event('input'));
  panel.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));await settle();
  const [scope,stance]=root.querySelectorAll('.creator-discovery-controls select');
  stance.value='counter';stance.dispatchEvent(new window.Event('change'));await settle();
  assert.equal(location.hash,'#/creators?scope=discover','private search text is not serialized');
  const ticker=root.querySelector('.creator-discovery-stance a');ticker.focus();main.scrollTop=245;
  await visit(ticker.getAttribute('href'));await visit(root.querySelector('.focus-heading a.small.muted').getAttribute('href'));
  assert.equal(root.querySelector('.creator-person-search input').value,'private research phrase');
  assert.equal(root.querySelectorAll('.creator-discovery-controls select')[0].value,scope.value);
  assert.equal(root.querySelectorAll('.creator-discovery-controls select')[1].value,'counter');
  assert.equal(root.querySelector('.creators-ux-filters').open,true);assert.equal(main.scrollTop,245);
  await router.render();await settle();
  assert.equal(root.querySelector('.creator-person-search input').value,'private research phrase','same-route theme refresh keeps the reading state');
  assert.ok(requests.some(url=>url.includes('q=private+research+phrase')&&url.includes('stance=counter')));
  store.bumpEpoch();store.set('me',{user_id:902,tier:'pro'});store.set('token','synthetic-second');
  await visit('#/creators?scope=discover');
  assert.equal(root.querySelector('.creator-person-search input').value,'');
  assert.equal(root.querySelectorAll('.creator-discovery-controls select')[1].value,'all');
  assert.equal(root.querySelector('.creators-ux-filters').open,false);
});

test('existing Today counts jump and focus their reading sections without hiding macro context or adding embedded chrome',async()=>{
  await visit('#/today');scrollTargets.length=0;
  const buttons=root.querySelectorAll('button.today-stat');assert.equal(buttons.length,2);
  buttons[0].click();assert.equal(document.activeElement,root.querySelector('.today-updates h2'));
  buttons[1].click();assert.equal(document.activeElement,root.querySelector('.focus-latest h2'));
  assert.deepEqual(scrollTargets,[root.querySelector('.today-updates h2'),root.querySelector('.focus-latest h2')]);
  const main=root.querySelector('.focus-today');
  assert.ok([...main.children].indexOf(main.querySelector('.today-macro-host'))<[...main.children].indexOf(main.querySelector('.today-updates')));
  assert.equal(main.querySelector('.today-macro-host').hidden,false);
  const {mount}=await import('../public/js/app/views/today.js');
  const embedded=document.createElement('div');document.body.append(embedded);
  const dispose=await mount(embedded,{embedded:true,scope:'all',initialDays:7});
  assert.equal(embedded.querySelector('.today-stats'),null);dispose();embedded.remove();
  hasAnalysis=false;store.bumpEpoch();store.set('me',{user_id:903,tier:'pro'});store.set('token','synthetic-third');
  await visit('#/today');
  assert.equal(root.querySelectorAll('button.today-stat')[1].disabled,true,'zero analyses do not jump into an empty target');
});


test('an expanded saved Today note survives stock return after a delayed macro read, but not another account',async()=>{
  macroReply={schema:'macro-beta/1',status:'ok',as_of:'2026-09-28',latest:{date:'2026-09-28',funding_score:50,metrics:{}},
    digest:{status:'stale',session:'2026-09-25',next_session:'2026-09-28',generated_at:'2026-09-26T04:34:19Z',close:{en:'A synthetic saved close note.'}}};
  await visit('#/today');
  const archive=root.querySelector('.today-digest-archive');assert.ok(archive);assert.equal(archive.open,false);
  archive.open=true;
  await visit('#/stock/MU?from=today');
  const back=root.querySelector('.focus-heading a.small.muted');assert.equal(back.getAttribute('href'),'#/today');
  let resolveMacro;deferredMacro=new Promise(resolve=>{resolveMacro=resolve;});
  await visit(back.getAttribute('href'));
  assert.equal(root.querySelector('.today-digest-archive'),null,'the macro request has not resolved yet');
  resolveMacro(Response.json(macroReply));deferredMacro=null;await settle();
  assert.equal(root.querySelector('.today-digest-archive').open,true,'restore only after the saved document is rendered');
  assert.match(root.querySelector('.today-digest-part p').textContent,/synthetic saved close note/);
  await visit('#/stock/MU?from=today');
  store.bumpEpoch();store.set('me',{user_id:904,tier:'pro'});store.set('token','synthetic-fourth');
  await visit('#/today');
  assert.equal(root.querySelector('.today-digest-archive').open,false,'prior-account disclosure state is not inherited');
  // A different note is a different reading key, even inside the same account.
  root.querySelector('.today-digest-archive').open=true;
  await visit('#/stock/MU?from=today');
  macroReply={...macroReply,digest:{...macroReply.digest,session:'2026-09-24'}};
  await visit('#/today');
  assert.equal(root.querySelector('.today-digest-archive').open,false,'a newly read session starts collapsed');
});
