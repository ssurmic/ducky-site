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
const {reading}=await import('../public/js/app/stock-reading.js');
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

test('the digest reads every loaded column in one line, nearest wall first among references, and never names a floor or target',()=>{
 const text=digest.digestText(row,sig);
 assert.equal(text,'Insiders net selling $410.5M (3 filings, 6 mo) · Funds: 6 added · 7 trimmed · Politicians: 4 buys · 3 sales · Put wall $221, 2.8% below the last price · +22.2% YTD, 3.3% under the 52W closing high');
 for(const banned of ['target','floor','buy now'])assert.ok(!text.toLowerCase().includes(banned));
 assert.deepEqual(digest.digestParts({},{insider:{status:'none'},funds:{status:'missing'},walls:{status:'none'}}),[]);
 // The call wall wins when it sits closer to the last price.
 const near=digest.nearestWall({status:'ready',call:228,put:200,price:227.38});
 assert.equal(near.kind,'call');assert.ok(near.gap>0&&near.gap<0.3);
});

test('every digest and help string has a Chinese twin without English leaking into either',()=>{
 for(const key of Object.keys(copy).filter(k=>/^app\.watch\.(digest_|strip_|metric_help_)/.test(k))){
  assert.ok(zh[key],key+' missing in zh');assert.ok(!/[㐀-鿿]/.test(copy[key]),key+' has CJK in en');
 }
});

test('a pending stock summary shows the digest with the pending state as a caption; a reviewed summary is untouched',()=>{
 const pending=reading({ticker:'NVDA',status:'pending',records:3},{digest:digest.digestText(row,sig)});
 assert.ok(pending.querySelector('.stock-digest').textContent.startsWith('Insiders net selling'));
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
