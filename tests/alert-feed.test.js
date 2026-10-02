import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><nav class="app-nav focus-nav"><a href="#/alerts" data-route="alerts"><span>Alerts</span></a></nav><main><div id="view"></div></main></body></html>',{url:'https://ducky.test/en/app/#/alerts',pretendToBeVisual:true});
for(const key of ['window','document','Node','location','history','CustomEvent'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json')),zh=JSON.parse(readFileSync('i18n/zh.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.head.append(strings);
const feed=await import('../public/js/app/views/alert-feed.js');
const badge=await import('../public/js/app/alert-badge.js');
const store=await import('../public/js/app/store.js');
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setTimeout(r,0));};
const now=new Date();
const iso=(minutesAgo)=>new Date(now.getTime()-minutesAgo*60000).toISOString();
const note={headline:{zh:'Oracle Corporation 董事买入 348 万美元，通过信托',en:'Oracle Corporation director buys $3.48M via a trust'},
 summary:{zh:'Stephen H. Rusckowski 于 2026-09-29 买入 25,000 股。申报未确认为公开市场买入。',en:'Stephen H. Rusckowski bought 25,000 shares on 2026-09-29. The filing does not confirm an open-market purchase.'},
 facts:[{label:{zh:'申报人',en:'Reporting person'},value:{zh:'Stephen H. Rusckowski（董事）',en:'Stephen H. Rusckowski (Director)'}},{label:{zh:'金额',en:'Value'},value:{zh:'348 万美元',en:'$3.48M'}}],
 context:{zh:['交易日前 90 天内，公司其他内部人申报卖出 2 笔。'],en:['In the 90 days before the trade, other company insiders reported 2 sales.']},
 watch:{zh:'如有后续申报，Ducky 会继续记录。',en:'Ducky keeps recording any further filings.'},caveats:{zh:['不构成投资建议。'],en:['Not investment advice.']},
 source:{label:{zh:'SEC Form 4',en:'SEC Form 4'},url:'https://www.sec.gov/Archives/x'},event_at:'2026-09-29',filed_at:'2026-10-01',app_path:'/app/#/updates'};
const item=(over={})=>({id:'firehose:orcl',topic:'ticker',ticker:'ORCL',kind:'insider',observed_at:iso(30),published_at:'2026-10-01T00:00:00Z',direction:1,
 headline:note.headline,summary:note.summary,signal:{direction:'buy',strength:'notable',badges:['only_buy_12m','indirect']},materiality_tier:'push',
 source_record_id:'sec:0001341439-26-000099:P',source_url:'https://www.sec.gov/Archives/x',content_status:'current',note,...over});
const doc=(items,over={})=>({items,next_cursor:null,unread_count:1,seen_through:iso(120),watch_tickers:['ORCL'],...over});

test('feed rows render in the account language with direction, badges, note details and source links',()=>{
 const normalized=feed.normalizeFeed(doc([item(),item({id:'firehose:sell',direction:-1,signal:{direction:'sell',badges:[]},observed_at:iso(26*60),note:null}),
  item({id:'firehose:old',content_status:'superseded',headline:{zh:'',en:''},observed_at:iso(3*24*60)}),item({id:'firehose:macro',topic:'macro',ticker:null,kind:'macro-regime',direction:0,signal:null,note:null})]));
 assert.equal(normalized.items.length,4);
 const groups=feed.groupByDay(normalized.items,now);
 assert.deepEqual(groups.map(g=>g.label).slice(0,2),[copy['app.alertfeed.today'],copy['app.alertfeed.yesterday']]);
 const card=feed.itemCard(normalized.items[0],{seenThrough:normalized.seen_through});
 assert.ok(card.classList.contains('is-buy')&&card.classList.contains('is-unread'));
 assert.equal(card.querySelector('.alert-headline').textContent,'Oracle Corporation director buys $3.48M via a trust');
 assert.match(card.querySelector('.alert-summary').textContent,/does not confirm an open-market purchase/);
 assert.deepEqual([...card.querySelectorAll('.alert-badge')].map(b=>b.textContent),[copy['app.alertfeed.badge_only_buy_12m'],copy['app.alertfeed.badge_indirect']]);
 assert.equal(card.querySelector('.alert-note-facts dd').textContent,'Stephen H. Rusckowski (Director)');
 assert.match(card.querySelector('.alert-note').textContent,/other company insiders reported 2 sales/);
 assert.match(card.querySelector('.alert-note').textContent,/Not investment advice/);
 assert.ok(card.querySelector('a[href="#/stock/ORCL"]'));assert.ok(card.querySelector('a[href="#/record/sec%3A0001341439-26-000099%3AP"]'));
 assert.equal(card.querySelector('a[target=_blank]').getAttribute('href'),'https://www.sec.gov/Archives/x');
 assert.equal(card.querySelector('.alert-direction').textContent,copy['app.alertfeed.direction_buy']);
 const sell=feed.itemCard(normalized.items[1],{seenThrough:normalized.seen_through});
 assert.ok(sell.classList.contains('is-sell')&&!sell.classList.contains('is-unread'));assert.equal(sell.querySelector('.alert-note'),null);
 const gone=feed.itemCard(normalized.items[2]);
 assert.match(gone.textContent,/corrected this record/);assert.equal(gone.querySelector('a[target=_blank]'),null);
 const macro=feed.itemCard(normalized.items[3]);
 assert.equal(macro.querySelector('.alert-ticker').textContent,copy['app.alertfeed.macro_label']);assert.equal(macro.querySelector('.alert-kind').textContent,copy['app.alertfeed.kind_macro_regime']);
 assert.ok(Object.keys(copy).filter(k=>k.startsWith('app.alertfeed.')).every(k=>typeof zh[k]==='string'&&zh[k].length));
});

