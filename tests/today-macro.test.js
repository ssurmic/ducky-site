import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const macro=await import('../public/js/app/today-macro.js');

const doc={schema:'macro-beta/1',status:'ok',as_of:'2026-09-18',observed_at:'2026-09-19T12:00:00Z',history:[{}],
 latest:{date:'2026-09-18',regime:'mixed',funding_score:54.4,metrics:{net_liquidity_bn:5850,net_liquidity_65d_change_bn:-120,nominal_10y:4.12,nominal_10y_20d_change_bp:9.2,vix:17.6,vix_3m:19.1,vix_term_ratio:0.9215}},
 fear_greed:{score:27,rating:'fear',previous_close:31}};

test('the four macro tiles read the saved backdrop with their own dates and tones',()=>{
 const tiles=macro.macroTiles(doc);
 assert.deepEqual(tiles.map(t=>[t.key,t.value,t.tone]),[['liquidity','54','mid'],['yield','4.12%','flat'],['vix','17.6','up'],['fng','27','down']]);
 assert.equal(tiles[0].note,'mixed · net liquidity $5.85T · -120B vs 65 sessions ago');
 assert.equal(tiles[1].note,'+9 bp over 20 sessions');
 assert.equal(tiles[2].note,'VIX / VIX3M 0.92 · below 1, front month cheaper');
 assert.equal(tiles[3].note,'Fear · prev 31');
 const strip=macro.macroStrip(doc);
 assert.equal(strip.querySelectorAll('.today-macro-tile').length,4);
 assert.match(strip.querySelector('.today-macro-source').textContent,/through 2026-09-18/);
 assert.doesNotMatch(strip.textContent,/target|guarantee|floor|buy now/i);
});

test('stress, stale and missing readings are stated, never invented',()=>{
 const stressed={...doc,status:'stale',latest:{...doc.latest,regime:'adverse',funding_score:31,metrics:{...doc.latest.metrics,vix:32,vix_3m:28,vix_term_ratio:1.1429}},fear_greed:null};
 const tiles=macro.macroTiles(stressed);
 assert.equal(tiles[0].tone,'down');assert.match(tiles[0].note,/^tight/);assert.equal(tiles[2].tone,'down');assert.match(tiles[2].note,/above 1, front month dearer/);
 assert.equal(tiles[3].value,'—');assert.equal(tiles[3].note,'index unavailable');
 assert.match(macro.macroStrip(stressed).querySelector('.today-macro-source').textContent,/Over 36 hours old/);
 assert.match(macro.macroStrip({status:'unavailable',history:[]}).textContent,/Market backdrop unavailable/);
 const empty=macro.macroTiles({latest:{metrics:{}}});
 assert.deepEqual(empty.map(t=>t.value),['—','—','—','—']);assert.equal(empty[0].note,'no reading');
});

test('the liquidity tile is coloured by its own score band and explains the formula behind a "?"',()=>{
 // 54 is mixed (amber), 62 loose (green), 31 tight (red): the word, the colour and the number agree.
 assert.deepEqual([54.4,62,31,null].map(macro.fundingBand),['mixed','supportive','adverse','unknown']);
 const loose=macro.macroTiles({...doc,latest:{...doc.latest,regime:'mixed',funding_score:62.5,beta_score:56.94}})[0];
 assert.equal(loose.tone,'up');assert.match(loose.note,/^loose/);
 const strip=macro.macroStrip(doc),help=strip.querySelector('[data-tile=liquidity] .today-macro-help');
 assert.ok(help);assert.equal(help.textContent,'?');
 help.click();
 const text=document.getElementById('modal').textContent;
 for(const phrase of ['SOFR minus IORB','2.5 points','Standing repo','Net liquidity','60 and above','60% this score'])assert.ok(text.includes(phrase),phrase);
 assert.doesNotMatch(text,/target|guarantee|floor|buy now/i);
 document.getElementById('modal').replaceChildren();
});

