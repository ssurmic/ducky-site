import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/boards'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {mount,activityRow,itemRow,filterRecords}=await import('../public/js/app/views/boards.js');
const {insiderMetrics}=await import('../public/js/app/insider-card.js');
const store=await import('../public/js/app/store.js');
const response=doc=>Response.json(doc);
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setTimeout(resolve,0));};
const row=(id,side='buy')=>({id,kind:'insider',ticker:'EX',direction:side==='buy'?1:-1,provenance:'INGESTED',ts:new Date().toISOString(),summary:'EX filing',reporter_name:'A / B',issuer_name:'Example issuer',market_cap:2e9,extra:{facts:{side,owners:[{name:'A',title:'CEO'},{name:'B',role:'Director'}],total_value:500000,transactions:[{date:'2026-09-29',shares:100,price:10,value:1000,security:'Ordinary shares',ownership:'D',side}]}}});
const envelope=items=>({items,filter_version:3,sectors:[],sources:[]});
async function page(query,fetcher){store.set('me',{tier:'free'});store.set('route',{name:'boards'});globalThis.fetch=fetcher;const root=document.createElement('section');document.body.append(root);const cleanup=await mount(root,{query:new URLSearchParams(query)});return{root,cleanup:()=>{cleanup();root.remove();}};}
test('insider chips apply literal side and exact cap bands, no hidden venue, with preserved URL and focus',async()=>{
 const calls=[];const {root,cleanup}=await page('board=insider&mode=archive',async url=>{calls.push(String(url));return response(envelope([]));});
 try{
  assert.equal(root.querySelector('[name=purchases]').value,'all');assert.equal(root.querySelector('[name=content]').value,'all');
  assert.equal(root.querySelector('[name=purchases]').getAttribute('aria-label'),'Transaction venue');assert.doesNotMatch(root.querySelector('[name=purchases]').textContent,/purchases/i);
  const sell=root.querySelector('[data-insider-direction="-1"]');sell.focus();sell.click();await flush();
  const cap=root.querySelector('[data-insider-cap=large]');cap.focus();cap.click();await flush();
  const request=new URL(calls.filter(x=>x.includes('/radar/archive')).at(-1),'https://ducky.test');
  assert.equal(request.searchParams.get('direction'),'-1');assert.equal(request.searchParams.get('purchases'),'all');assert.equal(request.searchParams.get('cap'),'large');
  assert.equal(document.activeElement,cap);assert.equal(cap.getAttribute('aria-pressed'),'true');assert.equal(root.querySelector('.radar-filter-toggle').getAttribute('aria-expanded'),'false');
  const saved=new URLSearchParams(location.hash.split('?')[1]);assert.equal(saved.get('direction'),'-1');assert.equal(saved.get('cap'),'large');
  assert.match(cap.getAttribute('title'),/10B.*200B/);assert.equal(root.querySelectorAll('[data-insider-cap]').length,7);
  assert.equal(root.querySelector('[data-insider-direction="1"]').textContent,'Buy');assert.doesNotMatch(root.querySelector('.insider-directions').textContent,/positive|negative|Neutral/);
 }finally{cleanup();}
});
test('bookmarked venue, neutral code and unknown cap remain explicit; reset stays Insider',async()=>{
 const {root,cleanup}=await page('board=insider&mode=archive&direction=0&cap=unknown&purchases=open_market&ticker=EX',async()=>response(envelope([])));
 try{
  assert.equal(root.querySelector('[data-insider-direction="0"]').hidden,false);assert.equal(root.querySelector('[data-insider-direction="0"]').getAttribute('aria-pressed'),'true');
  assert.match(root.querySelector('[data-active-filter=purchases]').textContent,/200k/);assert.equal(root.querySelector('[data-insider-cap=unknown]').getAttribute('aria-pressed'),'true');
  root.querySelector('[data-active-filter=purchases]').click();await flush();assert.equal(root.querySelector('[name=ticker]').value,'EX');assert.equal(root.querySelector('[name=purchases]').value,'all');
  root.querySelector('.radar-filter-actions [type=button]').click();await flush();assert.equal(root.querySelector('[data-board=insider]').getAttribute('aria-pressed'),'true');assert.equal(root.querySelector('[name=purchases]').value,'all');
 }finally{cleanup();}
});
test('rapid archive side flips fence old responses and keep failure distinct from empty',async()=>{
 const pending=[];let defer=false;const {root,cleanup}=await page('board=insider&mode=archive',async url=>String(url).includes('/radar/archive')&&defer?new Promise(resolve=>pending.push({url:String(url),resolve})):response(envelope([row('initial')])));
 try{
  defer=true;root.querySelector('[data-insider-direction="1"]').click();root.querySelector('[data-insider-direction="-1"]').click();
  assert.equal(root.querySelector('.radar-records').getAttribute('aria-busy'),'true');assert.equal(root.querySelector('.radar-empty'),null);
  pending[1].resolve(response(envelope([row('sale','sell')])));await flush();pending[0].resolve(response(envelope([row('stale-buy')])));await flush();
  assert.ok(root.querySelector('[data-record-id=sale]'));assert.equal(root.querySelector('[data-record-id=stale-buy]'),null);
  root.querySelector('[data-insider-direction=""]').click();pending[2].resolve(new Response('{}',{status:503,headers:{'content-type':'application/json'}}));await flush();
  assert.match(root.querySelector('.radar-empty').textContent,/load|unavailable|retry/i);assert.doesNotMatch(root.querySelector('.radar-empty').textContent,/No records match/);
 }finally{cleanup();}
});
test('search auto-applies in archive without a second Apply click',async()=>{
 const calls=[];const {root,cleanup}=await page('board=insider&mode=archive',async url=>{calls.push(String(url));return response(envelope([]));});
 try{
  const input=root.querySelector('[name=q]');input.value='chief officer';input.dispatchEvent(new window.Event('input'));
  assert.equal(root.querySelector('.radar-records').getAttribute('aria-busy'),'false','typing alone has not sent a query');await new Promise(r=>setTimeout(r,550));await flush();
  assert.equal(new URL(calls.filter(x=>x.includes('/radar/archive')).at(-1),'https://ducky.test').searchParams.get('q'),'chief officer');
 }finally{cleanup();}
});
test('all exact cap edges and unavailable values retain their meaning',()=>{
 const records=[null,0,3e8,2e9,1e10,2e11].map((market_cap,id)=>({...row(String(id)),market_cap}));
 for(const [cap,id] of [['unknown',0],['micro',1],['small',2],['mid',3],['large',4],['mega',5]])assert.deepEqual(filterRecords(records,{mode:'archive',cap}).map(x=>x.id),[String(id)]);
});
test('single saved price is scoped to original security without inventing USD or an ADS quote',()=>{
 const filing=row('one');const metrics=insiderMetrics(filing);assert.equal(metrics.price,10);assert.equal(metrics.priceBasis,'line');assert.equal(metrics.currency,null);
 const card=activityRow(filing);assert.match(card.textContent,/Reported line price/);assert.match(card.textContent,/Ordinary shares/);assert.match(card.textContent,/Currency not supplied/);assert.doesNotMatch(card.textContent,/ADS|average/i);assert.equal(card.querySelector('.insider-amount').textContent,'$500,000');
});
function priced(){const filing=row('weighted','sell');filing.extra.facts.transactions.push({...filing.extra.facts.transactions[0],shares:300,price:20,value:6000});filing.extra.facts.trade_metrics={schema:'form4-trade-metrics/1',security_title:'Ordinary shares',currency:'USD',currency_basis:'form4_instruction_5',transaction_count:2,priced_transaction_count:2,priced_shares:400,weighted_avg_price:17.5,price_status:'eligible',complete:true,held_pct:null,held_pct_status:'unavailable'};return filing;}
test('weighted average needs exact complete compatible source projection and no owner multiplication',()=>{
 const filing=priced();assert.equal(insiderMetrics(filing).price,17.5);assert.equal(insiderMetrics(filing).holdingPct,null);assert.match(activityRow(filing).textContent,/Weighted average.*\$17.50/);assert.match(activityRow(filing).textContent,/Holding proportion unavailable/);
 for(const change of [m=>m.complete=false,m=>m.currency='EUR',m=>m.transaction_count=3,m=>m.weighted_avg_price=20,m=>m.priced_shares=500]){const altered=priced();change(altered.extra.facts.trade_metrics);assert.equal(insiderMetrics(altered).price,null);}
 const mixed=priced();mixed.extra.facts.transactions[1].security='Depositary shares';assert.equal(insiderMetrics(mixed).price,null);
 const missing=priced();missing.extra.facts.transactions[1].price=null;assert.equal(insiderMetrics(missing).price,null);
 const range=priced();range.extra.facts.transactions[1].price='19–21';assert.equal(insiderMetrics(range).price,null);
 const old=priced();delete old.extra.facts.trade_metrics;assert.equal(insiderMetrics(old).price,null);
});
test('holding percentage only uses exact backend reported-sale scope, including genuine zero remaining shares',()=>{
 const filing=priced();filing.extra.facts.transactions=[{...filing.extra.facts.transactions[0],shares:400}];Object.assign(filing.extra.facts.trade_metrics,{held_pct:100,held_pct_status:'eligible',held_pct_basis:'single_sale_reported_scope',owner_scope:'reported direct holding',ownership:'D',shares_sold:400,shares_owned_after:0});assert.equal(insiderMetrics(filing).holdingPct,100);
 filing.extra.facts.trade_metrics.shares_owned_after=null;assert.equal(insiderMetrics(filing).holdingPct,null);
 filing.extra.facts.trade_metrics.shares_owned_after=100;assert.equal(insiderMetrics(filing).holdingPct,null);
});

