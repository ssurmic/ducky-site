import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountStockDemo} from '../public/js/home-demo.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(fetcher){
 const dom=new JSDOM(readFileSync('dist/index.html','utf8'),{url:'https://duckybot.app'});
 globalThis.document=dom.window.document;
 const root=document.querySelector('[data-home-demo]');
 return {dom,root,dispose:mountStockDemo(root,fetcher),submit(){root.querySelector('form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));}};
}
test('stock demo loads no data before intent; gates ticker, age and unsafe source links',async()=>{
 let calls=0;
 const old=new Date(Date.now()-8*86400000).toISOString();
 const f=fixture(async(url,opts)=>{calls++;assert.equal(opts.credentials,'omit');assert.equal(new URL(url).searchParams.get('ticker'),'NVDA');return {ok:true,json:async()=>({items:[
  {ticker:'NVDA',ts:old,summary:'Actual dated event',source_url:'https://www.sec.gov/Archives/example'},
  {ticker:'NVDA',ts:old,summary:'No source saved',source_url:'javascript:alert(1)'},
  {ticker:'NVDA',ts:new Date().toISOString(),summary:'Paid current event'},
  {ticker:'AMD',ts:old,summary:'Wrong stock'},
  {ticker:'NVDA',ts:'invalid',summary:'Unknown date'},
 ]})};});
 assert.equal(calls,0);f.submit();await tick();
 assert.equal(f.root.querySelectorAll('.demo-record').length,2);
 assert.equal(f.root.querySelectorAll('.demo-record a').length,1);
 assert.ok(!f.root.textContent.includes('Paid current event'));
 assert.ok([...f.root.querySelectorAll('[data-demo-links] a')].every(a=>a.href.includes('NVDA')));
 f.dispose();
});
test('editing the stock cancels an in-flight context and market failures stay retryable',async()=>{
 let resolve, count=0;
 const f=fixture(async(url)=>{if(url.includes('market-preview')){count++;throw Error('offline');}return new Promise(r=>resolve=r);});
 f.submit();
 f.root.querySelector('input').value='ORCL';f.root.querySelector('input').dispatchEvent(new f.dom.window.Event('input'));
 resolve({ok:true,json:async()=>({items:[]})});await tick();
 assert.equal(f.root.querySelector('[data-demo-links]').hidden,true);
 const button=f.root.querySelector('[data-demo-market-load]');button.click();await tick();
 assert.equal(button.disabled,false);assert.equal(button.isConnected,true);button.click();await tick();assert.equal(count,2);
 f.dispose();
});
test('historical filings retain day precision and distinguish collection from publication',async()=>{
 const old=new Date(Date.now()-10*86400000).toISOString().slice(0,10);
 const f=fixture(async()=>({ok:true,json:async()=>({items:[{ticker:'NVDA',ts:old+'T00:00:00Z',provenance:'INGESTED',observed_at:new Date().toISOString(),extra:{date_precision:'day'},summary:'Quarter-end holdings'}]})}));
 f.submit();await tick();const card=f.root.querySelector('.demo-record');
 assert.ok(card.textContent.includes('披露日期 '+old));
 assert.ok(card.textContent.includes('Ducky 收录于'));
 assert.ok(!card.textContent.includes(old+' 00:00'));
 f.dispose();
});
