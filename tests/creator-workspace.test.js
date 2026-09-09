import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<main></main>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
const strings=document.createElement('script');strings.id='ducky-strings';
const copy=JSON.parse(readFileSync('i18n/en.json'));strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {simulate,mountSimulation,simulationRows}=await import('../public/js/app/views/creator-simulation.js');
const {confirmCreator,mountSetup}=await import('../public/js/app/views/creator-setup.js');
const store=await import('../public/js/app/store.js');
const cfg={capital:10000,cash:20,stock:40,dca:true,budget:40,cadence:1,reduce:true,trim:50,pause:true,accelerate:false,fee:0};
const path=[{d:'D00',stock:0,spy:0},{d:'D01',stock:-20,spy:0},{d:'D02',stock:10,spy:0}];

test('simulation conserves capital, cash budget, and includes missed rebounds',()=>{
 const rows=simulate(path,cfg,'bear');assert.equal(rows[0].value,10400);assert.equal(rows[0].trades,0);
 assert.equal(rows[1].trades,2);assert.equal(rows[1].cash,1200);assert.equal(rows[1].value,10550);
 assert.equal(rows[2].cash,4000);assert.equal(rows[2].value,10200);assert.equal(rows[2].trades,1);
 assert.ok(rows[2].value<rows[0].value);assert.ok(rows[0].drawdown<0);
 const fees=simulate(path,{...cfg,fee:10},'bear');assert.equal(fees[2].cost,2);assert.equal(fees[2].value,10198);
 assert.equal(simulate(path,{...cfg,stock:0,cash:100,dca:false},'bear')[2].value,10000);
 assert.equal(simulate(path,{...cfg,cadence:5},'neutral')[1].trades,0);
 assert.throws(()=>simulate(path,{...cfg,cash:80},'bear'));
 assert.throws(()=>simulate(path,{...cfg,capital:NaN},'bear'));
 assert.throws(()=>simulate([...path].reverse(),cfg,'bear'));
});

test('simulation selects earliest verified version, never a revised successful take',()=>{
 const rows=simulationRows([{id:1,revision_id:1,kol_id:'x',calls:[]},{id:1,revision_id:2,first_verified_revision_id:2,kol_id:'x',calls:[{stance:'bear'}]},{id:1,revision_id:3,first_verified_revision_id:2,kol_id:'x',calls:[{stance:'bull'}]}]);
 assert.equal(rows.length,1);assert.equal(rows[0].call.stance,'bear');
 assert.equal(simulationRows([{id:1,revision_id:3,first_verified_revision_id:2,calls:[{stance:'bull'}]}]).length,0);
});

test('identity dialog never subscribes before affirmative confirmation, including cancel',async()=>{
 let calls=0,followed=0;const creator={name:'Same Name',channel_id:'UCabc',url:'https://www.youtube.com/channel/UCabc',recent:[{title:'Finance example',published_at:'2025-01-01'}]};
 confirmCreator(creator,async()=>{calls++;return {kol_id:'test',subscribed:true};},()=>followed++);
 assert.equal(calls,0);assert.ok(document.querySelector('dialog').textContent.includes('Finance example'));
 document.querySelector('dialog .btn-ghost').click();assert.equal(calls,0);assert.equal(document.querySelector('dialog'),null);
 confirmCreator(creator,async()=>{calls++;return {kol_id:'test',subscribed:true};},()=>followed++);
 document.querySelector('dialog .btn-primary').click();await new Promise(r=>setTimeout(r,0));assert.equal(calls,1);assert.equal(followed,1);
});

test('free simulation reads scoped history and fictional returns require explicit selection',async()=>{
 store.set('me',{tier:'free'});globalThis.fetch=async url=>{assert.match(url,/^\/kol\/research/);return Response.json({items:[]});};
 const root=document.createElement('section');document.body.append(root);await mountSimulation(root,{});
 assert.equal(root.querySelector('.creator-sim-chart'),null);
 [...root.querySelectorAll('button')].find(b=>b.textContent==='Try a fictional scenario').click();
 assert.ok(root.textContent.includes('fictional prices'));assert.ok(root.querySelector('.creator-sim-chart'));
 assert.ok(!root.textContent.includes('BACKTEST'));root.remove();
});


test('an accepted follow cannot be presented as cancelled while its request is pending',async()=>{
 let finish;confirmCreator({name:'Channel'},()=>new Promise(resolve=>finish=resolve),()=>{});
 document.querySelector('dialog .btn-primary').click();
 const dialog=document.querySelector('dialog');assert.equal(dialog.querySelector('.btn-ghost').disabled,true);
 dialog.dispatchEvent(new window.Event('cancel',{cancelable:true}));assert.ok(dialog.isConnected);
 finish({kol_id:'channel',subscribed:true});await new Promise(r=>setTimeout(r,0));assert.equal(document.querySelector('dialog'),null);
});

globalThis.requestAnimationFrame=fn=>fn();
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const response=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
const creator={kol_id:'joseph',name:'Joseph Carlson',channel_id:'UCbta0n8i6Rljh0obO7HzG9A',profile:{},recent:[]};
Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});

function setupRoot(){const root=document.createElement('section');document.body.append(root);store.set('me',{tier:'pro',user_id:1});return root;}

