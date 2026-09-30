import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="en" data-lang="en"><body class="page-app"></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {numericChangeClass,numericChangeText,numericChange,changeParts}=await import('../public/js/app/numeric-change.js');
const {discoveryStockRow}=await import('../public/js/app/explore-discovery.js');
const {starterCards}=await import('../public/js/app/research-examples.js');
const {watchlistStarters}=await import('../public/js/app/watchlist-first-use.js');
const {metricCell}=await import('../public/js/app/watchlist-metrics.js');
const {eventResearchSession}=await import('../public/js/app/calendar-event.js');
const {earningsPanel}=await import('../public/js/app/calendar-earnings.js');
const {renderSeasonality}=await import('../public/js/app/seasonality.js');
const {priceChart}=await import('../public/js/app/views/creator-page.js');
const store=await import('../public/js/app/store.js');
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
function tone(node,expected){assert.ok(node.classList.contains('numeric-change'));assert.equal(node.classList.contains('pos'),expected==='pos');assert.equal(node.classList.contains('neg'),expected==='neg');}

test('only finite numerical changes receive direction; zero and unavailable values stay neutral',()=>{
 for(const value of [0,-0,null,undefined,NaN,Infinity,-Infinity,'3',true,{},[]])assert.equal(numericChangeClass(value),'numeric-change');
 assert.equal(numericChangeText(null),'—');assert.equal(numericChangeText('5'),'—');assert.equal(numericChangeText(-0),'0.0%');
 assert.equal(numericChangeText(.003,{digits:0}),'+0.003%');assert.equal(numericChangeText(-.003,{digits:0}),'-0.003%');assert.equal(numericChangeText(.00000001),'+0.00000001%');
 assert.equal(numericChangeText(2,{unit:' pp'}),'+2.0 pp');tone(numericChange(2),'pos');tone(numericChange(-2),'neg');
 const host=document.createElement('p');host.append(...changeParts('company.peer_return',{ticker:'NVDA'},{value:-2}));assert.equal(host.textContent,'NVDA: -2.0%');tone(host.querySelector('span'),'neg');
});
test('Explore and Today use attention changes only, retaining raw counts, research routes and no sentiment inference',()=>{
 for(const value of [120,-30,0,null]){
  const row={ticker:'NVDA',rank:1,mentions:50,attentionChange:value,company:'NVIDIA'};
  const explore=discoveryStockRow(row),today=starterCards({items:[{...row,change_pct:value}]})[0];
  const expected=value>0?'pos':value<0?'neg':'';
  tone(explore.querySelector('.explore-mention-change'),expected);tone(today.querySelector('.research-example-change'),expected);
  assert.equal(explore.querySelector('.explore-mention-count').textContent,'50');assert.equal(explore.querySelector('.explore-mention-count').classList.contains('numeric-change'),false);
  assert.equal(explore.querySelector('.ticker-symbol').classList.contains('pos'),false);assert.match(today.querySelector('a').href,/#\/stock\/NVDA\?from=today/);
 }
});
test('empty Watchlist exposes the same signed change in compact and full layouts without writes',async()=>{
 store.bumpEpoch();store.set('me',{user_id:111,tier:'pro'});const calls=[];
 globalThis.fetch=async(url,options={})=>{calls.push({url,method:options.method||'GET'});return Response.json({status:'ready',items:[{ticker:'NVDA',rank:1,mentions:50,change_pct:-25}]});};
 const starter=watchlistStarters();document.body.append(starter.node);await tick();
 try{const values=starter.node.querySelectorAll('.watch-starter-count .numeric-change');assert.equal(values.length,2);values.forEach(node=>tone(node,'neg'));assert.ok(starter.node.querySelector('.watch-starter-count-compact').textContent.includes('-25%'));assert.ok(calls.every(call=>call.method==='GET'));}
 finally{starter.dispose();starter.node.remove();store.bumpEpoch();}
});
test('retained and stale numeric metrics retain dates and status while sign does not imply freshness',()=>{
 for(const status of ['ready','retained','stale','expired']){const cell=metricCell('ytd',{status,value:-3,as_of:'2026-09-25'});tone(cell.querySelector('.watch-metric-value'),'neg');if(status!=='ready')assert.match(cell.textContent,/2026-09-25/);}
 tone(metricCell('relative',{status:'ready',value:0}).querySelector('.watch-metric-value'),'');
 assert.equal(metricCell('attention',{status:'ready',value:30}).querySelector('.watch-metric-value').classList.contains('numeric-change'),false);
});
test('Calendar event summary independently colors median, excess, range and benchmark; zero is not a gain',async()=>{
 store.bumpEpoch();store.set('me',{user_id:222,tier:'pro'});
 const sample={date:'2026-09-20',reaction_session:'2026-09-21',source:'https://example.com/source',windows:{'5':{status:'ok',return_pct:0,benchmark_pct:-2,start:'2026-09-21',end:'2026-09-25'}}};
 globalThis.fetch=async()=>Response.json({selected:'NVDA',relations:[],history:{price_as_of:'2026-09-25',summary:{'5':{n:1,median_pct:0,median_excess_pp:2,min_pct:-5,max_pct:7,up:0,flat:1,down:0}},samples:[sample]}});
 const session=eventResearchSession('NVDA'),root=session.mount({type:'macro',title:'CPI',date:'2026-09-29'});document.body.append(root);await tick();
 try{const stats=[...root.querySelectorAll('.event-stats .numeric-change')];assert.equal(stats.length,4);['','pos','neg','pos'].forEach((expected,i)=>tone(stats[i],expected));assert.ok(stats[1].textContent.startsWith('+2.0'));const returns=root.querySelectorAll('.event-sample-table tbody .numeric-change');tone(returns[0],'');tone(returns[1],'neg');assert.match(root.querySelector('.event-past-card').textContent,/NVDA · 5 sessions 0.0% · SPY -2.0%/);}
 finally{session.dispose();root.remove();store.bumpEpoch();}
});
test('earnings surprise and valid benchmark gains are green; pending returns remain neutral even with a numeric payload',()=>{
 const root=earningsPanel({previous_release:{release_date:'2026-09-20',period_end:'2026-06-30',comparisons:[{metric:'eps',actual:2,estimate:1,surprise_pct:100},{metric:'revenue',actual:3,estimate:3,surprise_pct:0}]},reaction:{sample:{windows:{'1':{status:'ok',return_pct:-2,benchmark_pct:1},'5':{status:'immature',return_pct:9},'20':{status:'ok',return_pct:null,benchmark_pct:null}}}}});
 const surprises=root.querySelectorAll('.earnings-comparison .numeric-change');tone(surprises[0],'pos');tone(surprises[1],'');
 const changes=root.querySelectorAll('.earnings-reaction .numeric-change');['neg','pos','','',''].forEach((expected,i)=>tone(changes[i],expected));assert.equal(changes[2].textContent,'—');
});
test('a zero-return seasonality sample remains neutral in both mean and each year',()=>{
 const root=document.createElement('section');renderSeasonality(root,{as_of:'2026-08-31',rows:[{year:2025,month:8,SPY:{return_pct:0},QQQ:{return_pct:0}}]},8);
 const changes=root.querySelectorAll('.numeric-change');assert.equal(root.querySelectorAll('.season-comparison strong.numeric-change,.season-year>.numeric-change').length,4);changes.forEach(node=>tone(node,''));assert.match(root.textContent,/Unchanged 0.0%/);
});
test('creator chart inspection colors each actual return independently and preserves selected date',()=>{
 const chart=priceChart({ticker:'NVDA',ret:2,spy_ret:0,path:[{d:'2026-09-24',stock:-1,spy:3},{d:'2026-09-25',stock:2,spy:0}]});
 const readout=chart.querySelector('.creator-chart-readout');tone(readout.querySelectorAll('.numeric-change')[0],'pos');tone(readout.querySelectorAll('.numeric-change')[1],'');assert.match(readout.textContent,/2026-09-25/);
 const slider=chart.querySelector('input');slider.value=0;slider.dispatchEvent(new window.Event('input'));tone(readout.querySelectorAll('.numeric-change')[0],'neg');tone(readout.querySelectorAll('.numeric-change')[1],'pos');assert.match(readout.textContent,/2026-09-24/);
});

test('macro comparison values are signed without coloring yield levels, scores or free-form text',async()=>{
 const {renderMacroBeta}=await import('../public/js/app/macro-beta.js');
 const row={date:'2026-09-25',beta_score:50,funding_score:50,rates_score:50,qqq_index:100,spy_index:100,annotation:'mixed',metrics:{nominal_10y:5,vix:20,broad_usd_20d_change_pct:-2,net_liquidity_65d_change_bn:0}};
 const run={start:'2025-01-01',end:'2025-12-31',metrics:{nav:{return_pct:-5,max_drawdown_pct:-10}},losing_years:['2025'],years:{'2025':{return_pct:-5}},completed_positions:2,open_positions:0};
 const root=renderMacroBeta({status:'ok',as_of:row.date,observed_at:'2026-09-25T20:00:00Z',latest:row,history:[row],validation:{baseline_reproduced:true,results:{'10':{baseline:{evaluation:run},macro_gate:{evaluation:run}}}}});
 const metrics=[...root.querySelectorAll('.macro-metrics .numeric-change')];assert.equal(metrics.length,2);tone(metrics[0],'neg');tone(metrics[1],'');
 assert.equal(root.querySelector('.macro-scores .numeric-change'),null);assert.equal(root.querySelectorAll('.macro-losses .numeric-change').length,2);assert.match(root.querySelector('.macro-losses').textContent,/-5.0%/);assert.doesNotMatch(root.textContent,/\[object|undefined/);
});