test('recent side flip hides old filtered rows while waiting and fences a previous account response',async()=>{
 const pending=[];let defer=false;const {root,cleanup}=await page('board=insider',async url=>String(url).includes('/radar/archive')&&defer?new Promise(resolve=>pending.push(resolve)):response(envelope([row('old-buy')])));
 try{
  assert.ok(root.querySelector('[data-record-id=old-buy]'));defer=true;
  root.querySelector('[data-insider-direction="-1"]').click();
  assert.equal(root.querySelector('[data-record-id=old-buy]'),null);assert.equal(root.querySelector('.radar-empty'),null);assert.equal(root.querySelector('.radar-records').getAttribute('aria-busy'),'true');
  pending[0](response(envelope([row('current-sell','sell')])));await flush();assert.ok(root.querySelector('[data-record-id=current-sell]'));
  root.querySelector('[data-insider-direction="1"]').click();const before=root.innerHTML;store.bumpEpoch();
  pending[1](response(envelope([row('old-account-buy')])));await flush();assert.equal(root.innerHTML,before);assert.equal(root.querySelector('[data-record-id=old-account-buy]'),null);
 }finally{cleanup();}
});
test('disposal aborts an in-flight archive read and late data cannot replace the current page',async()=>{
 let deferred,signal,late=false;const {root,cleanup}=await page('board=insider&mode=archive',async (url,options)=>String(url).includes('/radar/archive')&&late?new Promise(resolve=>{deferred=resolve;signal=options.signal;}):response(envelope([])));
 late=true;root.querySelector('[data-insider-direction="-1"]').click();cleanup();assert.equal(signal.aborted,true);
 const before=root.innerHTML;deferred(response(envelope([row('late-disposed','sell')])));await flush();assert.equal(root.innerHTML,before);
});

