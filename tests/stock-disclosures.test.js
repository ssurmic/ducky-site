import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><main></main><div id="modal"></div></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const {disclosureHref}=await import('../public/js/app/stock-disclosures.js');
const {mount}=await import('../public/js/app/views/stock.js');
const {archivePath}=await import('../public/js/app/views/boards.js');
const {signalCard}=await import('../public/js/app/watchlist-signals.js');
const store=await import('../public/js/app/store.js');
const params=href=>new URLSearchParams(href.split('?')[1]);

test('stock disclosure destinations select the ticker and complete filing archive without seven-day or purchase-only defaults',()=>{
 for(const [kind,board,kinds]of [['insider','insider','insider,cluster'],['funds','funds','13f'],['politicians','political','political']]){
  const query=params(disclosureHref('nvda',kind));
  assert.equal(query.get('ticker'),'NVDA');assert.equal(query.get('board'),board);assert.equal(query.get('mode'),'archive');assert.equal(query.get('content'),'all');assert.equal(query.get('purchases'),'all');
  assert.equal(query.has('start'),false);assert.equal(query.has('direction'),false);
  const request=new URL(archivePath(Object.fromEntries(query),null,true),'https://ducky.test');
  assert.equal(request.searchParams.get('kind'),kinds);assert.equal(request.searchParams.get('ticker'),'NVDA');assert.equal(request.searchParams.get('purchases'),'all');
 }
 assert.equal(disclosureHref('bad/ticker','funds'),'#/boards');
});

test('overview and metrics expose filing links outside collapsed or hidden sections without extra reads or follows',async()=>{
 for(const tab of ['overview','metrics']){
  store.bumpEpoch();store.set('me',{user_id:1,tier:'pro'});store.set('token','synthetic');store.set('watchlist',[]);
  const calls=[];globalThis.fetch=async(url,options)=>{calls.push([url,options.method]);return Response.json(url.startsWith('/stock-research/')?{ticker:'NVDA',price:null,evidence:{nodes:[],analysis_status:'pending'}}:url.startsWith('/snapshot/')?{ticker:'NVDA',snapshot:{ok:true}}:{bars:[]});};
  const root=document.querySelector('main');root.replaceChildren();const dispose=await mount(root,{ticker:'NVDA',query:new URLSearchParams({tab,from:'explore'})});
  const nav=root.querySelector('.stock-disclosure-links');assert.ok(nav);assert.equal(nav.closest('details,[hidden]'),null);
  assert.deepEqual([...nav.querySelectorAll('a')].map(a=>params(a.getAttribute('href')).get('board')),['insider','funds']);
  assert.equal(calls.some(([url])=>url.includes('radar')),false);assert.ok(calls.every(([,method])=>method==='GET'));assert.deepEqual(store.get('watchlist'),[]);dispose();
 }
});

test('watchlist filing dialogs use the same exact archive categories even when their local preview is empty',()=>{
 for(const kind of ['insider','funds','politicians']){
  const card=signalCard(kind,{},'NVDA');
  assert.ok([...card.querySelectorAll('a')].some(a=>a.getAttribute('href')===disclosureHref('NVDA',kind)));
 }
});
