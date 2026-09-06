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
 confirmCreator(creator,async()=>{calls++;return {kol_id:'test'};},()=>followed++);
 assert.equal(calls,0);assert.ok(document.querySelector('dialog').textContent.includes('Finance example'));
 document.querySelector('dialog .btn-ghost').click();assert.equal(calls,0);assert.equal(document.querySelector('dialog'),null);
 confirmCreator(creator,async()=>{calls++;return {kol_id:'test'};},()=>followed++);
 document.querySelector('dialog .btn-primary').click();await new Promise(r=>setTimeout(r,0));assert.equal(calls,1);assert.equal(followed,1);
});

test('free simulation has no private fetch and fictional returns require explicit selection',async()=>{
 store.set('me',{tier:'free'});globalThis.fetch=()=>assert.fail('private fetch');
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
 finish({kol_id:'channel'});await new Promise(r=>setTimeout(r,0));assert.equal(document.querySelector('dialog'),null);
});