test('a sale reader uses sale-side label and venue facts, retaining full original source',()=>{
 const filing=row('sale-reader','sell');Object.assign(filing.extra.facts,{sale_values:{open_market:123456},purchase_values:{open_market:999999}});filing.source_url='https://www.sec.gov/Archives/edgar/data/0/synthetic.xml';filing.extra.message_en='Full original synthetic filing text.';
 const reader=itemRow(filing,{standalone:true});assert.match(reader.textContent,/Insider sale/);assert.doesNotMatch(reader.textContent,/Insider purchase|purchases only|999,999/);assert.match(reader.textContent,/123,456/);assert.match(reader.textContent,/Full original synthetic filing text/);assert.equal(reader.querySelector('[data-source-record]').href,filing.source_url);
});
test('single-character free text does not scan the archive',async()=>{
 const calls=[];const {root,cleanup}=await page('board=insider&mode=archive',async url=>{calls.push(String(url));return response(envelope([]));});
 try{const n=calls.length,input=root.querySelector('[name=q]');input.value='ab';input.dispatchEvent(new window.Event('input'));input.value='a';input.dispatchEvent(new window.Event('input'));await new Promise(r=>setTimeout(r,550));assert.equal(calls.length,n);assert.equal(root.querySelector('.radar-records').getAttribute('aria-busy'),'false');}finally{cleanup();}
});

