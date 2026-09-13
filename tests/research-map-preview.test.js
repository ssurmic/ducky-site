import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<html data-lang="en"><body><div class="app-shell"><main class="app-main"></main></div><div id="modal" hidden></div></body></html>',
  {url:'https://ducky.test/en/research-map-preview/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json')))
  .filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));
document.body.append(strings);
const snapshot=JSON.parse(readFileSync('public/home-signals.json'));
const {publicMap,mountPublicMap,appLink}=await import('../public/js/app/research-map-preview.js');
const {mapView}=await import('../public/js/app/views/evidence.js');
const {topicGroup}=await import('../public/js/app/evidence-topics.js');
const {closeModal}=await import('../public/js/app/ui.js');
const store=await import('../public/js/app/store.js');

test('public adapter preserves selected facts without inventing identity, approval or coverage',()=>{
  const before=JSON.stringify(snapshot),doc=publicMap(snapshot),stock=snapshot.stocks.find(item=>item.ticker==='NVDA');
  assert.deepEqual(doc.display_price,{price:stock.close,price_session:stock.close_date});
  assert.equal(doc.status,undefined);assert.equal(doc.coverage,undefined);assert.equal(doc.analysis,undefined);
  assert.equal(doc.recorded_at,undefined);
  for(const [i,node]of doc.nodes.entries()){
    const row=stock.items[i],source=node.evidence[0];
    assert.deepEqual(node.title,row.title);assert.equal(node.stance,row.stance);
    assert.equal(source.published_at,row.date);assert.equal(source.source_url,row.source_url);
    assert.deepEqual(source.source_label,row.source_label);
    for(const key of ['observed_at','verification','source_hash','creator_id','post_id'])assert.equal(source[key],undefined);
  }
  assert.equal(JSON.stringify(snapshot),before);
});

test('current map filters, original-source dialogs and price details work without API or account writes',()=>{
  const root=document.querySelector('main'),before=JSON.stringify(store.get());
  let requests=0;const prior=globalThis.fetch;
  globalThis.fetch=()=>{requests++;throw Error('preview must not call an API');};
  const view=mountPublicMap(root,snapshot);
  try{
    assert.equal(view.querySelector('.evidence-analysis'),null);
    assert.equal(view.querySelector('.evidence-coverage'),null);
    assert.equal(view.querySelector('.evidence-ordering'),null);
    assert.equal(view.querySelector('.evidence-share-trigger'),null);
    assert.match(view.querySelector('.evidence-price').textContent,/218\.29/);
    assert.match(view.querySelector('.evidence-price').textContent,/2026-09-11/);
    const filters=[...view.querySelectorAll('.evidence-filters button')];
    filters.find(button=>button.classList.contains('is-counter')).click();
    assert.ok([...view.querySelectorAll('.evidence-node')].every(node=>node.classList.contains('is-counter')));
    assert.equal(view.querySelector('.evidence-share-trigger'),null);
    filters.find(button=>button.classList.contains('is-all')).click();
    assert.equal(view.querySelector('.evidence-share-trigger'),null);
    const card=view.querySelector('.evidence-node'),id=card.dataset.readingAnchor;
    const original=publicMap(snapshot).nodes.find(node=>node.id===id).evidence[0];
    card.querySelector('.evidence-node-open').click();
    const link=[...document.querySelectorAll('#modal a[href]')].find(anchor=>anchor.href===original.source_url);
    assert.ok(link);assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);
    assert.match(document.querySelector('#modal').textContent,new RegExp(original.published_at));
    assert.equal(document.querySelector('.evidence-detail>button'),null);
    closeModal();
    view.querySelector('.evidence-price').click();
    assert.match(document.querySelector('#modal').textContent,/2026-09-11/);
    const chart=document.querySelector('#modal a[href^="#/chart/"]');
    appLink({target:chart},'/en/app/');
    assert.equal(chart.href,'https://ducky.test/en/app/#/chart/NVDA');assert.equal(chart.target,'_blank');
    assert.equal(requests,0);assert.equal(JSON.stringify(store.get()),before);
  }finally{closeModal();view.dispose();root.replaceChildren();globalThis.fetch=prior;}
});

test('ordinary application maps retain card and source-dialog sharing by default',()=>{
  const root=document.querySelector('main'),view=mapView(publicMap(snapshot),{showAnalysis:false});
  root.replaceChildren(view);
  try{
    assert.equal(view.querySelectorAll('.evidence-share-trigger').length,view.querySelectorAll('.evidence-node').length);
    view.querySelector('.evidence-node-open').click();
    assert.equal(document.querySelector('.evidence-detail>button').textContent,JSON.parse(strings.textContent)['share.title']);
  }finally{closeModal();view.dispose();root.replaceChildren();}
});

test('only explicitly labelled public SEC 13F records receive the filing topic',()=>{
  const doc=publicMap(snapshot),records=doc.nodes.filter(node=>node.kind==='record');
  assert.equal(records.length,2);
  for(const node of records){
    assert.equal(node.topic,'13f');assert.equal(node.evidence[0].topic,'13f');
    assert.equal(topicGroup(node),'filings');assert.equal(node.stance,'context');
  }
  const other=structuredClone(snapshot),rows=other.stocks.find(stock=>stock.ticker==='NVDA').items;
  rows.find(row=>row.kind==='record').source_label.en='Other record';
  rows.find(row=>row.kind==='creator').source_label.en='SEC 13F';
  const adapted=publicMap(other);
  assert.equal(adapted.nodes.find(node=>node.kind==='record').topic,undefined);
  assert.equal(topicGroup(adapted.nodes.find(node=>node.kind==='record')),'other');
  assert.equal(adapted.nodes.find(node=>node.kind==='creator').topic,undefined);
});

test('invalid public source fails closed rather than making a partly fabricated map',()=>{
  const bad=structuredClone(snapshot);bad.stocks[0].items[0].source_url='javascript:alert(1)';
  assert.throws(()=>publicMap(bad),/invalid_public_map/);
});
