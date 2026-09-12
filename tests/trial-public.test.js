import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
test('trial public export removes current caches and databases, preserves dated losses and methodology',()=>{
 const path=mkdtempSync(join(tmpdir(),'ducky-public-trial-'));
 try{
  for(const name of ['calendar.json','week-ahead.json','desk-prices.json','kol-feed.json'])writeFileSync(join(path,name),JSON.stringify({secret:'current-research'}));
  writeFileSync(join(path,'ducky_public.db'),'private replica');
  const loss={ts:'2025-01-01',return_pct:-20},recent={ts:new Date().toISOString(),summary:'current research'};
  writeFileSync(join(path,'feed.json'),JSON.stringify({items:[loss,recent]}));
  writeFileSync(join(path,'seasonality.json'),JSON.stringify({version:'monthly-etf-v1',basis:'published historical statistics'}));
  execFileSync(process.env.DUCKY_TEST_PYTHON||'python3',['-c','import sys;from trial_public import sanitize;sanitize(sys.argv[1])',path]);
  assert.deepEqual(JSON.parse(readFileSync(join(path,'feed.json'))).items,[loss]);
  assert.equal(JSON.parse(readFileSync(join(path,'calendar.json'))).status,'subscription_required');
  assert.equal(existsSync(join(path,'ducky_public.db')),false);
  assert.equal(JSON.parse(readFileSync(join(path,'seasonality.json'))).version,'monthly-etf-v1');
 }finally{rmSync(path,{recursive:true,force:true});}
});

test('new unclassified static JSON cannot silently publish private research',()=>{
 const path=mkdtempSync(join(tmpdir(),'ducky-unknown-trial-'));
 try{
  writeFileSync(join(path,'new-current-research.json'),'{}');
  assert.throws(()=>execFileSync(process.env.DUCKY_TEST_PYTHON||'python3',['-c','import sys;from trial_public import sanitize;sanitize(sys.argv[1])',path],{stdio:'pipe'}),/Unclassified public JSON/);
 }finally{rmSync(path,{recursive:true,force:true});}
});
