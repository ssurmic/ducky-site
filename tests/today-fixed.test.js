import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {summaryFixed} from '../public/js/app/today-fixed.js';

test('current-summary formatting preserves binary float rounding and exact even ties',()=>{
 for(const [value,digits,expected] of [[5.255,2,'5.25'],[5.125,2,'5.12'],[5.375,2,'5.38'],
   [16.25,1,'16.2'],[16.75,1,'16.8'],[0.125,2,'0.12'],[-0.125,2,'-0.12'],[50.5,0,'50'],
   [51.5,0,'52'],[0,2,'0.00'],[-0,2,'-0.00'],[-0.001,2,'-0.00']])assert.equal(summaryFixed(value,digits),expected);
 for(const value of [null,undefined,'5.255',NaN,Infinity,-Infinity])assert.equal(summaryFixed(value,2),'—');
});

test('formatter matches Python fixed-point output across finite values, precisions and nearby ties',()=>{
 const values=[0,-0,Number.MIN_VALUE,-Number.MIN_VALUE,Number.MAX_VALUE,-Number.MAX_VALUE,
   5.255,5.125,16.25,0.125,2.675,50.5,51.5,1e-20,1e20];
 for(let i=-40;i<=80;i++){
  const tie=i/8;values.push(tie,tie-Number.EPSILON*Math.max(1,Math.abs(tie)),tie+Number.EPSILON*Math.max(1,Math.abs(tie)),i/10);
 }
 const inputs=values.flatMap(value=>[0,1,2].map(digits=>({value:Object.is(value,-0)?'-0.0':String(value),digits})));
 const expected=JSON.parse(execFileSync(process.env.DUCKY_TEST_PYTHON||'python3',['-c',
  'import json,sys; print(json.dumps([format(float(r["value"]), ".%df" % r["digits"]) for r in json.load(sys.stdin)]))'],
  {input:JSON.stringify(inputs),encoding:'utf8'}));
 for(let i=0;i<inputs.length;i++)assert.equal(summaryFixed(Number(inputs[i].value),inputs[i].digits),expected[i],JSON.stringify(inputs[i]));
});