test('autocomplete keyboard selection confirms a cached channel and waits for a saved follow',async()=>{
 const root=setupRoot();let saved=0,finish;
 globalThis.fetch=async(url,options)=>{
  if(url==='/kol/lookups')return response({items:[]});
  if(url.startsWith('/kol/suggest'))return response({items:[creator]});
  if(url==='/kol/resolve'){assert.equal(JSON.parse(options.body).input,creator.channel_id);return response({id:'lookup',status:'ready',candidates:[creator]});}
  if(url.endsWith('/confirm'))return new Promise(resolve=>finish=()=>resolve(response({subscribed:true,kol_id:'joseph'})));
  assert.fail(url);
 };
 const cleanup=mountSetup(root,{onFollow:()=>saved++});await tick();
 const field=root.querySelector('[role=combobox]');field.focus();await tick();
 assert.equal(field.getAttribute('aria-expanded'),'true');
 field.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
 field.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await tick();
 assert.ok(document.querySelector('dialog'));assert.equal(saved,0);
 document.querySelector('dialog .btn-primary').click();await tick();assert.equal(saved,0);
 finish();await tick();assert.equal(saved,1);cleanup();root.remove();
});

test('lookup resumes after returning, polls automatically, and ignores results after cleanup',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const root=setupRoot();let reads=0;
 globalThis.fetch=async url=>{
  if(url==='/kol/lookups')return response({items:[{id:'pending',input:'@creator',status:'queued'}]});
  if(url==='/kol/resolve/pending'){reads++;return response({id:'pending',status:'ready',candidates:[creator]});}
  assert.fail(url);
 };
 const cleanup=mountSetup(root,{onFollow:()=>{}});await tick();
 assert.ok(root.textContent.includes('Results update automatically'));assert.equal(root.querySelector('input').value,'@creator');
 t.mock.timers.tick(999);await tick();assert.equal(reads,0);
 t.mock.timers.tick(1);await tick();assert.equal(reads,1);assert.ok(root.textContent.includes('Channel found'));
 cleanup();t.mock.timers.tick(30000);await tick();assert.equal(reads,1);root.remove();
});

test('old autocomplete responses cannot replace a newer search',async()=>{
 const root=setupRoot();let first;
 globalThis.fetch=async url=>{
  if(url==='/kol/lookups')return response({items:[]});
  if(url.endsWith('q=old'))return new Promise(resolve=>first=resolve);
  if(url.endsWith('q=new'))return response({items:[{...creator,name:'New Creator'}]});
  assert.fail(url);
 };
 const cleanup=mountSetup(root,{onFollow:()=>{}});await tick();const field=root.querySelector('input');
 field.value='old';field.dispatchEvent(new window.Event('focus'));await tick();
 field.value='new';field.dispatchEvent(new window.Event('focus'));await tick();
 first(response({items:[{...creator,name:'Old Creator'}]}));await tick();
 assert.ok(root.querySelector('[role=listbox]').textContent.includes('New Creator'));
 assert.ok(!root.querySelector('[role=listbox]').textContent.includes('Old Creator'));cleanup();root.remove();
});

test('follow feedback persists and analysis completion is read automatically',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const root=setupRoot();const {mount}=await import('../public/js/app/views/creators.js');
 let followed=false,ready=false;
 globalThis.fetch=async url=>{
  if(url==='/kol/feed')return response({kols:[{...creator,id:'joseph'}],posts:[]});
  if(url==='/watchlist')return response({items:[]});
  if(url==='/me/kols')return response({subs:followed?['joseph']:[],creators:[creator],analysis:followed?{joseph:{status:ready?'ready':'queued'}}:{}});
  if(url==='/kol/lookups')return response({items:[]});
  if(url==='/kol/joseph/sub'){followed=true;return response({subscribed:true,kol_id:'joseph',creator,analysis:{status:'queued'}});}
  assert.fail(url);
 };
 const cleanup=await mount(root);await tick();
 [...root.querySelectorAll('button')].find(b=>b.textContent===copy['app.creators.discover']).click();
 root.querySelector('.cr-chip').click();document.querySelector('dialog .btn-primary').click();await tick();
 assert.ok(root.querySelector('.creator-follow-success').textContent.includes('Added Joseph Carlson'));
 ready=true;t.mock.timers.tick(4000);await tick();await tick();
 assert.ok(root.querySelector('.creator-follow-success').textContent.includes('ready to read'));
 assert.ok(root.querySelector('.creator-page-heading').textContent.includes('Joseph Carlson'));assert.equal(root.querySelector('.creator-video-archive').open,true);cleanup();root.remove();
});


test('progress reads are single-flight, back off on failure and pause in hidden tabs',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {progressPoll}=await import('../public/js/app/views/creator-progress.js');
 let calls=0,finish,errors=0,values=0;
 const poll=progressPoll({active:()=>true,read:()=>{calls++;return calls===1?new Promise(r=>finish=r):Promise.reject(new Error('offline'));},onValue:()=>values++,onError:()=>errors++});
 poll.refresh();poll.refresh();assert.equal(calls,1);finish({});await tick();assert.equal(values,1);
 t.mock.timers.tick(4000);await tick();assert.equal(calls,2);assert.equal(errors,1);
 t.mock.timers.tick(4000);await tick();assert.equal(calls,2);
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
 t.mock.timers.tick(4000);await tick();assert.equal(calls,2);
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
 document.dispatchEvent(new window.Event('visibilitychange'));await tick();assert.equal(calls,3);
 poll.stop();t.mock.timers.tick(60000);await tick();assert.equal(calls,3);
});
