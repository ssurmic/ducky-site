import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/app/'});
for(const k of ['window','document','Node','location'])globalThis[k]=dom.window[k];
const table=document.createElement('script');table.id='ducky-strings';table.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(table);
const {macroSeries,linePath,renderMacroBeta,mountMacroBeta}=await import('../public/js/app/macro-beta.js');
const store=await import('../public/js/app/store.js');
const tick=()=>new Promise(r=>setTimeout(r,10));
const response=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
function fixture(){const history=Array.from({length:100},(_,i)=>{const d=new Date(Date.UTC(2026,5,1+i));return {date:d.toISOString().slice(0,10),beta_score:i===50?null:40+i/10,funding_score:42,rates_score:55,qqq_index:100+i,spy_index:100+i/2,metrics:{nominal_10y:4+i/100,real_10y:2+i/100},annotation:'mixed',contributions:{funding_spread:-2.5},source_dates:{}};});return {status:'ok',as_of:history.at(-1).date,observed_at:'2026-09-09T12:00:00Z',latest:history.at(-1),history,coverage:{sessions:100,complete_scores:99},sources:{}};}

test('line paths preserve zero and missing-data gaps without joining across them',()=>{
 const rows=[{v:0},{v:10},{v:null},{v:20},{v:NaN},{v:5}];
 const path=linePath(rows,r=>r.v,i=>i,v=>v);
 assert.equal((path.match(/M/g)||[]).length,3);assert.equal((path.match(/L/g)||[]).length,1);
 assert.match(path,/M0.00 0.00/);assert.doesNotMatch(path,/NaN|null/);
});
test('stock lines share a valid starting date and rebase independently to one hundred',()=>{
 const rows=[{qqq_index:null,spy_index:20},{qqq_index:200,spy_index:100},{qqq_index:220,spy_index:105}];
 const lines=macroSeries(rows,'stocks');assert.equal(lines[0][2](rows[0]),null);
 assert.equal(lines[1][2](rows[0]),null);
 assert.equal(lines[0][2](rows[1]),100);assert.equal(lines[1][2](rows[1]),100);
 assert.equal(lines[0][2](rows[2]),110);assert.equal(lines[1][2](rows[2]),105);
});
test('line chart supports ranges, separate yield units and exact keyboard date readouts',()=>{
 const box=renderMacroBeta(fixture());document.body.append(box);
 assert.equal(box.querySelectorAll('.macro-score').length,3);
 let slider=box.querySelector('input[type=range]');slider.value='0';slider.dispatchEvent(new window.Event('input'));
 assert.match(box.querySelector('.macro-readout').textContent,/2026-06-01/);
 assert.match(slider.getAttribute('aria-valuetext'),/2026-06-01/);
 [...box.querySelectorAll('button')].find(x=>x.textContent==='1M').click();
 slider=box.querySelector('input[type=range]');assert.ok(Number(slider.max)<40);
 [...box.querySelectorAll('button')].find(x=>x.textContent==='10-year yields').click();
 assert.match(box.querySelector('.macro-legend').textContent,/annual yield %/);
 assert.match(box.querySelector('.macro-readout').textContent,/%/);
 assert.match(box.textContent,/not a higher probability/);box.remove();
});
test('free macro card never requests private data; account change suppresses pending chart',async()=>{
 store.set('me',{tier:'free'});let calls=0;globalThis.fetch=async()=>{calls++;return response(fixture());};
 const free=document.createElement('div');const dispose=mountMacroBeta(free);await tick();assert.equal(calls,1);assert.equal(free.querySelector('a[href="#/billing"]'),null);dispose();
 store.set('me',{tier:'pro'});let done;globalThis.fetch=()=>new Promise(r=>done=r);
 const root=document.createElement('div'),clean=mountMacroBeta(root);store.bumpEpoch();store.set('me',null);done(response(fixture()));await tick();
 assert.equal(root.querySelector('svg'),null);clean();
});

test('missing funding displays an uncertainty range without manufacturing a score',()=>{
 const doc=fixture();doc.latest.funding_score=null;doc.latest.beta_score=null;doc.latest.funding_range=[12.5,42.5];
 const box=renderMacroBeta(doc);assert.match(box.textContent,/12.5–42.5/);assert.match(box.textContent,/not an observed score/);
 assert.equal(box.querySelector('.macro-score strong').textContent,'—');
});