test('the Fear & Greed and liquidity tiles are half-dials in the provider bands, with the earlier readings listed',async()=>{
 const {gauge,angle,bandFor}=await import('../public/js/app/today-gauge.js');
 const withHistory={...doc,fear_greed:{score:34,rating:'fear',previous_close:29.11,previous_1_week:31,previous_1_month:54.66,previous_1_year:66.23}};
 const strip=macro.macroStrip(withHistory),fng=strip.querySelector('[data-tile=fng]'),liq=strip.querySelector('[data-tile=liquidity]');
 // Five CNN bands, the "fear" one lit, the needle at 34 (0 is the left end, 100 the right), the number inside.
 const bands=[...fng.querySelectorAll('.today-gauge-band')];
 assert.equal(bands.length,5);assert.deepEqual(bands.map(b=>b.classList.contains('is-active')),[false,true,false,false,false]);
 assert.equal(fng.querySelector('.today-gauge-value').textContent,'34');assert.equal(fng.querySelector('.today-gauge-word').textContent,'Fear');
 assert.equal(angle(34),180-34*1.8);assert.equal(fng.querySelector('.today-gauge').getAttribute('aria-label'),'Fear & Greed gauge, 34 of 100, Fear');
 assert.deepEqual([...fng.querySelectorAll('.today-macro-history li')].map(li=>li.textContent),['Previous closeFear29','1 week agoFear31','1 month agoNeutral55','1 year agoGreed66']);
 assert.deepEqual([...fng.querySelectorAll('.today-macro-history-value')].map(n=>n.className.replace('today-macro-history-value mono ','')),['is-sell','is-sell','is-flat','is-up']);
 // Three liquidity bands (tight / mixed / loose) from the same 40 and 60 cut-offs as the tile colour.
 const liqBands=[...liq.querySelectorAll('.today-gauge-band')];
 assert.deepEqual(liqBands.map(b=>b.getAttribute('class').replace('today-gauge-band ','')),['is-down','is-mid is-active','is-up']);
 assert.equal(liq.querySelector('.today-gauge-word').textContent,'mixed');assert.equal(liq.querySelector('.today-macro-history'),null);
 // No reading, no dial: the plain dash stays.
 const empty=macro.macroStrip({...doc,fear_greed:null});
 assert.equal(empty.querySelector('[data-tile=fng] .today-gauge'),null);assert.equal(empty.querySelector('[data-tile=fng] .today-macro-value').textContent,'—');
 assert.equal(bandFor(macro.FNG_BANDS(),100).label,'Extreme greed');assert.equal(bandFor(macro.FNG_BANDS(),null),null);
 assert.deepEqual(gauge({name:'x',score:null,bands:macro.LIQUIDITY_BANDS()}).querySelectorAll('.today-gauge-needle').length,0);
 const zhCopy=JSON.parse(readFileSync('i18n/zh.json'));
 for(const key of ['app.today.gauge_label','app.today.fng_prev_close','app.today.fng_week','app.today.fng_month','app.today.fng_year'])assert.ok(zhCopy[key],key);
});

test('both chart tiles draw a two-week three-line chart with markers; the 10-year tile reads in bp',async()=>{
  const spark=await import('../public/js/app/today-spark.js');
  assert.equal(spark.pearson([1,2,3,4],[2,4,6,8]),1);assert.equal(spark.pearson([1,2,3,4],[8,6,4,2]),-1);assert.equal(spark.pearson([1,2],[1,2]),null);assert.equal(spark.pearson([1,1,1],[1,2,3]),null);
  const history=[];let q=100,sp=100,net=5800,y=4.1;
  for(let i=0;i<70;i++){const up=i%2?1:-1;net+=up*30;q*=1-up*0.01;sp*=1-up*0.006;y+=up*0.05;history.push({date:'2026-0'+(1+Math.floor(i/28))+'-'+String(1+i%28).padStart(2,'0'),funding_score:55+up*8,nominal_10y:Math.round(y*100)/100,net_liquidity_bn:net,qqq_index:q,spy_index:sp});}
  const lines=spark.normalizedLines(history,{primary:'yield'});
  assert.equal(lines.dates.length,10);assert.deepEqual(lines.series.map(x=>x.key),['yield','qqq','spy']);
  assert.equal(Math.abs(lines.series[0].change[1]),5);   // bp
  const tiles=macro.macroTiles({...doc,observed:history});
  assert.equal(tiles[0].lines.primary,'liquidity');assert.equal(tiles[1].lines.primary,'yield');
  assert.equal(tiles[0].lines.dates.length,10);assert.equal(tiles[0].lines.qqq.n,10);assert.equal(tiles[1].lines.qqq.correlation,-1);
  const strip=macro.macroStrip({...doc,observed:history});
  assert.equal(strip.querySelectorAll('.today-lines').length,2);
  assert.equal(strip.querySelectorAll('.today-lines-line').length,6);
  assert.equal(strip.querySelectorAll('[data-tile=yield] .today-lines-dot').length,30);   // a marker on every session
  assert.equal(strip.querySelectorAll('[data-tile=yield] .today-spark-axis').length,10);
  assert.match(strip.querySelector('[data-tile=yield] .today-macro-legend').textContent,/[+-]5 bp/);
  assert.match(strip.querySelector('[data-tile=yield] .today-macro-caption').textContent,/10 sessions|10 个交易日/);
  assert.equal(macro.macroTiles(doc)[0].lines,null);assert.equal(macro.macroTiles(doc)[1].lines,null);
});

