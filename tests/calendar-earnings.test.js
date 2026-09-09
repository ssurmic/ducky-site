import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const {earningsPanel,earningsValue,earningsEstimateBasis}=await import('../public/js/app/calendar-earnings.js');
const {eventResearchSession}=await import('../public/js/app/calendar-event.js');
const store=await import('../public/js/app/store.js');
const tick=()=>new Promise(r=>setTimeout(r,5));

function documentFixture(){return {ticker:'TEST',as_of:'2026-09-06T12:00:00Z',stale:true,
 previous_release:{period_end:'2026-06-30',fiscal_year:2026,fiscal_quarter:2,release_date:'2026-08-10',
 source_url:'https://www.sec.gov/Archives/report.htm',filed_at:'2026-08-10T21:00:00Z',metrics:[
 {metric:'revenue',value:2000000000,unit:'USD',basis:'GAAP',method:'ytd_difference'},
 {metric:'eps',value:1.4,unit:'USD/shares',basis:'GAAP'},
 {metric:'eps',value:1.7,unit:'USD/shares',basis:'non-GAAP'}]},
 next_event:{date:'2026-11-10',eps_estimate:null,revenue_estimate:2200000000,provider:'Finnhub',observed_at:'2026-09-06T12:00:00Z'},
 reaction:{sample:{windows:{'1':{status:'ok',return_pct:-5,benchmark_pct:1},'5':{status:'immature'},'20':{status:'missing_prices'}}}},
 evidence:[{id:'fact',kind:'primary_excerpt',text:'<img src=x onerror=alert(1)> Revenue guidance is conditional.',source_url:'javascript:alert(1)'},
 {id:'revenue-guide',kind:'primary_excerpt',text:'Total revenues are expected to grow in the stated range.',source_url:'https://www.sec.gov/'}],
 explanation:{overview:{en:'Check the conditional guidance.',fact_ids:['fact']},drivers:[],watchpoints:[],risks:[]}};}

test('earnings renders fiscal period, separate bases, missing estimates and losses',()=>{
 const box=earningsPanel(documentFixture());
 assert.match(box.textContent,/FY 2026 · Q2/);assert.match(box.textContent,/GAAP/);assert.match(box.textContent,/non-GAAP/);
 assert.match(box.textContent,/\$1\.40/);assert.match(box.textContent,/\$1\.70/);
 assert.match(box.textContent,/−5|−5.0|-5.0/);assert.match(box.textContent,/SPY/);
 assert.match(box.textContent,/year-to-date/);assert.match(box.textContent,/Over 36 hours old/);
 assert.match(box.textContent,/retrieval time is not revision time/);
 assert.equal(box.querySelector('img'),null);assert.equal(box.querySelector('a[href^="javascript"]'),null);
 assert.doesNotMatch(box.textContent,/\bnull\b|\bundefined\b/);
 assert.ok(box.querySelector('a[href="#/creators?ticker=TEST"]'));
 assert.match(box.querySelector('.earnings-guidance').textContent,/Total revenues are expected/);
 assert.equal(earningsValue(NaN),'—');assert.equal(earningsValue(0,'USD/shares'),'$0.00');
});

test('missing pre-event snapshot does not display today’s data as historical context',()=>{
 const box=earningsPanel({status:'not_recorded_before_event'});
 assert.match(box.textContent,/No pre-event data was saved/);assert.equal(box.querySelector('.earnings-card'),null);
});

test('business interpretation stays separate from accounting facts and does not render old model comparison prose',()=>{
 const doc=documentFixture();
 doc.next_event.basis='provider_non_gaap';
 doc.next_event.basis_by_metric={eps:'provider_non_gaap',revenue:'provider_unspecified'};
 doc.explanation={kind:'ducky_inference',scope:'business_context',
  overview:{en:'Unsupported model overview'},watchpoints:[{en:'Unsupported model comparison'}],
  drivers:[{en:'The cited disclosure describes a business driver.',fact_ids:['fact']}],
  risks:[{en:'The cited outlook remains conditional.',fact_ids:['revenue-guide']}]};
 const box=earningsPanel(doc),interpretation=box.querySelector('.earnings-explanation');
 assert.doesNotMatch(box.textContent,/Unsupported model/);
 assert.match(box.querySelectorAll('.earnings-card')[1].textContent,/EPS · non-GAAP \/ adjusted/);
 assert.match(box.querySelectorAll('.earnings-card')[1].textContent,/Revenue · basis not specified/);
 assert.equal(interpretation.dataset.provenance,'ducky_inference');
 assert.deepEqual([...interpretation.querySelectorAll('[data-section]')].map(n=>n.dataset.section),['drivers','risks']);
 assert.equal(interpretation.querySelectorAll('.earnings-citations').length,2);
 assert.match(box.querySelector('.earnings-guidance').textContent,/Total revenues are expected/);
 assert.match(box.textContent,/\$1\.40/);assert.match(box.textContent,/\$1\.70/);
 assert.equal(earningsEstimateBasis({basis:'provider_non_gaap'},'revenue'),'basis not specified');
 assert.equal(earningsEstimateBasis({basis:'provider_non_gaap'},'eps'),'non-GAAP / adjusted');
 assert.equal(earningsEstimateBasis({basis_by_metric:{eps:'GAAP'}},'eps'),'GAAP');
});

test('calendar earnings is included in Free, shares requests, and discards responses after logout',async()=>{
 store.set('me',{tier:'free'});let calls=[];
 globalThis.fetch=async url=>{calls.push(url);return Response.json({});};
 const free=eventResearchSession();free.mount({type:'earnings',date:'2026-09-10',tickers:['TEST']});await tick();
 assert.equal(calls.filter(u=>u.startsWith('/earnings/context')).length,1);free.dispose();calls=[];
 store.set('me',{tier:'pro'});const pending=[];
 globalThis.fetch=async url=>{calls.push(url);if(url.startsWith('/earnings/context'))return new Promise(r=>pending.push(r));
   return Response.json({relations:[],history:{samples:[]}});};
 const paid=eventResearchSession(),event={type:'earnings',date:'2026-09-10',tickers:['TEST']};
 const a=paid.mount(event),b=paid.mount(event);await tick();
 assert.equal(calls.filter(u=>u.startsWith('/earnings/context')).length,1);
 assert.equal(pending.length,1);
 store.bumpEpoch();store.set('me',null);pending[0](Response.json(documentFixture()));await tick();
 assert.equal(a.querySelector('.earnings-card'),null);assert.equal(b.querySelector('.earnings-card'),null);paid.dispose();
});
