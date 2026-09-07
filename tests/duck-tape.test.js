import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {snapshotQuote,paintQuote,mountDuckTape} from '../public/js/duck-tape.js';

const valid={ticker:'NOK',snapshot:{ticker:'NOK',ok:true,spot:10.03},built_at:'2026-09-01T20:30:00Z',snapshot_epoch:'2026-09-01:CLOSED'};
test('quote requires a matching identity, actual price, and dated source snapshot',()=>{
 assert.equal(snapshotQuote(valid,'NOK').price,10.03);
 for(const doc of [null,{}, {...valid,ticker:'NVDA'}, {...valid,snapshot:{...valid.snapshot,ticker:'NVDA'}},
  {...valid,snapshot:{...valid.snapshot,spot:0}}, {...valid,snapshot:{...valid.snapshot,spot:NaN}},
  {...valid,built_at:null}, {...valid,snapshot_epoch:'2026-09-04:CLOSED'}, {...valid,snapshot_epoch:'LIVE'}]) assert.equal(snapshotQuote(doc,'NOK'),null);
 const future=new Date(Date.now()+300000).toISOString();
 assert.equal(snapshotQuote({...valid,built_at:future,snapshot_epoch:future.slice(0,10)+':RTH'},'NOK'),null);
});

function setup(){
 const dom=new JSDOM('<body><section data-duck-tape data-close="Close" data-snapshot="Snapshot" data-pause="Pause flight" data-resume="Resume flight"><button data-motion-toggle hidden>Pause flight</button>'+[0,1].map(()=>'<a data-quote="NOK" data-built="2026-09-01T20:30:00Z"><span data-quote-price>$10.03</span><small data-quote-date>2026-09-01 · Close</small></a>').join('')+'</section></body>',{pretendToBeVisual:true});
 return {dom,root:dom.window.document.querySelector('section')};
}
test('both visual copies update together, and older responses cannot rewind a quote',()=>{
 const {dom,root}=setup();
 assert.equal(paintQuote(root,{ticker:'NOK',price:9,built:'2026-08-31T20:00:00Z',epoch:'2026-08-31:CLOSED'}),false);
 assert.deepEqual([...root.querySelectorAll('[data-quote-price]')].map(n=>n.textContent),['$10.03','$10.03']);
 paintQuote(root,{ticker:'NOK',price:11.04,built:'2026-09-02T20:00:00Z',epoch:'2026-09-02:CLOSED'});
 assert.deepEqual([...root.querySelectorAll('[data-quote-price]')].map(n=>n.textContent),['$11.04','$11.04']);
 assert.deepEqual([...root.querySelectorAll('[data-quote-date]')].map(n=>n.textContent),['2026-09-02 · Close','2026-09-02 · Close']);dom.window.close();
});
test('unavailable quotes preserve dated fallback, duplicate cards make one request, and motion is pausable',async()=>{
 const {dom,root}=setup();const old={window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch};
 globalThis.window=dom.window;globalThis.document=dom.window.document;dom.window.DUCKY={API_BASE:'https://api.example.test'};
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});throw new Error('unavailable');};
 let cleanup;
 try {
  cleanup=mountDuckTape(root);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,1);assert.equal(calls[0].options.credentials,'omit');
  assert.equal(root.querySelector('[data-quote-price]').textContent,'$10.03');
  const button=root.querySelector('button');assert.equal(button.hidden,false);button.click();
  assert.equal(button.textContent,'Resume flight');assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(dom.window.document.body.hasAttribute('data-home-paused'),true);
  const restored=new dom.window.PageTransitionEvent('pagehide',{persisted:true});dom.window.dispatchEvent(restored);button.click();assert.equal(button.textContent,'Pause flight');
 } finally {cleanup?.();dom.window.close();for(const [key,value] of Object.entries(old)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
