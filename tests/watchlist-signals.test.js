import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const signals=await import('../public/js/app/watchlist-signals.js');
const {sortRows}=await import('../public/js/app/watchlist-overview.js');
const store=await import('../public/js/app/store.js');
const watch=await import('../public/js/app/views/watchlist.js');
const {closeModal}=await import('../public/js/app/ui.js');
const pause=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,0));};

const briefs={items:[
 {ticker:'NVDA',status:'ready',generated_at:'2026-09-11T20:00:00Z',evidence:[
  {topic:'price',dimension:'technical',data:{price:218.29},observed_at:'2026-09-11T20:00:00Z'},
  {topic:'reported_insider_purchase',dimension:'flows',observed_at:'2026-09-03T00:00:00Z',source_at:'2026-09-02T21:00:00Z',
   data:{owners:[{name:'Jane Doe',role:'Director'}],transactions:[{price:200,shares:5000},{price:210,shares:1000}],form:'4'}},
  {topic:'option_concentrations',dimension:'technical',observed_at:'2026-09-11T20:00:00Z',data:{put_wall:200,call_wall:240,flip:215,expiries:['2026-09-18','2026-10-16']}},
  {topic:'price_position',dimension:'technical',observed_at:'2026-09-11T20:00:00Z',data:{low:195,high:240,price:218.29,sessions:20}}]},
 {ticker:'AAPL',status:'ready',evidence:[{topic:'price',data:{price:332}}]},
 {ticker:'TSLA',status:'pending'}]};
const funds={items:[
 {id:'13f:1',kind:'13f',ticker:'NVDA',reporter_name:'Bridgewater Associates',ts:'2026-08-14T12:00:00Z',direction:1,extra:{facts:{position_change:'increased',report_period:'2026-06-30'}}},
 {id:'13f:2',kind:'13f',ticker:'NVDA',reporter_name:'Tiger Global',ts:'2026-08-13T12:00:00Z',direction:1,extra:{facts:{position_change:'new',report_period:'2026-06-30'}}},
 {id:'ins:1',kind:'insider',ticker:'AAPL',ts:'2026-08-01T00:00:00Z'}]};

test('brief facts become dated insider, option-wall and support references without inventing a floor',()=>{
 const nvda=signals.briefSignals(briefs.items[0]);
 assert.equal(nvda.insider.status,'ready');assert.equal(nvda.insider.count,1);assert.equal(nvda.insider.value,1210000);
 assert.equal(nvda.insider.latest,'2026-09-02');assert.deepEqual(nvda.insider.owners,['Jane Doe']);
 assert.equal(nvda.walls.call,240);assert.equal(nvda.walls.put,200);assert.deepEqual(nvda.walls.expiries,['2026-09-18','2026-10-16']);
 assert.equal(nvda.support.refs.length,2);assert.equal(nvda.support.refs[0].key,'put_wall');assert.ok(nvda.support.refs[0].gap<-8&&nvda.support.refs[0].gap>-9);
 const aapl=signals.briefSignals(briefs.items[1]);
 assert.equal(aapl.insider.status,'none');assert.equal(aapl.walls.status,'none');assert.equal(aapl.support.status,'none');
 const tsla=signals.briefSignals(briefs.items[2]);
 assert.equal(tsla.insider.status,'missing');assert.equal(tsla.support.status,'missing');
});

test('13F adds group by stock with fund names, and stocks outside the page read as none rather than unknown',()=>{
 const archive=signals.fundSignals(funds);
 assert.equal(archive.count,2);assert.equal(archive.since,'2026-08-13');
 assert.equal(archive.byTicker.get('NVDA').adds.length,2);assert.equal(archive.byTicker.get('NVDA').adds[0].fund,'Bridgewater Associates');
 const all=signals.buildSignals(briefs,funds,['NVDA','AAPL','TSLA','MSFT']);
 assert.equal(all.get('MSFT').funds.status,'none');assert.equal(all.get('MSFT').insider.status,'missing');
 assert.equal(all.get('NVDA').funds.status,'ready');assert.equal(all.meta.count,2);
 const unknown=signals.buildSignals(null,null,['NVDA']);
 assert.equal(unknown.get('NVDA').funds.status,'missing');assert.equal(unknown.meta.loaded,false);
});

