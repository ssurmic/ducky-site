import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const copy=JSON.parse(readFileSync('i18n/en.json')),zh=JSON.parse(readFileSync('i18n/zh.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const digest=await import('../public/js/app/watchlist-digest.js');
const {reading,hasSummary}=await import('../public/js/app/stock-reading.js');
const {metricCell}=await import('../public/js/app/watchlist-metrics.js');
const signals=await import('../public/js/app/watchlist-signals.js');

const filing=(side,price,shares,date,name)=>({date,side,owners:[{name,role:'Officer'}],transactions:[{price,shares,date}],value:price*shares});
const sig={
 insider:{status:'ready',count:3,buys:0,sells:3,bought:0,sold:410.5e6,filings:[filing('sell',186,1e6,'2026-06-23','STEVENS MARK A')],latest:'2026-06-23'},
 funds:{status:'ready',adds:new Array(6).fill({side:'add'}),trims:new Array(7).fill({side:'trim'}),moves:[{side:'add',fund:'Appaloosa LP',period:'2026 Q2'}]},
 politicians:{status:'ready',count:7,buys:4,sells:3,trades:[{side:'sell',date:'2026-08-18',politician:'Gil Cisneros',amount:'$1,001 - $15,000'}]},
 walls:{status:'ready',call:240,put:221,price:227.38,expiries:['2026-09-21']},
 support:{status:'ready',refs:[{key:'put_wall',value:221,gap:-2.8}],low:208.25,high:230.1,price:227.38,sessions:20}};
const row={ticker:'NVDA',metrics:{ytd:{status:'ready',value:22.2},drawdown:{status:'ready',value:-3.3},relative:{status:'stale',value:-24.1,as_of:'2026-09-21',symbols:['AMD']},iv_hv:{status:'ready',value:0.58,expiry:'2026-09-28'},attention:{status:'insufficient'},degen:{status:'insufficient'}}};

test('the digest starts with today\'s close and the price against its references, then activity; it never names a floor or target',()=>{
 const text=digest.digestText(row,sig);
 assert.equal(text,'2.9% above the put wall $221 · 5.6% under the call wall $240 · at the high end of its 20-day range · options price less movement than the last 20 sessions (IV/HV 0.58×) · +22.2% YTD · 3.3% under the 52W closing high · Insiders net selling $410.5M (3 filings, 6 mo) · Funds: 6 added · 7 trimmed · Politicians: 4 buys · 3 sales');
 for(const banned of ['target','floor','buy now'])assert.ok(!text.toLowerCase().includes(banned));
 assert.deepEqual(digest.digestParts({},{insider:{status:'none'},funds:{status:'missing'},walls:{status:'none'}}),[]);
 // The call wall wins when it sits closer to the last price.
 const near=digest.nearestWall({status:'ready',call:228,put:200,price:227.38});
 assert.equal(near.kind,'call');assert.ok(near.gap>0&&near.gap<0.3);
 // A pulled-back stock within 3% of a reference below, with no insider net selling, gets the plain reading.
 const back={ticker:'AMD',change_pct:-1.2,price_status:'ready',metrics:{ytd:{status:'ready',value:-4},drawdown:{status:'ready',value:-14.5},iv_hv:{status:'ready',value:1.35}}};
 const quiet={insider:{status:'none'},funds:{status:'ready',adds:[{}],trims:[]},politicians:{status:'none'},
  walls:{status:'ready',call:170,put:140,price:143.2},support:{status:'ready',refs:[{key:'put_wall',value:140,gap:-2.2},{key:'range_low',value:139,gap:-2.9}],low:139,high:171,price:143.2,sessions:20}};
 const parts=digest.digestParts(back,quiet);
 assert.equal(parts[0],'Closed down -1.20% today');
 assert.equal(parts[1],'2.3% above the put wall $140');
 assert.ok(parts.includes('at the low end of its 20-day range'));
 assert.ok(parts.includes('options price more movement than the last 20 sessions (IV/HV 1.35×)'));
 assert.equal(parts.at(-1),copy['app.watch.digest_pullback']);
 // A stock at its high with insiders selling gets no such reading.
 assert.ok(!digest.digestParts(row,sig).includes(copy['app.watch.digest_pullback']));
});

test('every digest and help string has a Chinese twin without English leaking into either',()=>{
 for(const key of Object.keys(copy).filter(k=>/^app\.watch\.(digest_|strip_|metric_help_)/.test(k))){
  assert.ok(zh[key],key+' missing in zh');assert.ok(!/[㐀-鿿]/.test(copy[key]),key+' has CJK in en');
 }
});

test('a pending stock summary shows the digest with the pending state as a caption; a reviewed summary is untouched',()=>{
 const pending=reading({ticker:'NVDA',status:'pending',records:3},{digest:digest.digestText(row,sig)});
 assert.ok(pending.querySelector('.stock-digest').textContent.includes('Insiders net selling'));
 assert.equal(pending.querySelector('.stock-digest-note').textContent,copy['app.watch.digest_note']);
 assert.ok(!pending.textContent.includes('not ready yet'));
 const loading=reading({ticker:'NVDA',status:'read_pending'},{digest:'x'});
 assert.equal(loading.querySelector('.stock-digest-note').textContent,copy['app.focus.summary_loading']);
 const bare=reading({ticker:'NVDA',status:'pending',records:3},{digest:''});
 assert.equal(bare.textContent,copy['app.focus.analysis_waiting']);
 const ready=reading({ticker:'NVDA',status:'ready',overview:{en:'A reviewed line.',zh:'一句。',citations:['s1']},sources:[{id:'s1',title:{en:'T',zh:'T'}}]},{digest:'ignored'});
 assert.equal(ready.querySelector('.stock-one-sentence').firstChild.textContent,'A reviewed line.');
 assert.equal(ready.querySelector('.stock-digest'),null);
});

test('the strip counts stocks, not filings, and hides until any signal column has loaded',()=>{
 const map=new Map([['NVDA',sig],['AMD',{insider:{status:'ready',count:1,buys:1,sells:0,bought:5e5,sold:0},funds:{status:'ready',adds:[],trims:[{}]},walls:{status:'ready',call:150,put:100,price:120}}]]);
 const summary=digest.listSummary([{ticker:'NVDA'},{ticker:'AMD'},{ticker:'ZZZ'}],map);
 assert.deepEqual(summary,{n:3,sells:1,buys:1,funds:0,walls:1,loaded:true});
 assert.equal(digest.listSummary([{ticker:'NVDA'}],new Map()).loaded,false);
});

test('metric cells carry the number and at most one qualifier; states and dates move to the title',()=>{
 const stale=metricCell('relative',row.metrics.relative);
 assert.equal(stale.querySelectorAll('.watch-metric-status').length,0);
 assert.equal(stale.getAttribute('title'),copy['app.watch.metric_stale']+' · 2026-09-21');
 assert.equal(stale.querySelector('.watch-metric-note').textContent,'AMD');
 const ytd=metricCell('ytd',row.metrics.ytd);
 assert.equal(ytd.querySelector('.watch-metric-note'),null);assert.equal(ytd.querySelector('.watch-metric-value').textContent,'+22.2%');
 const thin=metricCell('degen',row.metrics.degen);
 assert.equal(thin.querySelector('.watch-metric-value').textContent,'—');
 assert.equal(thin.querySelector('.watch-metric-note'),null);
 assert.ok(thin.getAttribute('title').startsWith(copy['app.watch.metric_insufficient']));
 const iv=metricCell('iv_hv',row.metrics.iv_hv);
 assert.equal(iv.querySelector('.watch-metric-note').textContent,copy['app.watch.metric_iv_lower']);
});

test('signal cells keep three short lines; counts, ranges and closes stay in titles and the card',()=>{
 const cell=signals.signalCell('insider',sig,{ticker:'NVDA'});
 assert.equal(cell.querySelectorAll('.watch-signal-mix').length,0);
 assert.equal(cell.querySelector('.watch-signal-net').getAttribute('title'),'3 sales');
 const event=cell.querySelector('.watch-signal-event');
 assert.ok(event.textContent.includes('STEVENS MARK A'));assert.equal(event.getAttribute('title'),event.textContent);
 const funds=signals.signalCell('funds',sig,{ticker:'NVDA'});
 assert.equal(funds.querySelectorAll('.watch-signal-range').length,0);
 assert.ok(funds.querySelector('.watch-signal-event').getAttribute('title').includes('Appaloosa LP'));
 const pol=signals.signalCell('politicians',sig,{ticker:'NVDA'});
 assert.equal(pol.querySelectorAll('.watch-signal-ref').length,0);
});


test('metric headers are one short line with the full name on the button; wall and support cells are single lines',async()=>{
 const {overviewView}=await import('../public/js/app/watchlist-overview.js');
 const root=overviewView([{ticker:'NVDA',company:'NVIDIA Corporation',market_cap:5.4e12,price:227.38,change_pct:2.3,price_session:'2026-09-21',metrics:row.metrics}],
  {view:'list',renderResearch:()=>document.createElement('div'),signals:new Map([['NVDA',sig]]),session:'2026-09-21'});
 const heads=[...root.querySelectorAll('thead th[data-metric] .watch-sort')];
 assert.deepEqual(heads.map(n=>n.querySelector('.watch-sort-label').textContent),['YTD','52W high','vs peers','IV/HV20','Reddit','Degen']);
 assert.equal(heads[0].getAttribute('aria-label'),copy['app.watch.metric_ytd']);assert.equal(heads[1].title,copy['app.watch.metric_drawdown']);
 const walls=root.querySelector('td[data-signal=walls] .watch-signal');
 assert.equal(walls.querySelectorAll('.watch-metric-note').length,0);assert.match(walls.title,/09\/21/);
 assert.equal(walls.querySelectorAll('.watch-wall').length,2);
 const support=root.querySelector('td[data-signal=support] .watch-signal');
 assert.ok(support.querySelector('.watch-support-reference'));assert.match(support.querySelector('.watch-range')?.getAttribute('aria-label')||'',/20-day/);
});

test('digest values keep the colour of their column: price up/down, buys green, sales orange, put green, call orange',()=>{
 const nodes=digest.digestNodes({...row,change_pct:1.2,price_status:'ready'},sig),host=document.createElement('p');host.append(...nodes);
 const toned=[...host.querySelectorAll('.stock-digest-value')].map(n=>[n.className.replace('stock-digest-value ',''),n.textContent]);
 assert.deepEqual(toned.slice(0,5),[['is-up','+1.20%'],['is-put','put wall'],['is-call','call wall'],['is-up','+22.2%'],['is-down','3.3']]);
 assert.ok(toned.some(([c,v])=>c==='is-sell'&&v==='$410.5M'));
 assert.ok(toned.some(([c,v])=>c==='is-buy'&&v==='6 added')&&toned.some(([c,v])=>c==='is-sell'&&v==='7 trimmed'));
 assert.ok(toned.some(([c,v])=>c==='is-buy'&&v==='4 buys')&&toned.some(([c,v])=>c==='is-sell'&&v==='3 sales'));
 assert.equal(host.textContent,'Closed up +1.20% today · '+digest.digestText(row,sig));
 // The table preview and the reading cell carry the same coloured line.
 const cell=reading({ticker:'NVDA',status:'pending',records:3},{digest:nodes});
 assert.equal(cell.querySelectorAll('.stock-digest .stock-digest-value.is-sell').length,3);
});

test('a digest saved on the projection row wins over the browser pass, and unknown keys or copy are dropped',()=>{
 const saved={ticker:'NVDA',digest:{session:'2026-09-19',parts:[{key:'watch.digest_close_up',vars:{n:{v:2.5,f:'pct2',tone:'up'}}},
  {key:'watch.digest_above_reference',vars:{n:{v:1.234,f:'num1'},price:{v:221,f:'strike'},kind:{key:'watch.digest_ref_put',tone:'put'}}},
  {key:'watch.digest_funds',vars:{moves:{join:[{count:2,one:'watch.signal_adds_one',many:'watch.signal_adds_many',tone:'buy'},'']}}},
  {key:'nav.today',vars:{}},{key:'watch.digest_ytd',vars:{n:{key:'billing.title'}}},{key:'watch.digest_ytd',vars:{n:'<b>x</b>'}}]}};
 assert.equal(digest.digestText(saved,sig),'Closed up +2.50% today · 1.2% above the put wall $221 · Funds: 2 added ·  YTD · <b>x</b> YTD');
 const host=document.createElement('p');host.append(...digest.digestNodes(saved,sig));
 assert.equal(host.querySelector('b'),null);assert.equal(host.querySelector('.is-put').textContent,'put wall');
 assert.equal(digest.serverItems({parts:[]}),null);assert.equal(digest.serverItems({parts:[{key:'nav.today'}]}),null);
 assert.equal(digest.digestText({...row,digest:{parts:'nope'}},sig),digest.digestText(row,sig));
});

test('signal cards show the move from each record\'s own reference price to the last price',()=>{
 const card=signals.signalCard('insider',sig,'NVDA',{price:227.38,session:'2026-09-19'});
 assert.match(card.querySelector('.watch-since-note').textContent,/Last price \$227\.38 \(2026-09-19\)/);
 const since=card.querySelector('.watch-signal-item .watch-since');
 assert.equal(since.textContent,'+22.2% since this filing\'s average price $186.00');assert.ok(since.classList.contains('is-up'));
 const funds=signals.signalCard('funds',{funds:{status:'ready',moves:[{side:'trim',fund:'Appaloosa LP',period:'2026 Q2',periodEnd:'2026-06-30',quarterEnd:250,range:null,shares:{prior:1,now:0},filed:'2026-08-14',url:''}]}},'NVDA',{price:227.38});
 const trim=funds.querySelector('.watch-since');
 assert.equal(trim.textContent,'-9.0% since the quarter end (2026-06-30); a 13F reports no trade price');assert.ok(trim.classList.contains('is-down'));
 const pol=signals.signalCard('politicians',{politicians:{status:'ready',trades:[{side:'buy',date:'2026-08-18',politician:'X',amount:'$1,001 - $15,000',close:200,closeDate:'2026-08-18'}]}},'NVDA',{price:227.38});
 assert.equal(pol.querySelector('.watch-since').textContent,'+13.7% since the trade-date close $200.00');
 // No last price, no since-line and no note: nothing is invented.
 assert.equal(signals.signalCard('insider',sig,'NVDA').querySelector('.watch-since, .watch-since-note'),null);
 for(const key of ['app.watch.since_note','app.watch.since_filing','app.watch.since_quarter_end','app.watch.since_trade_close','app.watch.signal_above_short','app.watch.signal_below_short'])assert.ok(zh[key],key);
});

test('only a reviewed summary with resolvable citations counts as a current analysis',()=>{
 const ready={ticker:'COIN',status:'ready',overview:{en:'A line.',zh:'一句。',citations:['s1']},sources:[{id:'s1'}]};
 assert.equal(hasSummary(ready),true);
 assert.equal(hasSummary({...ready,status:'pending'}),false);
 assert.equal(hasSummary({...ready,sources:[]}),false);
 assert.equal(hasSummary({...ready,overview:{en:'',zh:'',citations:['s1']}}),false);
 assert.equal(hasSummary(null),false);
});

test('wall rows keep the kind chip and the price visible; the distance is short with the full phrase in the title',()=>{
 const cell=signals.signalCell('walls',sig,{ticker:'NVDA',price:227.38});
 const rows=[...cell.querySelectorAll('.watch-wall')];
 assert.deepEqual(rows.map(r=>r.textContent),['Call$2405.6% above','Put$2212.8% below']);
 assert.equal(rows[0].title,'5.6% above · Exp 09/21');assert.match(rows[1].title,/^2\.8% below · Exp/);
});

test('left-side and right-side readings render under the digest only when both are present and ready',()=>{
 const views={status:'ready',session:'2026-09-19',right:{en:'Trend followers watch the close hold above the 20-day low.',zh:'趋势派关注收盘能否守住 20 日低点。'},left:{en:'Long-term holders watch the pullback depth.',zh:'长线持有者关注回调深度。'}};
 const cell=reading({ticker:'NVDA',status:'pending',records:3},{digest:digest.digestNodes(row,sig),views});
 const lines=[...cell.querySelectorAll('.stock-view')].map(n=>n.textContent);
 assert.deepEqual(lines,['Right side · trend viewTrend followers watch the close hold above the 20-day low.','Left side · long-term viewLong-term holders watch the pullback depth.']);
 assert.match(cell.querySelector('.stock-views-note').textContent,/not advice/);
 assert.equal(reading({ticker:'NVDA',status:'pending'},{digest:digest.digestNodes(row,sig),views:{...views,left:null}}).querySelector('.stock-views'),null);
 assert.equal(reading({ticker:'NVDA',status:'pending'},{digest:'',views}).querySelector('.stock-views'),null);
 for(const key of ['app.watch.view_right','app.watch.view_left','app.watch.views_note'])assert.ok(zh[key]&&!/[㐀-鿿]/.test(copy[key]),key);
});
