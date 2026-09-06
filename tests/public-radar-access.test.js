import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="en" data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/boards'});
for(const k of ['window','document','Node','location','history'])globalThis[k]=dom.window[k];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount,archivePath}=await import('../public/js/app/views/boards.js');
const response=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});

test('free radar uses public endpoints and shifts its recent window by five days',async()=>{
 store.set('me',{tier:'free'});store.set('token',null);const calls=[];
 const cutoff=new Date(Date.now()-5*86400000).toISOString(),old=new Date(Date.now()-6*86400000).toISOString();
 globalThis.fetch=async(url,options)=>{url=String(url);calls.push({url,options});
  return response(url.includes('archive.json')?{filter_version:3,items:[{id:1,ts:old,kind:'stake',ticker:'EX',summary:'Delayed source'}],access:{mode:'delayed',delay_days:5,available_before:cutoff}}:{items:[]});};
 const root=document.createElement('section');document.body.append(root);const dispose=await mount(root,{query:new URLSearchParams()});
 assert.ok(calls.some(c=>c.url.includes('/public/radar/archive.json')));assert.equal(calls.some(c=>/\/radar\/archive\.json/.test(c.url)&&!c.url.includes('/public/')),false);
 assert.ok(root.textContent.includes('Delayed source'));assert.ok(root.textContent.includes(copy['app.radar.access_delayed']));
 const recent=new URL(calls.find(c=>c.url.includes('archive.json')).url,'https://ducky.test');assert.ok(recent.searchParams.get('start')<=new Date(Date.now()-11*86400000).toISOString().slice(0,10));
 dispose();root.remove();
});
test('Pro radar uses authenticated private URLs and does not mix public cache mode',async()=>{
 store.set('me',{tier:'pro'});store.set('token','fixture-token');const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return response({filter_version:3,items:[],sectors:[]});};
 const root=document.createElement('section');const dispose=await mount(root,{query:new URLSearchParams('mode=archive')});
 const request=calls.find(c=>c.url.includes('/radar/archive.json')&&!c.url.includes('/public/'));assert.ok(request);assert.equal(request.options.headers.Authorization,'Bearer fixture-token');
 assert.equal(root.querySelector('.radar-access-note'),null);
 assert.ok(archivePath({},null,true).startsWith('/radar/archive.json?'));assert.ok(archivePath({}).startsWith('/public/radar/archive.json?'));
 dispose();
});
test('static build sanitizer removes current and undated payloads while preserving losses and aggregate evidence',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ducky-public-delay-'));
 try{
  const rows=[{ts:'2026-08-30',ticker:'OLD',mode:'LIVE',r20:-30},{ts:'2026-09-05',ticker:'CURRENT',mode:'LIVE'},{ticker:'UNDATED'},{ts:'2026-09-05',ticker:'SIM',mode:'BACKTEST'}];
  writeFileSync(join(dir,'track-record.json'),JSON.stringify({rows,by_source:[{n:2,hit20:0}],equity:[{d:'2026-09-05',v:.7}]}));
  for(const file of ['feed.json','radar-history.json'])writeFileSync(join(dir,file),JSON.stringify({items:rows.filter(r=>r.mode!=='BACKTEST')}));
  writeFileSync(join(dir,'ideas.json'),JSON.stringify({ideas:[{title:'Public author idea',signals:rows.filter(r=>r.mode!=='BACKTEST')}]}));
  execFileSync(process.env.DUCKY_TEST_PYTHON||'python3',['-c',"from public_access import sanitize_public_payloads; from pathlib import Path; from datetime import datetime,timezone; import sys; sanitize_public_payloads(Path(sys.argv[1]),datetime(2026,9,6,12,tzinfo=timezone.utc))",dir]);
  const doc=JSON.parse(readFileSync(join(dir,'track-record.json')));assert.deepEqual(doc.rows.map(r=>r.ticker),['OLD','SIM']);assert.equal(doc.rows[0].r20,-30);assert.equal(doc.by_source[0].n,2);assert.equal(doc.equity[0].v,.7);assert.equal(doc.access.delay_days,5);
  assert.equal(JSON.parse(readFileSync(join(dir,'feed.json'))).items.length,1);assert.equal(JSON.parse(readFileSync(join(dir,'radar-history.json'))).items.length,1);
  assert.equal(JSON.parse(readFileSync(join(dir,'ideas.json'))).ideas[0].signals[0].ticker,'OLD');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