test('reported holding percent rejects indirect or contradictory transaction scope',()=>{
 const filing=row('holding-proof','sell');filing.extra.facts.trade_metrics={schema:'form4-trade-metrics/1',security_title:'Ordinary shares',held_pct:10,held_pct_status:'eligible',held_pct_basis:'single_sale_reported_scope',shares_sold:100,shares_owned_after:900,ownership:'D',owner_scope:'cik:0000000000|D|Ordinary shares'};
 assert.equal(insiderMetrics(filing).holdingPct,10);
 for(const mutate of [f=>f.trade_metrics.ownership='I',f=>f.transactions[0].ownership='I',f=>f.transactions[0].shares=50,f=>f.transactions[0].side='buy',f=>f.transactions[0].security='ADS',f=>f.transactions.push({...f.transactions[0]}),f=>f.transactions=[null]]){const changed=structuredClone(filing);mutate(changed.extra.facts);assert.equal(insiderMetrics(changed).holdingPct,null);}
});

test('tax-purpose label requires typed row-local evidence and does not reinterpret sale sentiment',()=>{
 const filing=row('tax','sell'),tx=filing.extra.facts.transactions[0];tx.source_evidence=[{id:'F4',text:'Reported price was converted to USD in this synthetic filing.'}];tx.purpose_evidence=[{id:'F3',text:'The sale covers tax liabilities in this synthetic filing.'}];tx.transaction_purpose='tax_related_sale';
 assert.equal(insiderMetrics(filing).taxRelated,false,'footnote prose alone does not classify purpose');
 tx.purpose_rule='form4-purpose/1';assert.equal(insiderMetrics(filing).taxRelated,true);assert.match(activityRow(filing).textContent,/Includes tax-related sale/);assert.equal(activityRow(filing).querySelector('.radar-action').textContent,'Sell');
 const reader=itemRow(filing,{standalone:true});assert.match(reader.querySelector('.insider-source-notes').textContent,/F3.*tax liabilities/);assert.match(reader.querySelector('.insider-source-notes').textContent,/F4.*converted to USD/);
 filing.extra.facts.trade_metrics={schema:'form4-trade-metrics/1',complete:true,transaction_count:1,currency_evidence:[{id:'F4',text:'Reported USD conversion.'}]};assert.equal(insiderMetrics(filing).taxWhole,true);assert.equal(activityRow(filing).querySelector('.insider-purpose').textContent,'Tax-related sale');
 tx.purpose_evidence=[];assert.equal(insiderMetrics(filing).taxRelated,false);
});

test('sale venue filters retain server sale facts instead of reading unrelated purchase amounts',()=>{
 const sale=row('sale-venue','sell');Object.assign(sale.extra.facts,{venue_rule:'form4-open-market-v1',sale_values:{unverified:12345,private_or_offering:0},purchase_values:{private_or_offering:99999}});
 assert.deepEqual(filterRecords([sale],{mode:'archive',board:'insider',direction:'-1',purchases:'unverified'}).map(x=>x.id),['sale-venue']);
 assert.equal(filterRecords([sale],{mode:'archive',board:'insider',purchases:'private_or_offering'}).length,0);
 sale.extra.facts.sale_values.private_or_offering=100;assert.equal(filterRecords([sale],{mode:'archive',board:'insider',purchases:'private_or_offering'}).length,1);
});