test('the close-of-day note renders above the tiles when ready, says when it is old, and hides otherwise',()=>{
  const digest={status:'ready',session:'2026-09-23',next_session:'2026-09-24',generated_at:'2026-09-24T05:41:00+00:00',
    close:{zh:'标普500 收跌。',en:'The S&P 500 closed down 0.8%.'},sectors:{zh:'能源领涨。',en:'Energy led.'},macro:{zh:'收益率上行。',en:'Yields rose 15bp.'},tomorrow:{zh:'明天初请。',en:'Jobless claims at 08:30 ET.'}};
  const strip=macro.macroStrip({...doc,digest});
  const note=strip.querySelector('.today-digest');
  assert.ok(note && strip.firstElementChild===note);
  assert.equal(note.querySelectorAll('.today-digest-part').length,3);
  assert.match(note.querySelector('.today-digest-tomorrow').textContent,/Jobless claims at 08:30 ET/);
  assert.match(note.textContent,/not a forecast or advice/);
  assert.doesNotMatch(note.textContent,/Over 40 hours old/);
  assert.match(macro.macroStrip({...doc,digest:{...digest,status:'stale'}}).textContent,/Over 40 hours old/);
  assert.equal(macro.macroStrip({...doc,digest:{status:'unavailable'}}).querySelector('.today-digest'),null);
  assert.equal(macro.macroStrip(doc).querySelector('.today-digest'),null);
});

test('the liquidity tile draws the liquidity index, QQQ and SPY on one chart, each scaled to its own range, with both correlations',async()=>{
  const spark=await import('../public/js/app/today-spark.js');
  const history=[];let q=100,sp=100,net=5800;
  for(let i=0;i<70;i++){const up=i%2?1:-1;net+=up*30;q*=1-up*0.01;sp*=1-up*0.006;history.push({date:'2026-0'+(1+Math.floor(i/28))+'-'+String(1+i%28).padStart(2,'0'),funding_score:55+up*8,nominal_10y:4.5,net_liquidity_bn:net,qqq_index:q,spy_index:sp});}
  const lines=spark.normalizedLines(history);
  assert.equal(lines.dates.length,10);assert.deepEqual(lines.series.map(x=>x.key),['liquidity','qqq','spy']);
  for(const x of lines.series){assert.ok(x.values.every(v=>v>=0&&v<=100));assert.ok(x.values.includes(0)&&x.values.includes(100));}
  const tiles=macro.macroTiles({...doc,observed:history});
  assert.ok(tiles[0].lines&&tiles[0].lines.qqq.correlation===-1&&tiles[0].lines.spy.correlation===-1&&tiles[0].lines.qqq.opposite===100);
  const strip=macro.macroStrip({...doc,observed:history});
  assert.equal(strip.querySelectorAll('.today-lines').length,2);
  assert.equal(strip.querySelectorAll('[data-tile=liquidity] .today-lines-line').length,3);
  assert.match(strip.querySelector('[data-tile=liquidity] .today-macro-caption').textContent,/-1\.00.*-1\.00|100%/);
  assert.equal(macro.macroTiles(doc)[0].lines,null);
});

test('the legend carries each line\'s latest day change and hovering names the three readings at a date',async()=>{
  const spark=await import('../public/js/app/today-spark.js');
  const history=[];let q=100,sp=100,net=5800;
  for(let i=0;i<70;i++){const up=i%2?1:-1;net+=up*30;q*=1-up*0.01;sp*=1-up*0.006;history.push({date:'2026-0'+(1+Math.floor(i/28))+'-'+String(1+i%28).padStart(2,'0'),funding_score:55+up*8,nominal_10y:4.5,net_liquidity_bn:net,qqq_index:q,spy_index:sp});}
  assert.equal(spark.cursorIndex(0,0,10),9);assert.equal(spark.cursorIndex(50,100,61),30);assert.equal(spark.cursorIndex(-9,100,61),0);assert.equal(spark.cursorIndex(999,100,61),60);
  const strip=macro.macroStrip({...doc,observed:history});
  const legend=strip.querySelector('[data-tile=liquidity] .today-macro-legend').textContent;
  assert.match(legend,/(63|47)\.0 \([+-]16\.0\) · net liquidity \$5\.[0-9]{2}T/);assert.match(legend,/QQQ\)\s*[+-]1\.0[0-9]%/);assert.match(legend,/SPY\)\s*[+-]0\.6[0-9]%/);
  const tip=strip.querySelector('.today-lines-tip');assert.ok(tip.hidden);
  strip.querySelector('.today-lines').dispatchEvent(new window.Event('pointermove',{bubbles:true}));
  assert.ok(!tip.hidden);assert.match(tip.textContent,/net liquidity \$5\.[0-9]{2}T/);assert.equal(tip.querySelectorAll('.today-lines-tip-row').length,3);
  strip.querySelector('.today-lines').dispatchEvent(new window.Event('pointerleave'));assert.ok(tip.hidden);
});

