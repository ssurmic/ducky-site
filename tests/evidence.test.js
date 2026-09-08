import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/evidence/AVGO'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount,mapView}=await import('../public/js/app/views/evidence.js');
const {safeTarget}=await import('../public/js/app/login-target.js');
const {closeModal}=await import('../public/js/app/ui.js');
const response=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});
function fixture(){return {ticker:'AVGO',status:'ready',checked_at:'2026-09-07T12:00:00Z',summary:{en:'Orders remain unconfirmed.',zh:'订单尚待确认。',citations:['n9']},
 nodes:Array.from({length:10},(_,i)=>({id:'n'+i,title:{en:'Point '+i,zh:'观点 '+i},kind:'creator',stance:i===9?'counter':i<5?'support':'context',conditional:i===9,
 published_at:'2026-09-04',evidence:[{id:'e'+i,kind:'creator',author:i===9?'Counter Author':'Source Author',source_url:'https://example.com/source',title:{en:'Source '+i,zh:'来源 '+i},
 start_seconds:70,end_seconds:90,published_at:'2026-09-04',observed_at:'2026-09-07T12:00:00Z'}]})),coverage:{corpus_documents:12,jobs:{pending:2}},missing:['price_gaps']};}
test('six balanced nodes, exact source passage and progressive disclosure',()=>{
 const root=mapView(fixture());document.body.append(root);
 assert.equal(root.querySelectorAll('.evidence-node').length,6);
 assert.match(root.querySelector('.evidence-branches').textContent,/Point 9/);
 assert.equal(root.querySelector('.evidence-coverage').open,false);
 root.querySelector('.brief-citation').click();
 assert.match(document.querySelector('.modal-body').textContent,/Counter Author/);
 assert.match(document.querySelector('.modal-body').textContent,/1:10–1:30/);
 assert.match(document.querySelector('.modal-body').textContent,/conditional/);
 closeModal();root.remove();
});
test('search indexes authors and evidence, filters show full opposition and more retains all points',()=>{
 const root=mapView(fixture());document.body.append(root);
 const input=root.querySelector('input');input.value='Counter Author';input.dispatchEvent(new window.Event('input'));
 assert.equal(root.querySelectorAll('.evidence-node').length,1);
 assert.match(root.querySelector('.evidence-node').textContent,/Point 9/);
 input.value='';input.dispatchEvent(new window.Event('input'));
 [...root.querySelectorAll('button')].find(b=>b.textContent==='Show more').click();
 assert.equal(root.querySelectorAll('.evidence-node').length,10);root.remove();
});
test('untrusted captions stay text and unsafe source links are rejected',()=>{
 const d=fixture();d.nodes[9].title.en='<img src=x onerror=alert(1)>';d.nodes[9].evidence[0].source_url='javascript:alert(1)';
 const root=mapView(d);document.body.append(root);root.querySelector('.brief-citation').click();
 assert.equal(document.querySelectorAll('img,a[href^="javascript:"]').length,0);
 assert.match(document.querySelector('.modal-box').textContent,/<img/);closeModal();root.remove();
});
test('free and signed-out users never fetch private evidence',async()=>{
 store.set('me',{tier:'free'});let calls=[];globalThis.fetch=async url=>{calls.push(String(url));return response(fixture());};
 const root=document.createElement('div');const cleanup=await mount(root,{ticker:'AVGO'});
 assert.equal(calls.length,0);assert.ok(root.querySelector('a[href="#/billing"]'));cleanup();
});
test('direct route uses shared API, logout removes data and old responses cannot return',async()=>{
 store.set('me',{tier:'pro'});let resolve;globalThis.fetch=()=>new Promise(r=>resolve=r);
 const root=document.createElement('div');const task=mount(root,{ticker:'AVGO'});
 store.bumpEpoch();store.set('me',null);resolve(response(fixture()));
 const cleanup=await task;assert.equal(root.querySelectorAll('.evidence-node').length,0);cleanup();
});
test('evidence deep links survive sign-in without arbitrary query data',()=>{
 assert.equal(safeTarget('#/evidence/avgo?token=secret'),'#/evidence/AVGO');
 assert.equal(safeTarget('#/evidence'),'#/evidence');
});
