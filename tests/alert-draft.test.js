import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><main></main></body></html>',{url:'https://ducky.test/app/',pretendToBeVisual:true});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const block=document.createElement('script');block.id='ducky-strings';block.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(block);
const {mountDraft}=await import('../public/js/app/views/alert-draft.js');
const {mountSetup}=await import('../public/js/app/views/creator-setup.js');
const store=await import('../public/js/app/store.js');
const tick=()=>new Promise(r=>setTimeout(r,0));
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const ready={id:'a'.repeat(32),status:'ready',proposal:{candidates:[{ticker:'NVDA',name:'NVIDIA'}],issues:[],defaults:['rsi_daily','rsi_threshold30'],predicate:{op:'and',clauses:[{field:'rsi_d',cmp:'<',value:30}]},metrics:[{field:'rsi_d',cmp:'<',value:30,en:'Daily RSI (14)',zh:'日线 RSI（14）',unit:'0–100'}]}};
function fixture(){const root=document.createElement('section');document.body.append(root);const dispose=mountDraft(root,{});return {root,close:()=>{dispose();root.remove();}};}
function submit(root,text='Alert me when NVIDIA RSI is oversold'){root.querySelector('textarea').value=text;root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));}

test('natural examples do not require a ticker or make a request until review; confirmation is explicit and idempotent in UI',async()=>{
 const calls=[];let finish;
 globalThis.fetch=async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body)});return String(url).endsWith('/confirm')?new Promise(r=>finish=r):response(ready);};
 const {root,close}=fixture();root.querySelector('.example-chip').click();assert.equal(calls.length,0);assert.ok(root.querySelector('textarea').value.includes('NVIDIA'));assert.equal(root.querySelector('input').required,false);
 submit(root);await tick();assert.equal(calls.length,1);assert.equal(calls[0].url,'/alerts/translate');
 assert.ok(root.textContent.includes('Daily RSI (14)'));assert.ok(root.textContent.includes('suggested defaults'));assert.ok(root.textContent.includes('Awaiting your confirmation'));
 const confirm=root.querySelector('.alert-translation .btn-primary');confirm.click();confirm.click();await tick();
 assert.equal(calls.length,2);assert.deepEqual(calls[1].body,{});assert.ok(calls[1].url.endsWith('/confirm'));assert.equal(root.querySelector('textarea').disabled,true);
 finish(response({id:42}));await tick();assert.equal(root.querySelector('.alert-translation').textContent,'');close();
});

test('editing text or changing session invalidates late interpretations',async()=>{
 let finish;globalThis.fetch=()=>new Promise(r=>finish=r);
 const {root,close}=fixture();submit(root);root.querySelector('textarea').value='Apple';root.querySelector('textarea').dispatchEvent(new window.Event('input'));finish(response(ready));await tick();assert.equal(root.querySelector('.alert-translation').textContent,'');
 submit(root);store.bumpEpoch();finish(response(ready));await tick();assert.equal(root.querySelector('.translated-metrics'),null);close();
});

test('ambiguous company and unsupported condition cannot be confirmed',async()=>{
 globalThis.fetch=async()=>response({...ready,status:'needs_input',proposal:{...ready.proposal,issues:['choose_company','unsupported_condition'],candidates:[{ticker:'A',name:'First'},{ticker:'B',name:'Second'}]}});
 const {root,close}=fixture();submit(root);await tick();assert.equal(root.querySelector('.alert-translation .btn-primary'),null);
 root.querySelector('.alert-translation .example-chip').click();assert.equal(root.querySelector('input').value,'A');assert.equal(root.querySelector('.alert-translation').textContent,'');close();
});

test('relative rule shows return difference and the exact benchmark, never a price ratio',async()=>{
 globalThis.fetch=async()=>response({...ready,proposal:{...ready.proposal,defaults:[],benchmark:{kind:'basket',symbols:['AMD','AVGO']},metrics:[{field:'rs20',value:-5,cmp:'<=',en:'20-session return minus benchmark return',unit:'pp'}]}});
 const {root,close}=fixture();submit(root);await tick();assert.ok(root.textContent.includes('Underperforms by 5 percentage points or more'));assert.ok(root.textContent.includes('AMD · AVGO'));assert.ok(root.textContent.includes('not the ratio of share prices'));close();
});

test('queued draft never activates an alert and closing stops further polling',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return response({id:ready.id,status:'queued'},202);};
 const {root,close}=fixture();submit(root);await tick();assert.ok(root.textContent.includes('No alert is active yet'));assert.equal(root.querySelector('.alert-translation .btn-primary'),null);close();assert.equal(calls,1);
});

test('creator topic examples fill real directory names without auto-following',()=>{
 let calls=0;globalThis.fetch=()=>{calls++;assert.fail('no request on example');};
 const root=document.createElement('section');document.body.append(root);const dispose=mountSetup(root,{});
 const picks=root.querySelectorAll('.creator-pick');assert.equal(picks.length,4);
 picks[2].click();assert.equal(root.querySelector('input').value,'投资TALK君');assert.equal(calls,0);assert.ok(root.textContent.includes('full channel name'));dispose();root.remove();
});

test('changing the creator search drops a late lookup for the previous name',async()=>{
 store.set('me',{tier:'pro'});let finish;globalThis.fetch=()=>new Promise(r=>finish=r);
 const root=document.createElement('section');document.body.append(root);const dispose=mountSetup(root,{});
 root.querySelector('input').value='First';root.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));
 root.querySelectorAll('.creator-pick')[2].click();finish(response({id:'old',status:'ready',candidates:[{name:'First old result',channel_id:'old'}]}));await tick();
 assert.ok(!root.textContent.includes('First old result'));assert.equal(root.querySelector('input').value,'投资TALK君');dispose();root.remove();
});
