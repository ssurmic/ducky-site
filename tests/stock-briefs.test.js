import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/briefing'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(
 Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mountStockBriefs,reportCard,factText}=await import('../public/js/app/views/stock-briefs.js');
const {mountSocial}=await import('../public/js/app/views/social-tracking.js');
const {safeTarget}=await import('../public/js/app/login-target.js');
const response=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});
const text={zh:'等待进一步确认。',en:'Wait for confirmation.',citations:['one']};
const fixture=()=>({ticker:'NVDA',id:'brief-1',status:'ready',checked_at:'2026-09-07T12:00:00Z',generated_at:'2026-09-07T12:00:00Z',
 report:{state:'wait',summary:text,not_holding:text,if_holding:text,risk:text,next_check:text,
 dimensions:['flows','vibe','technical','context'].map(d=>({dimension:d,...text}))},
 evidence:[{id:'one',topic:'price',observed_at:'2026-09-07T11:00:00Z',data:{price:10,price_session:'2026-09-04:CLOSED'},source_url:'https://example.com/source'}],missing:['volatility']});

test('default report is concise with conditional actions and citations opening the exact evidence',()=>{
 const root=reportCard(fixture());document.body.append(root);
 assert.equal(root.querySelector('.stock-brief-reasoning').open,false);
 assert.match(root.textContent,/If you do not own it/);assert.match(root.textContent,/If you already own it/);
 root.querySelector('.brief-citation').click();
 assert.ok(root.querySelector('.stock-brief-reasoning').open);assert.ok(root.querySelector('.stock-brief-evidence').open);
 assert.equal(document.activeElement,root.querySelector('.stock-brief-fact'));
 assert.equal(root.querySelectorAll('.stock-brief-reasoning>section').length,4);root.remove();
});
test('stale, withdrawn and pending reports cannot appear current; unsafe prose stays text',()=>{
 const row=fixture();row.status='stale';row.report.summary={...text,en:'<img src=x onerror=alert(1)>'};row.evidence[0].source_url='javascript:alert(1)';
 const root=reportCard(row);assert.match(root.textContent,/Previous report/);assert.match(root.textContent,/original dates/);
 assert.equal(root.querySelectorAll('img,script,a[href^="javascript:"]').length,0);
 row.status='source_changed';assert.equal(reportCard(row).querySelector('.stock-brief-summary'),null);
 assert.match(reportCard({ticker:'NVDA',status:'pending',refresh:{status:'failed'}}).textContent,/worker will retry/);
 assert.match(factText({topic:'volatility',data:{iv:0,hv:10,ratio:null}}),/IV 0.0%.*IV\/HV —/);
});
test('free access makes no private requests and a direct ticker uses the shared read endpoint',async()=>{
 store.set('me',{tier:'free'});let calls=[];globalThis.fetch=async url=>{calls.push(String(url));return response({items:[fixture()]});};
 const root=document.createElement('div');let cleanup=await mountStockBriefs(root);assert.equal(calls.length,0);assert.ok(root.querySelector('a[href="#/billing"]'));cleanup();root.replaceChildren();
 store.set('me',{tier:'pro'});cleanup=await mountStockBriefs(root,{query:new URLSearchParams('ticker=NVDA')});
 assert.deepEqual(calls,['/briefing/stocks?ticker=NVDA']);assert.equal(root.querySelectorAll('.stock-brief').length,1);cleanup();
});
test('late shared reports are discarded after logout',async()=>{
 store.set('me',{tier:'pro'});let resolve;globalThis.fetch=()=>new Promise(r=>resolve=r);
 const root=document.createElement('div');const task=mountStockBriefs(root);store.bumpEpoch();resolve(response({items:[fixture()]}));
 const cleanup=await task;assert.equal(root.querySelectorAll('.stock-brief').length,0);cleanup();
});
test('Degen legacy link uses one Vibe Check heading, direction first, attention in details',async()=>{
 store.set('me',{tier:'pro'});globalThis.fetch=async()=>response({status:'ready',items:[{ticker:'NVDA',company:'NVIDIA',id:'one',state:'overheated',index:90,mentions:500,rank:1,overheated:true}],coverage:{}});
 const root=document.createElement('div');const cleanup=await mountSocial(root,{view:'degen',query:new URLSearchParams()});
 assert.equal(root.querySelector('h1').textContent,'Vibe Check');assert.equal(root.querySelector('a[href="#/degen"]'),null);
 const card=root.querySelector('.social-card');assert.ok(card.querySelector('.vibe-direction'));assert.equal(card.querySelector('meter').closest('details').open,false);
 assert.ok(card.querySelector('a[href="#/briefing?ticker=NVDA"]'));cleanup();
});
test('stock notification and Vibe targets survive sign-in without retaining arbitrary query data',()=>{
 assert.equal(safeTarget('#/briefing?ticker=nvda&token=secret'),'#/briefing?ticker=NVDA');
 assert.equal(safeTarget('#/briefing?period=daily'),'#/briefing?period=daily');
 assert.equal(safeTarget('#/vibe?ticker=TSLA&scope=hot&token=secret'),'#/vibe?ticker=TSLA&scope=hot');
 assert.equal(safeTarget('#/briefing?ticker=<script>'),'#/briefing');
});