test('mount reads the feed in full, marks the newest item seen once, filters by kind and pages with the cursor',async()=>{
 const calls=[];store.set('me',{user_id:7,tier:'pro'});store.set('token','t');
 globalThis.fetch=async(url,opts={})=>{const u=new URL(String(url),'https://ducky.test');calls.push({path:u.pathname+u.search,method:opts.method||'GET',body:opts.body});
  if(u.pathname==='/me/alerts/seen')return response({seen_through:JSON.parse(opts.body).seen_through});
  if(u.searchParams.get('before'))return response(doc([item({id:'firehose:older',observed_at:iso(5000)})],{unread_count:0,next_cursor:null}));
  if(u.searchParams.get('kinds')==='news')return response(doc([item({id:'firehose:news',kind:'news',direction:0,signal:null,note:null})],{unread_count:0}));
  return response(doc([item()],{next_cursor:iso(31)+'|firehose:orcl'}));};
 const root=document.getElementById('view');root.replaceChildren();
 const dispose=await feed.mount(root,{query:new URLSearchParams()});await flush();
 try{
  assert.equal(calls[0].path,'/me/alerts/feed?limit=30&fields=full');
  assert.equal(root.querySelectorAll('.alert-item').length,1);
  assert.equal(root.querySelector('.alert-unread-chip').textContent,'1 unread');
  const seen=calls.find(c=>c.path==='/me/alerts/seen');assert.equal(seen.method,'POST');assert.equal(JSON.parse(seen.body).seen_through,root.querySelector('.alert-item time').getAttribute('datetime'));
  assert.equal(root.querySelectorAll('.alert-day').length,1);
  assert.equal(root.querySelector('[data-alert-tab=feed]').getAttribute('aria-selected'),'true');
  root.querySelector('[data-alert-more]').click();await flush();
  assert.ok(calls.some(c=>c.path.includes('before=')&&c.path.includes(encodeURIComponent('|firehose:orcl'))));
  assert.equal(root.querySelectorAll('.alert-item').length,2);
  root.querySelector('[data-alert-filter=news]').click();await flush();
  assert.ok(calls.at(-1).path.includes('kinds=news'));assert.equal(root.querySelector('.alert-kind').textContent,copy['app.alertfeed.kind_news']);
  assert.equal(location.hash,'#/alerts?kind=news');assert.equal(calls.filter(c=>c.path==='/me/alerts/seen').length,1);
 }finally{dispose();root.replaceChildren();history.replaceState(null,'','#/alerts');}
});

test('before the feed route ships, a 404 falls back to the delivery history with its notice and the custom tab still hosts price alerts',async()=>{
 const calls=[];store.set('me',{user_id:7,tier:'pro'});store.set('token','t');
 globalThis.fetch=async(url,opts={})=>{const u=new URL(String(url),'https://ducky.test');calls.push(u.pathname+u.search);
  if(u.pathname==='/me/alerts/feed')return response({error:'not_found'},404);
  if(u.pathname==='/signals/inbox')return response({items:[{id:1205,event_id:'firehose:x',ticker:'ORCL',kind:'insider',queued_at:iso(10),source_record_id:'sec:0001341439-26-000099:P',
   source_url:'https://www.sec.gov/Archives/x',title:'Oracle Corporation 董事买入 348 万美元，通过信托',title_en:'Oracle Corporation director buys $3.48M via a trust',published_at:'2026-10-01T00:00:00Z',observed_at:iso(10),content_status:'current',delivery:{status:'sent'},note}],next_cursor:null});
  if(u.pathname==='/alerts')return response({items:[]});
  return response({},404);};
 const root=document.getElementById('view');root.replaceChildren();
 const dispose=await feed.mount(root,{query:new URLSearchParams()});await flush();
 try{
  assert.ok(calls.includes('/signals/inbox?limit=30'));
  assert.match(root.querySelector('.alert-rollout').textContent,/rolling out/);
  const card=root.querySelector('.alert-item');assert.ok(card.classList.contains('is-buy'));
  assert.equal(card.querySelector('.alert-headline').textContent,'Oracle Corporation director buys $3.48M via a trust');
  assert.equal(root.querySelector('.alert-unread-chip').hidden,true);assert.ok(!calls.some(c=>c.includes('/me/alerts/seen')));
  root.querySelector('[data-alert-tab=custom]').click();await flush();await flush();
  assert.equal(location.hash,'#/alerts?view=custom');assert.equal(root.querySelector('.alert-custom-panel').hidden,false);
  assert.ok(root.querySelector('.alert-custom-panel h1'));assert.ok(calls.includes('/alerts'));
 }finally{dispose();root.replaceChildren();history.replaceState(null,'','#/alerts');}
});

test('the navigation badge polls one row, shows the unread count, and never starts without the alerts link',async()=>{
 const calls=[];store.set('me',{user_id:7,tier:'pro'});store.set('token','t');
 globalThis.fetch=async(url)=>{calls.push(String(url));return response(doc([item()],{unread_count:3}));};
 badge.startAlertBadge({interval:100000});await flush();
 const link=document.querySelector('.app-nav a[data-route=alerts]');
 assert.equal(link.querySelector('.nav-badge').textContent,'3');assert.equal(link.dataset.unread,'3');
 assert.ok(calls[0].endsWith('/me/alerts/feed?limit=1'));
 badge.markAlertsSeen();assert.equal(link.querySelector('.nav-badge'),null);
 badge.stopAlertBadge();
 const nav=document.querySelector('.app-nav');nav.remove();calls.length=0;
 badge.startAlertBadge({interval:100000});await flush();assert.equal(calls.length,0);document.body.prepend(nav);
});