test('a tile reads the observed close with its date, the moving print only while the session is open, and the live row as a quote',()=>{
  const observed=[{date:'2026-09-22',nominal_10y:4.96,funding_score:62.5},{date:'2026-09-23',nominal_10y:5.114,funding_score:57.5}];
  const pre=macro.macroTiles({...doc,observed,intraday:{nominal_10y:5.114,quoted_at:'2026-09-24T06:40:19+00:00',session:'2026-09-24',phase:'pre'}})[1];
  assert.equal(pre.value,'5.11%');assert.equal(pre.stamp,'2026-09-23 close');
  const open=macro.macroTiles({...doc,observed,intraday:{nominal_10y:5.2,quoted_at:'2026-09-24T14:35:00+00:00',session:'2026-09-24',phase:'open'}})[1];
  assert.equal(open.value,'5.20%');assert.equal(open.stamp,'quote 10:35 ET');
  const live=macro.macroTiles({...doc,observed_at:'2026-09-24T12:31:00+00:00',observed:[...observed,{date:'2026-09-24',nominal_10y:5.16,live:true}],intraday:{nominal_10y:5.16,session:'2026-09-24',phase:'pre'}})[1];
  assert.equal(live.value,'5.16%');assert.equal(live.stamp,'quote 08:31 ET');
  const old=macro.macroTiles({...doc,intraday:{nominal_10y:5.114,quoted_at:'2026-09-24T06:40:19+00:00'}})[1];   // a document before the observed panel
  assert.equal(old.value,'5.11%');assert.match(old.stamp,/quote 02:40 ET/);
});

test('the chart drops a trailing session it cannot draw and marks a live row with a hollow marker',async()=>{
  const spark=await import('../public/js/app/today-spark.js');
  const rows=[];for(let i=0;i<12;i++)rows.push({date:'2026-09-'+String(1+i).padStart(2,'0'),funding_score:50+(i%3)*5,nominal_10y:4.5+i*.01,qqq_index:100+i,spy_index:100+i/2});
  const lines=spark.normalizedLines([...rows,{date:'2026-09-13',vix:15.2,live:true}],{primary:'liquidity'});
  assert.equal(lines.dates[lines.dates.length-1],'2026-09-12');assert.equal(lines.series[0].change[1],-10);   // 60 → 50 inside the ten-session window
  const withLive=spark.normalizedLines([...rows,{date:'2026-09-13',nominal_10y:4.7,live:true}],{primary:'yield'});
  assert.equal(withLive.dates[withLive.dates.length-1],'2026-09-13');assert.deepEqual(withLive.live.slice(-2),[false,true]);
  const chart=spark.sparkLines(withLive,{});
  assert.equal(chart.querySelectorAll('.today-lines-dot.is-live').length,1);
});

test('the creators block lists macro takes from the last day and a half, newest first, and hides otherwise',async()=>{
  const creators=await import('../public/js/app/today-creators.js');
  const now=Date.parse('2026-09-24T12:00:00Z');
  const post=(id,hours,extra)=>({id,kol_id:'k'+id,kol_name:'Creator '+id,url:'https://www.youtube.com/watch?v=v'+id,title:'Title '+id,published_at:new Date(now-hours*3600e3).toISOString(),tickers:[],take:'neutral',macro:true,summary:JSON.stringify({zh:'摘要 '+id,en:'Summary '+id}),...extra});
  const feed={posts:[post(1,20),post(2,5,{take:'bear',tickers:['NVDA','TSLA']}),post(3,40),post(4,2,{macro:false}),post(5,8,{summary:JSON.stringify({zh:'',en:'',source:{status:'discovered'}})})]};
  assert.deepEqual(creators.macroPosts(feed,{now}).map(p=>p.id),[2,5,1]);
  const block=creators.creatorMacroBlock(feed,{now});
  assert.match(block.querySelector('h2').textContent,/Creators on the macro backdrop/);
  const items=[...block.querySelectorAll('li')];assert.equal(items.length,3);
  assert.match(items[0].textContent,/Creator 2.*03:00 ET.*Bearish/);assert.equal(items[0].querySelector('a').href,'https://www.youtube.com/watch?v=v2');
  assert.equal(items[0].querySelectorAll('.pill').length,2);assert.match(items[1].textContent,/Analysis pending/);
  assert.equal(creators.creatorMacroBlock({posts:[post(6,2,{macro:false})]},{now}),null);
});