test('archive and recent keep genuine sale-venue rows after the server has filtered them',async()=>{
 const sale=row('saved-sale','sell');Object.assign(sale.extra.facts,{sale_values:{unverified:40000,private_or_offering:123000},venue_rule:'form4-open-market-v1'});
 for(const mode of ['archive','recent'])for(const venue of ['unverified','private_or_offering']){
  const {root,cleanup}=await page('board=insider&mode='+mode+'&direction=-1&purchases='+venue,async()=>response(envelope([sale])));
  try{assert.ok(root.querySelector('[data-record-id=saved-sale]'),mode+' '+venue);}finally{cleanup();}
 }
 const contradictory=structuredClone(sale);contradictory.extra.facts.side='buy';assert.equal(filterRecords([contradictory],{mode:'archive',purchases:'unverified'}).length,0);
 delete sale.extra.facts.side;assert.equal(filterRecords([sale],{mode:'archive',purchases:'private_or_offering'}).length,1,'old missing side follows the saved direction');
 sale.direction=0;assert.equal(filterRecords([sale],{mode:'archive',purchases:'private_or_offering'}).length,0);
 delete sale.extra.facts.venue_rule;assert.equal(filterRecords([sale],{mode:'archive',purchases:'unverified'}).length,1,'unknown venue is not promoted to a verified private transaction');
});
test('changing to Funds during the first pending All read starts and renders its own query',async()=>{
 store.set('me',{tier:'free'});store.set('route',{name:'boards'});let first,firstSeen=false;const calls=[];
 const fund={id:'initial-fund',kind:'13f',ticker:'EX',ts:new Date().toISOString(),summary:'Synthetic fund',extra:{facts:{position_change:'new',new_shares:10,report_period:'2026-06-30'}}};
 globalThis.fetch=async url=>{calls.push(String(url));if(String(url).includes('/radar/archive')&&!firstSeen){firstSeen=true;return new Promise(resolve=>first=resolve);}return response(envelope(String(url).includes('kind=13f')?[fund]:[]));};
 const root=document.createElement('section');document.body.append(root);const mounted=mount(root,{query:new URLSearchParams()});
 root.querySelector('[data-board=funds]').click();assert.equal(root.querySelector('.radar-records').getAttribute('aria-busy'),'true');
 first(response(envelope([row('old-all')])));const cleanup=await mounted;
 try{await new Promise(r=>setTimeout(r,230));await flush();assert.ok(calls.some(url=>url.includes('kind=13f')));assert.ok(root.querySelector('[data-record-id=initial-fund]'));assert.equal(root.querySelector('[data-record-id=old-all]'),null);}finally{cleanup();root.remove();}
});

test('the desktop activity categories override the legacy hidden sidebar without changing reports',()=>{
 const legacy=readFileSync('public/css/workspace.css','utf8').match(/\.page-app \.radar-sidebar\{display:none\}/)?.[0];assert.ok(legacy);
 const page=new JSDOM('<body class="page-app"><section class="radar-activity-workspace"><aside class="radar-sidebar"></aside></section><section class="reports-view"><aside class="radar-sidebar"></aside></section></body>');
 try{const style=page.window.document.createElement('style');style.textContent=legacy+'\n'+readFileSync('public/css/app-ux-radar.css','utf8');page.window.document.head.append(style);assert.equal(page.window.getComputedStyle(page.window.document.querySelector('.radar-activity-workspace .radar-sidebar')).display,'block');assert.equal(page.window.getComputedStyle(page.window.document.querySelector('.reports-view .radar-sidebar')).display,'none');}finally{page.window.close();}
});
