import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/#/today'});
for(const key of ['window','document','Node','location','history','localStorage','CustomEvent','Event'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const today=await import('../public/js/app/views/today.js');
const store=await import('../public/js/app/store.js');
const pause=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setTimeout(r,0));};
const todayDay=new Date().toISOString().slice(0,10);
function node(id='source',stance='support'){return {id,kind:'creator',priority:'direct',intent:'opinion',stance,conditional:false,
 title:{en:'Orders may recover if customers resume spending.',zh:'如果客户恢复支出，订单可能回升。'},published_at:todayDay,
 evidence:[{kind:'creator',author:'Sample Author',creator_id:'sample',post_id:'p1',platform:'youtube',source_url:'https://www.youtube.com/watch?v=abc',published_at:todayDay,observed_at:'2026-09-10T01:00:00Z'}]};}
const change=(id=1,stance='support',ticker='NVDA',published=todayDay)=>({id:'change:'+id,ticker,kind:'added',state:'available',node:node('n'+id,stance),published_at:published,available_at:'2026-09-10T01:00:00Z'});
const item=(ticker='NVDA')=>({ticker,status:'ready',as_of:'2026-09-09T22:00:00Z',records:4,overview:{en:'Sample Author expects orders to recover.',zh:'作者认为订单可能恢复。',citations:['source']},sources:[node()]});
const watchlist={items:['NVDA','AMD'],cap:50,overview:{items:[{ticker:'NVDA',price:218.29,change_pct:-0.03,price_status:'ready'},{ticker:'AMD',price:516.13,change_pct:2.49,price_status:'ready'}]}};
function setup(){store.bumpEpoch();store.set('me',{user_id:12,tier:'pro',access:{billing_enabled:false}});store.set('token','synthetic-only');store.set('watchlist',['NVDA','AMD']);
 const root=document.querySelector('main');root.replaceChildren();return root;}

test('cards carry the stance rail, source mark, author initial and the saved quote of their stock',async()=>{
 const root=setup();
 globalThis.fetch=async url=>Response.json(url==='/me/stock-research'?{items:[item(),item('AMD')],watchlist_count:2}:
  url==='/watchlist'?watchlist:{items:[change(1,'support'),change(2,'counter','AMD')],next_cursor:null});
 const dispose=await today.mount(root);await pause();
 const cards=[...root.querySelectorAll('.today-updates > .change-list > .change-card')];
 assert.equal(cards.length,2);
 assert.ok(cards.some(c=>c.classList.contains('is-support')));assert.ok(cards.some(c=>c.classList.contains('is-counter')));
 assert.ok(cards[0].querySelector('.evidence-source-badge.source-youtube'));
 assert.equal(cards[0].querySelector('.change-avatar').textContent,'S');
 const quote=cards.find(c=>c.querySelector('.ticker').textContent==='AMD').querySelector('.today-quote');
 assert.match(quote.textContent,/\$516\.13/);assert.match(quote.textContent,/\+2\.49%/);assert.equal(quote.classList.contains('is-up'),true);
 assert.match(root.querySelector('.today-analysis .today-quote').textContent,/\$218\.29/);
 assert.match(root.querySelector('.today-analysis .today-records').textContent,/4 records/);
 assert.deepEqual([...root.querySelectorAll('.today-stat strong')].map(n=>n.textContent),['2','2']);
 dispose();
});

test('a quiet day widens once to the past week and says so; a manual range choice is respected',async()=>{
 const root=setup();const calls=[];
 globalThis.fetch=async url=>{const u=new URL(url,'https://ducky.test');
  if(u.pathname==='/me/stock-research')return Response.json({items:[item()],watchlist_count:1});
  if(u.pathname==='/watchlist')return Response.json(watchlist);
  calls.push(u.searchParams.get('since'));
  const wide=Date.now()-Date.parse(u.searchParams.get('since'))>2*86400000;
  return Response.json({items:wide?[change(1,'context','NVDA','2026-09-08')]:[],next_cursor:null});};
 const dispose=await today.mount(root);await pause();
 assert.equal(calls.length,2);assert.equal(root.querySelector('select').value,'7');
 assert.equal(root.querySelector('.today-widened').hidden,false);assert.match(root.querySelector('.today-widened').textContent,/past 7 days/);
 assert.equal(root.querySelectorAll('.change-card').length,1);
 const select=root.querySelector('select');select.value='1';select.dispatchEvent(new window.Event('change'));await pause();
 assert.equal(calls.length,3);assert.equal(select.value,'1');assert.equal(root.querySelector('.today-widened').hidden,true);
 assert.ok(root.querySelector('.focus-empty'));
 dispose();
});

test('the feed asks for twelve records per page and reads the newest publication first inside a page',async()=>{
 const root=setup();let limit=null;
 globalThis.fetch=async url=>{const u=new URL(url,'https://ducky.test');
  if(u.pathname==='/me/stock-research')return Response.json({items:[item()],watchlist_count:1});
  if(u.pathname==='/watchlist')return Response.json({items:[],overview:{items:[]}});
  limit=u.searchParams.get('limit');
  const older=new Date(Date.now()-3600000).toISOString();
  return Response.json({items:[change(1,'support','NVDA',older),change(2,'counter','AMD',new Date().toISOString())],next_cursor:null});};
 const dispose=await today.mount(root);await pause();
 assert.equal(limit,'12');
 assert.deepEqual([...root.querySelectorAll('.today-updates > .change-list > .change-card .ticker')].map(n=>n.textContent),['AMD','NVDA']);
 assert.equal(root.querySelectorAll('.today-quote').length,0);
 dispose();
});

test('an open Today re-reads its first page once a minute and adds newly published records in place',async t=>{
 t.mock.timers.enable({apis:['setInterval']});
 const root=setup();let reads=0;
 globalThis.fetch=async url=>{const u=new URL(url,'https://ducky.test');
  if(u.pathname==='/me/stock-research')return Response.json({items:[item()],watchlist_count:1});
  if(u.pathname==='/watchlist')return Response.json(watchlist);
  reads++;
  return Response.json({items:reads===1?[change(1,'support')]:[change(2,'counter','AMD'),change(1,'support')],next_cursor:null});};
 const dispose=await today.mount(root);await pause();
 assert.equal(root.querySelectorAll('.today-updates > .change-list > .change-card').length,1);
 root.querySelector('.change-card').open=true;
 t.mock.timers.tick(60000);await pause();
 const cards=[...root.querySelectorAll('.today-updates > .change-list > .change-card')];
 assert.equal(cards.length,2);assert.equal(cards[0].querySelector('.ticker').textContent,'AMD');
 assert.equal(cards[1].open,true);
 assert.equal(root.querySelector('.today-stat strong').textContent,'2');
 assert.equal(reads,2);
 t.mock.timers.tick(60000);await pause();
 assert.equal(root.querySelectorAll('.today-updates > .change-list > .change-card').length,2);assert.equal(reads,3);
 dispose();t.mock.timers.tick(60000);await pause();assert.equal(reads,3);
 t.mock.timers.reset();
});
