import {test} from 'node:test';
import assert from 'node:assert/strict';
import {record,recent,resource} from '../public/js/app/read-diagnostics.js';

test('diagnostics retain bounded numeric receipts and matching IDs without private payload',()=>{
 const original=console.info;console.info=()=>{};
 try{
  for(let i=0;i<120;i++)record('response',{resource:resource('/stock-research/NVDA'),request_id:i,
   elapsed_ms:18,server_ms:4,trace_id:'a'.repeat(32),token:'private-token',ticker:'NVDA',user_id:999,body:'source text',url:'/private?secret=x'});
  const events=recent();assert.equal(events.length,100);
  assert.equal(events.at(-1).trace_id,'a'.repeat(32));assert.equal(events.at(-1).server_ms,4);
  assert.doesNotMatch(JSON.stringify(events),/private-token|NVDA|999|source text|secret/);
  record('failure',{resource:'watchlist',reason:'provider secret',trace_id:'token-in-header'});
  assert.equal(recent().at(-1).reason,undefined);assert.equal(recent().at(-1).trace_id,undefined);
  assert.equal(resource('/me/profile'),null);assert.equal(resource('/evidence/NVDA?version=history'),null);
  events[0].resource='changed';assert.notEqual(recent()[0].resource,'changed');
 }finally{console.info=original;}
});
