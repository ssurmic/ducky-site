import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('',{url:'https://ducky.test/app/'});
globalThis.window=dom.window;
const store=await import('../public/js/app/store.js');
const cache=await import('../public/js/app/read-cache.js');
const item={ticker:'NVDA',status:'ready',as_of:'2026-09-09',overview:{en:'Conditional finding',zh:'有条件的观点',citations:['a']},sources:[{id:'a'}]};
const list={items:[item],watchlist_count:1};
const graph={ticker:'NVDA',nodes:[{id:'a'}],analysis_status:'ready',analysis_generated_at:'2026-09-09',analysis:{overview:item.overview,sections:[]}};
function setup(){store.bumpEpoch();store.set('token','test-token');store.set('me',{user_id:12,tier:'pro'});store.set('watchlist',['NVDA']);cache.clear();}

test('saved responses are independent copies with original dates; no browser persistence',()=>{
 setup();cache.remember('/me/stock-research',list);
 const first=cache.peek('/me/stock-research');first.items[0].overview.en='Changed by caller';
 assert.equal(cache.peek('/me/stock-research').items[0].overview.en,'Conditional finding');
 assert.equal(cache.peek('/me/stock-research').items[0].as_of,'2026-09-09');
 assert.equal(window.localStorage.length,0);assert.equal(window.sessionStorage.length,0);
 for(const path of ['/me','/kol/feed','/evidence/NVDA?version=old','/public/anything']){cache.remember(path,list);assert.equal(cache.peek(path),null);}
});

test('logout, epoch, token and effective-access changes discard private previews',()=>{
 for(const change of [()=>store.bumpEpoch(),()=>store.set('token','another'),()=>store.set('me',null),
  ()=>store.set('me',{user_id:13,tier:'pro'}),()=>store.set('me',{user_id:12,tier:'free'})]){
  setup();cache.remember('/me/stock-research',list);change();assert.equal(cache.peek('/me/stock-research'),null);
 }
});

test('memory preview expires and a backwards clock cannot extend it',()=>{
 setup();const original=Date.now;let now=1000000;Date.now=()=>now;
 try{
  cache.remember('/me/stock-research',list);now+=300001;assert.equal(cache.peek('/me/stock-research'),null);
  cache.remember('/me/stock-research',list);now--;assert.equal(cache.peek('/me/stock-research'),null);
 }finally{Date.now=original;}
});

test('an authoritative map withdrawal replaces the list paragraph and evicts stale stock details',()=>{
 setup();cache.remember('/me/stock-research',list);
 cache.remember('/stock-research/NVDA',{ticker:'NVDA',price:{price:100},evidence:graph});
 cache.remember('/evidence/NVDA',{ticker:'NVDA',nodes:[],analysis:null,analysis_status:'source_changed'});
 assert.equal(cache.peek('/me/stock-research').items[0].overview,null);
 assert.equal(cache.peek('/me/stock-research').items[0].status,'source_changed');
 assert.equal(cache.peek('/stock-research/NVDA').evidence.analysis,null);
});

test('a changed overview evicts older full maps and a malformed response cannot replace a readable one',()=>{
 setup();cache.remember('/me/stock-research',list);cache.remember('/evidence/NVDA',graph);
 cache.remember('/me/stock-research',{items:[{ticker:'NVDA',status:'withdrawn',sources:[]}]});
 assert.equal(cache.peek('/evidence/NVDA'),null);
 cache.remember('/me/stock-research',{error:'unavailable'});
 assert.equal(cache.peek('/me/stock-research').items[0].status,'withdrawn');
});

test('membership updates retain the matching received list but removed tickers cannot return',()=>{
 setup();cache.remember('/watchlist',{items:['NVDA','AMD'],overview:{items:[]}});
 store.set('watchlist',['NVDA','AMD']);assert.ok(cache.peek('/watchlist'));
 cache.remember('/me/stock-research',list);store.set('watchlist',['AMD']);
 assert.equal(cache.peek('/watchlist'),null);assert.equal(cache.peek('/me/stock-research'),null);
});
