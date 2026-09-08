import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<div id="view"></div><script id="ducky-strings"></script>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
document.querySelector('script').textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const store=await import('../public/js/app/store.js');
const {safeTarget}=await import('../public/js/app/login-target.js');
const {selectNavigation}=await import('../public/js/app/navigation.js');
const {parse}=await import('../public/js/app/router.js');
const opportunities=await import('../public/js/app/views/opportunities.js');
const {quoteModel,mountTour,mountDuck}=await import('../public/js/desk.js');
const response=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,0));};

test('new destinations survive sign-in and radar links select one matching category',()=>{
 for(const name of ['opportunities','degen','vibe','market','macro','screens']){
  assert.equal(parse('#/'+name).name,name);assert.equal(safeTarget('#/'+name),'#/'+name);
 }
 assert.equal(parse('#/ducky').name,'evidence');assert.equal(safeTarget('#/ducky'),'#/evidence');
 assert.equal(safeTarget('#/boards?board=insider&token=secret'),'#/boards?board=insider');
 const shell=new JSDOM(readFileSync('dist/app/index.html','utf8')).window.document;
 const nav=document.importNode(shell.querySelector('.app-nav'),true);document.body.append(nav);
 selectNavigation('boards',new URLSearchParams('board=insider'));
 assert.ok(nav.querySelector('.nav-desktop-tree[data-group=boards]').open);
 assert.equal(nav.querySelector('.nav-desktop-tree[data-group=boards] [aria-current=page]').dataset.board,'insider');
 selectNavigation('degen');assert.equal(nav.querySelector('[data-route=degen]'),null);
 assert.ok(nav.querySelector('[data-route=vibe]').classList.contains('on'));
 assert.equal(nav.querySelector('.nav-desktop-tree[data-group=boards] [aria-current=page]'),null);nav.remove();
});
test('discovery shows stocks outside the watchlist, preserving zero and unknown metrics',()=>{
 const rows=[{ticker:'OWN'},{ticker:'NEW'}];
 assert.equal(opportunities.selectCandidates(rows,'all',['OWN']).length,2);
 assert.deepEqual(opportunities.selectCandidates(rows,'new',['OWN']),[{ticker:'NEW'}]);
 assert.deepEqual(opportunities.selectCandidates(rows,'watchlist',['OWN']),[{ticker:'OWN'}]);
 const card=opportunities.candidateCard({ticker:'NEW',technical:{rsi_d:0,dd_pct:0,iv_hv:null},relative:{status:'unavailable',excess20:null}});
 assert.ok(card.textContent.includes('0.0'));assert.ok(card.textContent.includes(copy['app.opportunities.peer_missing']));
 assert.ok(!card.textContent.includes('0.0 pp'));
 assert.equal(opportunities.candidateCard({ticker:'NEW'},null).querySelector('.chip'),null,
  'an unavailable watchlist cannot label a stock as outside it');
});
test('free visitors do not fetch current candidates and stale results are not promoted',async()=>{
 store.set('me',{tier:'free'});let calls=[];globalThis.fetch=async url=>{calls.push(String(url));return response({});};
 let root=document.createElement('div');let cleanup=await opportunities.mount(root);
 assert.equal(calls.length,0);assert.ok(root.querySelector('a[href="#/billing"]'));cleanup();
 store.set('me',{tier:'pro'});
 globalThis.fetch=async(url,opts)=>{
  calls.push(String(url));
  if(String(url).endsWith('/screens/preview')){assert.equal(JSON.parse(opts.body).config.scope,'covered');return response({status:'stale',items:[{ticker:'STALE'}]});}
  return response({items:[],sectors:[]});
 };
 root=document.createElement('div');cleanup=await opportunities.mount(root);
 assert.ok(!root.querySelector('.opportunity-card'));assert.ok(!root.textContent.includes('STALE'));cleanup();
});
test('a late discovery result cannot populate a new session',async()=>{
 store.set('me',{tier:'pro'});let resolve;
 globalThis.fetch=async url=>String(url).endsWith('/screens/preview')?new Promise(r=>resolve=r):response({items:[],sectors:[]});
 const root=document.createElement('div'),pending=opportunities.mount(root);await flush();
 store.bumpEpoch();resolve(response({status:'ready',items:[{ticker:'PRIVATE'}]}));const cleanup=await pending;
 assert.ok(!root.textContent.includes('PRIVATE'));cleanup();
});
test('price decoration rejects malformed, mismatched and missing quotes without fabricating zeros',()=>{
 const doc={ticker:'AAA',last_d:'2026-09-04',bars:[{t:'2026-09-03',c:10},{t:'2026-09-04',c:9}]};
 assert.equal(quoteModel(doc,'AAA').price,'9.00');assert.equal(quoteModel(doc,'BBB'),null);
 for(const c of [null,0,-2,NaN,true])assert.equal(quoteModel({...doc,bars:[{t:'2026-09-04',c}]},'AAA'),null);
 assert.equal(quoteModel({...doc,bars:[...doc.bars,doc.bars[1]]},'AAA'),null);
});
test('homepage tour opens each named tool and keeps pricing visible in both languages',()=>{
 for(const prefix of ['','en/']){
  const page=new JSDOM(readFileSync(`dist/${prefix}index.html`,'utf8')).window.document;
  const tour=page.querySelector('[data-product-tour]'),cleanup=mountTour(tour);
  for(const button of tour.querySelectorAll('[data-tool]')){
   button.click();const panel=tour.querySelector('.desk-feature:not([hidden])');
   assert.equal(panel.id,button.getAttribute('aria-controls'));
   assert.ok(panel.querySelector(`a[href="/${prefix}app/#/${button.dataset.tool}"]`));
  }
  assert.equal(page.querySelectorAll('#features').length,1);
  assert.equal(page.querySelector('#pricing').closest('details'),null);cleanup();
 }
});
test('mobile and reduced-motion duck is steady while its greeting stays keyboard accessible',async()=>{
 window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 const page=new JSDOM(readFileSync('dist/index.html','utf8')).window.document,root=document.importNode(page.querySelector('[data-duck-orbit]'),true);
 document.body.append(root);const cleanup=mountDuck(root,{fetcher:async()=>{throw Error('offline');}});
 assert.ok(root.classList.contains('motion-paused'));assert.equal(root.querySelector('[data-motion-toggle]').hidden,true);
 root.querySelector('.desk-duck').click();assert.equal(root.querySelector('[data-duck-message]').textContent,root.dataset.reply);
 await flush();assert.ok(root.querySelector('[data-quote-price]').textContent.startsWith('$'));
 cleanup();root.remove();
});
