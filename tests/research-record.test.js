import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/app/'});
for(const k of ['window','document','Node','location','history'])globalThis[k]=dom.window[k];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {renderRecord,recordCard,mountRecord}=await import('../public/js/app/views/research-record.js');
const {socialHistoryChart}=await import('../public/js/app/views/social-history-chart.js');
const store=await import('../public/js/app/store.js');
const row={id:'research:1',ticker:'NVDA',stream:'vibe',observed_at:'2026-09-07T01:00:00Z',indexed_at:'2026-09-07T01:05:00Z',source_at:null,payload:{mentions:0,index:null,source_url:'javascript:alert(1)'}};
const response=body=>new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
test('records retain actual zero, missing scores, full dates and safe links',()=>{
 const card=recordCard(row);assert.match(card.textContent,/0/);assert.match(card.textContent,/—/);assert.match(card.textContent,/Not provided/);
 assert.equal(card.querySelector('a[href^="javascript:"]'),null);assert.ok(card.querySelector('a[href="#/evidence/NVDA"]'));assert.match(card.textContent,/captured discussion volume, not bullish or bearish/);
 assert.match(recordCard({...row,payload:{index:42.5,mentions:30}}).textContent,/42.5 \/ 100/);
 const doc=renderRecord({ticker:'NVDA',items:[row],streams:[]});assert.equal(doc.querySelectorAll('.research-stream').length,8);
 assert.ok([...doc.getElementsByTagName('a')].some(a=>a.getAttribute('href')==='#/boards?board=social&ticker=NVDA'));
 assert.match(doc.textContent,/No record yet/);assert.doesNotMatch(doc.textContent,/undefined|null|record\./);
});
test('legacy heat is not relabeled as a historical bull/bear balance',()=>{
 const card=recordCard({...row,payload:{mentions:2000,index:100,state:'overheated'}});
 assert.match(card.querySelector('.vibe-direction').textContent,/Bulls—Bears—/);
 assert.doesNotMatch(card.querySelector('.vibe-direction').textContent,/100|2000|0%|neutral/i);
 assert.match(card.querySelector('.vibe-attention-history').textContent,/2000|2,000/);
 assert.equal(card.querySelector('.vibe-attention-history').open,false);
});
test('current reviewed points appear before full-video notification readiness and keep qualification links',()=>{
 const point={id:'creator:shared',source_at:'2026-09-03T12:00:00Z',observed_at:'2026-09-08T09:00:00Z',source_url:'https://www.youtube.com/watch?v=video',
   data:{title:{en:'Conditional revenue view',zh:'有条件的营收观点'},author:'Author',creator_id:'creator',post_id:'video',point_id:'claim:one',condition_text:'If capacity expands',horizon_text:'Next 12 months'}};
 const card=renderRecord({ticker:'NVDA',items:[],creator_points:{items:[point],coverage:{status:'ready',selected:1,omitted:2}}});
 assert.equal(card.querySelectorAll('.research-stream').length,8);
 assert.match(card.textContent,/Conditional revenue view|If capacity expands/);
 assert.match(card.textContent,/Next 12 months/);assert.match(card.textContent,/Author/);
 assert.ok([...card.querySelectorAll('a')].some(a=>a.getAttribute('href')?.includes('point=claim%3Aone')));
 assert.match(card.textContent,/2026-09-03/);assert.match(card.textContent,/2026-09-08/);
 assert.ok(card.textContent.includes(copy['app.stockbrief.creator_partial']));
});
test('correction status never displays withdrawn title or facts',()=>{
 const card=recordCard({...row,payload:{content_status:'superseded',title:'obsolete',index:99}});
 assert.match(card.textContent,/corrected/);assert.doesNotMatch(card.textContent,/obsolete|99/);
 assert.match(card.textContent,/research:1/);assert.match(card.textContent,/2026-09-07/);
});
test('official publication precision is separate from effective date and uses available English copy',()=>{
 const event={...row,stream:'calendar',source_at:'2026-09-04T23:15:00Z',payload:{title:'BE 纳入',title_en:'BE joins S&P 500',
   date:'2026-09-21',date_precision:'day',publication_precision:'second',time:'盘前',time_en:'Before market open'}};
 const card=recordCard(event);
 assert.match(card.textContent,/BE joins S&P 500/);assert.match(card.textContent,/23:15 UTC/);
 assert.match(card.textContent,/Before market open/);assert.doesNotMatch(card.textContent,/time not provided|BE 纳入/i);
 assert.match(recordCard({...event,payload:{date_precision:'day'}}).textContent,/time not provided/i);
});
test('heat timeline has gaps for missing scores and absent collection, preserving a real zero',()=>{
 const samples=[0,null,80,90].map((score,i)=>({id:String(i),collected_at:`2026-09-07T0${i}:00:00Z`,index:score}));
 const chart=socialHistoryChart(samples);assert.equal(chart.querySelectorAll('circle').length,3);
 assert.equal(chart.querySelectorAll('path').length,2);assert.match(chart.textContent,/not zero heat/);
 const single=socialHistoryChart([samples[0]]);assert.equal(single.querySelector('circle').getAttribute('cx'),'320');
 const empty=socialHistoryChart([{id:'missing',collected_at:'invalid',index:99}]);assert.equal(empty.querySelector('svg'),null);
});
test('private evidence response is discarded after account changes',async()=>{
 store.set('me',{tier:'pro'});let finish;globalThis.fetch=()=>new Promise(r=>finish=r);
 const root=document.createElement('div'),task=mountRecord(root,'NVDA');store.bumpEpoch();store.set('me',null);
 finish(response({ticker:'NVDA',items:[row]}));await task;assert.doesNotMatch(root.textContent,/research:1/);
});