test('signal cells read bought/sold with amounts, walls carry their distance to price, support draws the 20-day range',()=>{
 const all=signals.buildSignals(briefs,funds,['NVDA','AAPL','TSLA']);
 const insider=signals.signalCell('insider',all.get('NVDA'));
 assert.equal(insider.dataset.status,'ready');assert.match(insider.querySelector('.watch-signal-net').textContent,/^Buying \$1\.2M$/);assert.ok(insider.querySelector('.watch-signal-net').classList.contains('is-yes'));
 assert.match(insider.textContent,/1 buy/);assert.match(insider.textContent,/Latest 09\/02 · Jane Doe bought \$1\.2M/);assert.equal(insider.querySelector('.watch-balance-sell').style.width,'0%');assert.match(insider.textContent,/09\/02/);
 assert.match(signals.signalCard('insider',all.get('NVDA'),'NVDA').textContent,/Bought \$1\.2M · Avg \$201\.67 · 6K sh/);
 assert.equal(all.get('NVDA').insider.shares,6000);
 const none=signals.signalCell('insider',all.get('AAPL'));
 assert.equal(none.dataset.status,'none');assert.match(none.textContent,/No/);assert.match(none.textContent,/No open-market Form 4 trades/);
 const pending=signals.signalCell('insider',all.get('TSLA'));
 assert.equal(pending.dataset.status,'missing');assert.match(pending.textContent,/Data pending/);
 const fundsCell=signals.signalCell('funds',all.get('NVDA'));
 assert.match(fundsCell.querySelector('.watch-signal-net').textContent,/^2 funds added$/);assert.match(fundsCell.textContent,/Bridgewater Associates added · 2026 Q2/);assert.match(fundsCell.textContent,/13F filed 08\/14/);
 const ranged=signals.buildSignals(briefs,{items:[{...funds.items[0],extra:{facts:{position_change:'increased',report_period:'2026-06-30',prior_shares:1000000,new_shares:1500000,new_value:2.4e8,quarter_price_range:{low:150,high:178.5,sessions:63}}}}]},['NVDA']);
 const rangedCell=signals.signalCell('funds',ranged.get('NVDA'),{ticker:'NVDA'});assert.match(rangedCell.querySelector('.watch-signal-range').textContent,/\$150–\$178\.50/);
 const fundCard=signals.signalCard('funds',ranged.get('NVDA'),'NVDA');assert.match(fundCard.textContent,/Shares 1M → 1\.5M/);assert.match(fundCard.textContent,/Quarter-end reported price ≈ \$160\.00/);assert.match(fundCard.textContent,/Quarter price range \$150–\$178\.50/);assert.ok([...fundCard.querySelectorAll('a')].some(a=>a.getAttribute('href')==='#/boards?board=partner&ticker=NVDA'));
 const walls=signals.signalCell('walls',all.get('NVDA'));
 assert.match(walls.querySelector('.watch-wall.is-call').textContent,/\$240/);assert.match(walls.querySelector('.watch-wall.is-call').textContent,/9\.9% above/);
 assert.match(walls.querySelector('.watch-wall.is-put').textContent,/8\.4% below/);assert.match(walls.textContent,/Exp 09\/18 \/ 10\/16/);
 const support=signals.signalCell('support',all.get('NVDA'));
 assert.match(support.textContent,/Put wall/);assert.match(support.textContent,/8\.4% below/);
 assert.equal(support.querySelector('.watch-range-dot').style.left,'51.8%');assert.match(support.querySelector('.watch-range').getAttribute('aria-label'),/\$195.*\$240/);
 assert.match(signals.signalCell('walls',all.get('AAPL')).textContent,/No option concentration data/);
 assert.match(signals.signalCard('funds',all.get('AAPL'),'AAPL').textContent,/No adds or trims in tracked funds' 13F filings/);
 assert.match(signals.signalCard('insider',all.get('AAPL'),'AAPL').textContent,/No open-market Form 4 trades in 12 months/);
 assert.doesNotMatch([insider,fundsCell,walls,support].map(n=>n.textContent).join(' '),/target|guarantee|floor/i);
});

test('wall-only and range-only stocks share labeled support slots without fabricating range data',()=>{
 const wallOnly=signals.briefSignals({evidence:[
  {topic:'price',data:{price:230}},
  {topic:'option_concentrations',data:{put_wall:225,call_wall:240}}]});
 const rangeOnly=signals.briefSignals({evidence:[
  {topic:'price_position',data:{price:184.55,low:146.23,high:192.70,sessions:20}}]});
 for(const [ticker,sig,kind] of [['NVDA',wallOnly,'Put wall'],['COIN',rangeOnly,'20-day low']]){
  const cell=signals.signalCell('support',sig,{ticker});
  assert.equal(cell.querySelector('.watch-support-kind').textContent,kind);
  assert.match(cell.querySelector('.watch-support-gap').textContent,/% below/);
  assert.equal(cell.querySelector('.watch-range-label').textContent,'20-day closing range');
  assert.ok(cell.querySelector('.watch-support-reference > .watch-metric-value'));
 }
 const nvda=signals.signalCell('support',wallOnly),coin=signals.signalCell('support',rangeOnly);
 assert.match(nvda.textContent,/\$225/);assert.match(nvda.textContent,/Range unavailable/);
 assert.equal(nvda.querySelector('.watch-range').dataset.rangeStatus,'missing');
 assert.equal(nvda.querySelector('.watch-range-track'),null);
 assert.equal(nvda.querySelector('.watch-range-dot'),null);
 assert.equal(coin.querySelector('.watch-range').dataset.rangeStatus,'ready');
 assert.match(coin.querySelector('.watch-range-ends').textContent,/\$146\.23.*\$192\.70/);
 assert.equal(coin.querySelector('.watch-range-dot').style.left,'82.5%');
 assert.equal(rangeOnly.walls.status,'none');
 assert.match(signals.signalCard('support',wallOnly,'NVDA').textContent,/Range unavailable/);
 for(const band of [{low:100},{low:100,high:100},{low:120,high:100},{low:NaN,high:120}]){
  const sig={support:{...wallOnly.support,...band}};
  assert.equal(signals.signalCell('support',sig).querySelector('.watch-range-track'),null);
 }
 const noPrice={support:{...rangeOnly.support,price:null,refs:[{key:'range_low',value:146.23,gap:null}]}};
 const unknown=signals.signalCell('support',noPrice);
 assert.equal(unknown.querySelector('.watch-support-gap').textContent,'Distance unavailable');
 assert.ok(unknown.querySelector('.watch-range-track'));assert.equal(unknown.querySelector('.watch-range-dot'),null);
});

test('a signal opened without native pointer focus restores the clicked cell after closing',()=>{
 const previous=document.createElement('button');document.body.append(previous);previous.focus();
 const cell=signals.signalCell('support',signals.briefSignals(briefs.items[0]),{ticker:'NVDA'});document.body.append(cell);
 // Programmatic click, like a Safari pointer click, does not first give the button native focus.
 cell.click();assert.ok(document.querySelector('.modal-box'));closeModal();
 assert.equal(document.activeElement,cell);cell.remove();previous.remove();
});

test('signal sorting ranks recorded values, keeps unknown stocks last and never fetches',()=>{
 const all=signals.buildSignals(briefs,funds,['NVDA','AAPL','TSLA']);
 const rows=[{ticker:'TSLA'},{ticker:'AAPL'},{ticker:'NVDA'}];
 assert.deepEqual(sortRows([...rows],'insider','desc',{signals:all}).map(r=>r.ticker),['NVDA','AAPL','TSLA']);
 assert.deepEqual(sortRows([...rows],'insider','asc',{signals:all}).map(r=>r.ticker),['AAPL','NVDA','TSLA']);
 assert.deepEqual(sortRows([...rows],'funds','desc',{signals:all}).map(r=>r.ticker),['NVDA','AAPL','TSLA']);
 assert.equal(signals.signalSortValue(all.get('TSLA'),'walls'),null);
 assert.ok(signals.signalSortValue(all.get('NVDA'),'walls')>8);
});

test('the watchlist table adds four sortable signal columns from two shared reads and explains their basis',async()=>{
 store.bumpEpoch();store.set('me',{user_id:12,tier:'pro',access:{billing_enabled:false},watch_cap:50});store.set('token','synthetic-only');store.set('watchlist',['NVDA','AAPL','TSLA']);
 const root=document.querySelector('main');root.replaceChildren();const calls=[];
 globalThis.fetch=async url=>{calls.push(url);
  if(url==='/briefing/stocks?fields=signals')return Response.json(briefs);
  // The archived filing is the same record the brief cites; the list reads it from the archive first.
  if(url.startsWith('/radar/archive.json?kind=insider'))return Response.json({items:[{id:'sec:jane',kind:'insider',ticker:'NVDA',ts:'2026-09-02T21:00:00Z',
    source_url:'https://www.sec.gov/Archives/edgar/data/1/jane.xml',extra:{facts:{owners:[{name:'Jane Doe',role:'Director'}],transactions:[{date:'2026-09-01',price:200,shares:5000},{date:'2026-09-01',price:210,shares:1000}],form:'4'}}}],next_cursor:null});
  if(url.startsWith('/radar/archive.json'))return Response.json(funds);
  if(url==='/me/stock-research')return Response.json({items:[],watchlist_count:3});
  return Response.json({items:['NVDA','AAPL','TSLA'],cap:50,overview:{items:[{ticker:'NVDA',company:'NVIDIA',price:218.29,market_cap:5e12},{ticker:'AAPL',company:'Apple',price:332,market_cap:4.8e12},{ticker:'TSLA',company:'Tesla',price:365,market_cap:1.4e12}]}});};
 const dispose=await watch.mount(root);await pause();
 assert.ok(calls.includes('/briefing/stocks?fields=signals'));
 // Both archive pages are asked for exactly the watched stocks in the compact projection, never a market-wide newest page.
 const archiveCalls=calls.filter(u=>u.startsWith('/radar/archive.json'));
 assert.equal(archiveCalls[0],'/radar/archive.json?kind=13f&limit=200&content=all&fields=signals&tickers=NVDA,AAPL,TSLA');
 assert.match(archiveCalls[1],/^\/radar\/archive\.json\?kind=insider&limit=200&content=all&fields=signals&start=\d{4}-\d{2}-\d{2}&tickers=NVDA,AAPL,TSLA$/);
 assert.equal(archiveCalls.length,2);
 const first=root.querySelector('tbody tr');
 assert.equal(first.querySelectorAll('.watch-signal').length,4);
 assert.deepEqual([...root.querySelectorAll('thead .watch-signal-col .watch-sort-label')].map(n=>n.textContent),['Insider activity','Large fund activity','Option walls','Support refs']);
 assert.equal(root.querySelectorAll('thead .watch-signal-col .watch-signal-help').length,4);
 root.querySelector('thead [data-signal=funds] .watch-signal-help').click();
 assert.match(document.querySelector('.modal-body').textContent,/quarter-end snapshot/);assert.match(document.querySelector('.modal-body').textContent,/since 2026-08-13/);closeModal();
 first.querySelector('button.watch-signal[data-metric=insider]').click();
 const card=document.querySelector('.modal-body .watch-signal-card');assert.ok(card);
 assert.match(card.textContent,/Jane Doe/);assert.match(card.textContent,/5K sh × \$200\.00/);assert.match(card.textContent,/Avg \$201\.67/);
 assert.ok([...card.querySelectorAll('a')].some(a=>a.getAttribute('href')==='#/boards?board=insider&ticker=NVDA'));assert.ok(card.querySelector('a[href="#/evidence/NVDA"]'));closeModal();
 assert.equal(root.querySelectorAll('button a, a button').length,0);
 root.querySelector('[data-sort=insider]').click();
 assert.deepEqual([...root.querySelectorAll('tbody tr')].map(n=>n.dataset.readingAnchor),['NVDA','AAPL','TSLA']);
 assert.equal(root.querySelector('[data-sort=insider]').parentElement.getAttribute('aria-sort'),'descending');
 assert.match(root.querySelector('.watch-signal-method').textContent,/13F reports quarter-end holdings/);
 assert.equal(root.querySelector('.watch-signal-method').textContent.includes('since 2026-08-13'),true);
 dispose();
});

test('13F pages drop option lines, count one amended report once, withhold implausible marks and only claim none when complete',()=>{
 const doc={items:[
  {id:'13f:acc-a:1',kind:'13f',ticker:'NVDA',reporter_name:'Fund A',ts:'2026-08-14T00:00:00Z',direction:1,extra:{facts:{accession:'acc-a',position_change:'increased',report_period:'2026-06-30',new_shares:1000,new_value:120000,quarter_price_range:{low:100,high:130}}}},
  {id:'13f:acc-a0:1',kind:'13f',ticker:'NVDA',reporter_name:'Fund A',ts:'2026-08-13T00:00:00Z',direction:1,extra:{facts:{accession:'acc-a0',position_change:'increased',report_period:'2026-06-30',new_shares:900}}},
  {id:'13f:acc-b:1',kind:'13f',ticker:'NVDA',reporter_name:'Fund B',ts:'2026-08-12T00:00:00Z',direction:1,extra:{facts:{accession:'acc-b',position_change:'new',report_period:'2026-06-30',new_shares:1000,new_value:120,quarter_price_range:{low:100,high:130}}}},
  {id:'13f:acc-c:1|Call',kind:'13f',ticker:'NVDA',reporter_name:'Fund C',ts:'2026-08-12T00:00:00Z',direction:1,extra:{facts:{accession:'acc-c',put_call:'Call',position_change:'new',report_period:'2026-06-30'}}}],
  next_cursor:null};
 const archive=signals.fundSignals(doc);
 const adds=archive.byTicker.get('NVDA').adds;
 assert.deepEqual(adds.map(a=>a.fund),['Fund A','Fund B']);           // amendment counted once, option line ignored
 assert.equal(adds[0].quarterEnd,120);assert.equal(adds[1].quarterEnd,null); // $0.12 against a $100–130 quarter is a unit error
 assert.equal(archive.filings,2);assert.equal(archive.complete,true);
 const truncated=signals.fundSignals({...doc,next_cursor:'more'});assert.equal(truncated.complete,false);
 const all=signals.buildSignals(briefs,{...doc,next_cursor:'more'},['NVDA','AAPL']);
 assert.match(signals.signalCell('funds',all.get('AAPL')).textContent,/Not in the latest 3 13F records/);
 assert.match(signals.signalCell('funds',signals.buildSignals(briefs,doc,['AAPL']).get('AAPL')).textContent,/No adds or trims in tracked funds/);
 const partial=signals.buildSignals(briefs,{...doc,partial:true},['AAPL']);
 assert.equal(partial.get('AAPL').funds.status,'missing');
});

test('the insider column reads archived Form 4 records: none on a complete page, brief facts only as a fallback',()=>{
 const now=Date.parse('2026-09-12T00:00:00Z'),recent='2026-09-02T21:00:00Z',old='2025-06-01T00:00:00Z';
 const archive={items:[
  {id:'sec:1',kind:'insider',ticker:'NVDA',ts:recent,published_at:recent,source_url:'https://www.sec.gov/Archives/edgar/data/1/a.xml',
   extra:{facts:{owners:[{name:'Jane Doe',role:'Director',title:''}],transactions:[{date:'2026-09-01',price:200,shares:5000},{date:'2026-09-01',price:210,shares:1000}],total_value:1210000,form:'4'}}},
  {id:'sec:2',kind:'insider',ticker:'NVDA',ts:recent,published_at:recent,extra:{facts:{date_review_required:true,owners:[{name:'Flagged'}],transactions:[{price:1,shares:1}]}}},
  {id:'sec:3',kind:'insider',ticker:'TSLA',ts:old,published_at:old,extra:{facts:{owners:[{name:'Old Buyer'}],transactions:[{price:100,shares:100}]}}}],next_cursor:null};
 const filings=signals.insiderSignals(archive,{now});
 assert.equal(filings.complete,true);assert.deepEqual([...filings.byTicker.keys()],['NVDA']);   // flagged and year-old records do not count
 const all=signals.buildSignals(briefs,funds,['NVDA','AAPL','TSLA'],archive);
 const nvda=all.get('NVDA').insider;
 assert.equal(nvda.status,'ready');assert.equal(nvda.source,'archive');assert.equal(nvda.count,1);assert.equal(Math.round(nvda.average*100)/100,201.67);
 assert.equal(nvda.filings[0].owners[0].role,'Director');assert.equal(nvda.filings[0].url,'https://www.sec.gov/Archives/edgar/data/1/a.xml');
 // AAPL and TSLA have a complete page with no purchases: that is "none", even though TSLA's brief is pending.
 assert.equal(all.get('AAPL').insider.status,'none');assert.equal(all.get('TSLA').insider.status,'none');
 assert.match(signals.signalCell('insider',all.get('TSLA')).textContent,/No open-market Form 4 trades in 12 months/);
 // A truncated page can only say "unknown" for stocks it does not list.
 assert.equal(signals.buildSignals(briefs,funds,['MSFT'],{...archive,next_cursor:'more'}).get('MSFT').insider.status,'missing');
 // Without the archive the brief's own copy of the filings still answers.
 const fallback=signals.buildSignals(briefs,funds,['NVDA','AAPL'],null);
 assert.equal(fallback.get('NVDA').insider.source,'brief');assert.equal(fallback.get('NVDA').insider.count,1);assert.equal(fallback.get('AAPL').insider.status,'none');
 // Dated brief facts (the brief text is pending) still feed the option-wall and support columns.
 const dated=signals.buildSignals({items:[{...briefs.items[0],status:'source_changed',facts_status:'dated',facts_as_of:'2026-09-11T12:00:00Z'}]},funds,['NVDA'],archive);
 assert.equal(dated.get('NVDA').walls.status,'ready');assert.equal(dated.get('NVDA').walls.dated,true);assert.equal(dated.meta.as_of,'2026-09-11');
});

test('open-market sales and trimmed positions stay apart from purchases and adds, newest first, and read red',()=>{
 const now=Date.parse('2026-09-21T00:00:00Z');
 const archive={items:[
  {id:'sec:buy',kind:'insider',ticker:'NVDA',ts:'2026-09-02T00:00:00Z',direction:1,source_url:'https://www.sec.gov/Archives/edgar/data/1/buy.xml',
   extra:{facts:{owners:[{name:'Jane Doe',role:'Director'}],transactions:[{date:'2026-09-01',price:200,shares:5000}]}}},
  {id:'sec:sell',kind:'insider',ticker:'NVDA',ts:'2026-09-17T00:00:00Z',direction:-1,source_url:'https://www.sec.gov/Archives/edgar/data/1/sell.xml',
   extra:{facts:{owners:[{name:'Chen Wei',role:'Officer',title:'Chief Financial Officer'},{name:'Chen Trust'}],transactions:[{date:'2026-09-16',price:210,shares:15000}]}}},
  {id:'sec:old-sell',kind:'insider',ticker:'AAPL',ts:'2026-08-20T00:00:00Z',direction:-1,extra:{facts:{owners:[{name:'Only Seller'}],transactions:[{date:'2026-08-19',price:300,shares:1000}]}}}],next_cursor:null};
 const filings=signals.insiderSignals(archive,{now});
 assert.deepEqual(filings.byTicker.get('NVDA').map(f=>f.side),['buy','sell']);
 const all=signals.buildSignals(briefs,funds,['NVDA','AAPL'],archive);
 const nvda=all.get('NVDA').insider;
 assert.equal(nvda.side,'both');assert.equal(nvda.buys,1);assert.equal(nvda.sells,1);
 assert.equal(nvda.bought,1000000);assert.equal(nvda.sold,3150000);assert.equal(nvda.value,4150000);assert.equal(nvda.average,200);
 assert.deepEqual(nvda.filings.map(f=>f.date),['2026-09-17','2026-09-02']);           // newest first, the sale leads
 const cell=signals.signalCell('insider',all.get('NVDA'),{ticker:'NVDA'});
 const net=cell.querySelector('.watch-signal-net');
 assert.equal(net.textContent,'Net selling −$2.2M');assert.ok(net.classList.contains('is-sell'));   // one pill says which way the window leans
 assert.equal(cell.querySelector('.watch-balance-buy').style.width,'24%');assert.equal(cell.querySelector('.watch-balance-sell').style.width,'76%');
 assert.equal(cell.querySelector('.watch-signal-mix').textContent,'1 buy · 1 sale');
 const lines=[...cell.querySelectorAll('.watch-signal-event')];
 assert.equal(lines.length,1);assert.equal(lines[0].textContent,'Latest 09/17 · Chen Wei +1 sold $3.2M');assert.ok(lines[0].classList.contains('is-sell'));
 const onlySold=signals.signalCell('insider',all.get('AAPL'),{ticker:'AAPL'});
 assert.equal(onlySold.querySelector('.watch-signal-net').textContent,'Selling $300K');assert.ok(onlySold.querySelector('.watch-signal-net').classList.contains('is-sell'));
 assert.equal(onlySold.querySelector('.watch-balance-buy').style.width,'0%');
 assert.equal(all.get('AAPL').insider.side,'sell');assert.equal(all.get('AAPL').insider.average,null);
 const card=signals.signalCard('insider',all.get('NVDA'),'NVDA');
 assert.match(card.textContent,/Net selling −\$2\.2M.*Bought \$1M · Avg \$200\.00 · 5K sh · Sold \$3\.2M/);
 assert.equal(card.querySelectorAll('.watch-signal-item.is-sell').length,1);assert.match(card.textContent,/Chief Financial Officer/);
 assert.match(card.textContent,/code S open-market sales/);
 // 13F: decreases and exits are trims, unchanged positions are not moves, the newest period leads.
 const doc={items:[
  {id:'13f:a',kind:'13f',ticker:'NVDA',reporter_name:'Fund A',ts:'2026-08-14T00:00:00Z',direction:1,extra:{facts:{accession:'a',position_change:'increased',report_period:'2026-06-30',prior_shares:1000000,new_shares:1500000}}},
  {id:'13f:b',kind:'13f',ticker:'NVDA',reporter_name:'Fund B',ts:'2026-08-15T00:00:00Z',direction:-1,extra:{facts:{accession:'b',position_change:'decreased',report_period:'2026-06-30',prior_shares:800000,new_shares:500000}}},
  {id:'13f:c',kind:'13f',ticker:'NVDA',reporter_name:'Fund C',ts:'2026-08-12T00:00:00Z',direction:0,extra:{facts:{accession:'c',position_change:'held',report_period:'2026-06-30',prior_shares:10,new_shares:10}}},
  {id:'13f:d',kind:'13f',ticker:'AAPL',reporter_name:'Fund D',ts:'2026-05-14T00:00:00Z',direction:-1,extra:{facts:{accession:'d',position_change:'closed',report_period:'2026-03-31',prior_shares:900,new_shares:0}}}],next_cursor:null};
 const moves=signals.fundSignals(doc);
 assert.deepEqual(moves.byTicker.get('NVDA').moves.map(m=>m.fund+':'+m.side),['Fund B:trim','Fund A:add']);
 assert.equal(moves.byTicker.get('NVDA').side,'both');assert.equal(moves.byTicker.get('AAPL').side,'trim');
 const withMoves=signals.buildSignals(briefs,doc,['NVDA','AAPL'],archive);
 const fundCell=signals.signalCell('funds',withMoves.get('NVDA'),{ticker:'NVDA'});
 assert.equal(fundCell.querySelector('.watch-signal-net').textContent,'1 fund added · 1 fund trimmed');assert.ok(fundCell.querySelector('.watch-signal-net').classList.contains('is-mixed'));
 assert.equal(fundCell.querySelector('.watch-balance-buy').style.width,'50%');
 assert.equal(fundCell.querySelector('.watch-signal-fund').textContent,'Fund B trimmed · 2026 Q2');assert.ok(fundCell.querySelector('.watch-signal-fund').classList.contains('is-trim'));
 const trimmedOnly=signals.signalCell('funds',withMoves.get('AAPL'),{ticker:'AAPL'});
 assert.equal(trimmedOnly.querySelector('.watch-signal-net').textContent,'1 fund trimmed');assert.ok(trimmedOnly.querySelector('.watch-signal-net').classList.contains('is-sell'));
 assert.equal(signals.signalSortValue(withMoves.get('NVDA'),'funds'),2);
 assert.match(signals.signalCard('funds',withMoves.get('AAPL'),'AAPL').textContent,/Position closed/);
 assert.match(signals.signalCard('funds',withMoves.get('NVDA'),'NVDA').textContent,/Shares 800K → 500K/);
 assert.doesNotMatch(cell.textContent+fundCell.textContent,/target|guarantee|floor|buy now/i);
});
