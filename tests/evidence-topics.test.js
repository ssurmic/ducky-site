import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/#/evidence/NVDA'});
for(const key of ['window','document','Node','location','history','localStorage','CustomEvent','Event'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const {topicGroup,topicGroups}=await import('../public/js/app/evidence-topics.js');
const {mapView}=await import('../public/js/app/views/evidence.js');

const stamp='2026-09-10T00:00:00Z';
const fact=(id,topic,stance='context',kind='fact')=>({id:'se-node:'+id,kind,stance,priority:'market',intent:'fact',title:{en:'Fact '+id,zh:'事实 '+id},reason:{en:'Reason '+id,zh:'原因 '+id},
  published_at:stamp,observed_at:stamp,recorded_at:stamp,evidence:[{id:'e'+id,kind:'fact',topic,data:{},observed_at:stamp}]});
const view=(id,author,post,stance='support')=>({id:'se-node:'+id,kind:'creator',stance,priority:'direct',intent:'view',title:{en:'View '+id,zh:'观点 '+id},reason:{en:'Because '+id,zh:'因为 '+id},
  published_at:stamp,observed_at:stamp,recorded_at:stamp,evidence:[{id:'c'+id,kind:'creator',creator_id:author,post_id:post,author:author,platform:'youtube',source_url:'https://www.youtube.com/watch?v='+post,published_at:stamp,observed_at:stamp}]});
const doc=nodes=>({ticker:'NVDA',status:'ready',recorded_at:stamp,checked_at:stamp,nodes,analysis_status:'pending'});
const facts=[fact(1,'price'),fact(2,'technicals'),fact(3,'rsi_change'),fact(4,'price_gaps'),fact(5,'price_position'),
  fact(6,'ownership_disclosure'),fact(7,'ownership_disclosure'),fact(8,'ownership_disclosure',undefined,'event'),fact(9,'reddit_attention')];

test('records fall into stable topic groups; creator views keep their author grouping',()=>{
 assert.equal(topicGroup(fact(1,'technicals')),'price');assert.equal(topicGroup(fact(2,'ownership_disclosure')),'filings');
 assert.equal(topicGroup(fact(3,'anything','context','event')),'filings');assert.equal(topicGroup(fact(4,'reddit_attention')),'attention');
 assert.equal(topicGroup(fact(5,'stock_vs_sector_etf')),'relative');assert.equal(topicGroup(fact(6,'option_concentrations')),'options');
 assert.equal(topicGroup(fact(7,'macro_background')),'macro');assert.equal(topicGroup(fact(8,'mystery')),'other');assert.equal(topicGroup(view(9,'a','p1')),'views');
 assert.deepEqual(topicGroups(facts).map(g=>[g.key,g.nodes.length]),[['filings',3],['price',5],['attention',1]]);
 assert.deepEqual(topicGroups([fact(1,'price'),fact(2,'reddit_attention'),fact(3,'price')]).map(g=>g.nodes.map(n=>n.id)),[['se-node:1','se-node:3'],['se-node:2']]);
});

test('a long facts lane folds by topic after expansion, retaining every record and count',()=>{
 const root=mapView(doc([view(20,'a','p1'),view(21,'b','p2'),view(22,'c','p3','counter'),...facts]));document.body.append(root);
 assert.equal(root.querySelectorAll('.evidence-node').length,6);
 assert.equal(root.querySelector('.evidence-group.is-context .evidence-group-count').textContent,'9');
 [...root.querySelectorAll('button')].find(b=>b.textContent==='Show all viewpoints').click();
 assert.equal(root.querySelectorAll('.evidence-node').length,12);
 const groups=[...root.querySelectorAll('.evidence-group.is-context .evidence-topic-group')];
 assert.deepEqual(groups.map(g=>g.dataset.topic),['filings','price','attention']);
 assert.deepEqual(groups.map(g=>g.querySelector('.evidence-topic-count').textContent),['3','5','1']);
 assert.deepEqual(groups.map(g=>g.querySelector('.evidence-topic-heading span').textContent),['Filings & ownership','Price & technicals','Discussion']);
 const price=groups[1];
 assert.equal(price.querySelectorAll(':scope > .evidence-node').length,3);
 assert.equal(price.querySelector('.evidence-topic-more summary').textContent,'Show 2 more records');
 assert.equal(price.querySelectorAll('.evidence-topic-more .evidence-node').length,2);
 assert.equal(price.querySelector('.evidence-topic-more').open,false);
 assert.equal(root.querySelectorAll('.evidence-author-group').length,3);
 const numbers=[...root.querySelectorAll('.evidence-node-number')].map(n=>n.textContent);
 assert.equal(new Set(numbers).size,12);
 root.dispose();root.remove();
});

test('expansion is gradual: a step of twelve, then everything, with no record lost',()=>{
 const many=Array.from({length:30},(_,i)=>fact(100+i,i%2?'technicals':'ownership_disclosure'));
 const root=mapView(doc(many));document.body.append(root);
 const step=root.querySelector('[data-reading-key="NVDA:show-more"]'),all=root.querySelector('[data-reading-key="NVDA:show-all"]');
 assert.equal(root.querySelectorAll('.evidence-node').length,6);assert.equal(step.hidden,false);assert.equal(all.hidden,false);
 assert.equal(step.textContent,'Show 12 more');
 step.click();assert.equal(root.querySelectorAll('.evidence-node').length,18);
 assert.match(root.querySelector('.evidence-map-footer p').textContent,/Showing 18 of 30/);
 assert.equal(step.hidden,true);assert.equal(all.hidden,false);
 all.click();assert.equal(root.querySelectorAll('.evidence-node').length,30);assert.equal(all.hidden,true);
 assert.equal(root.querySelectorAll('.evidence-group').length,3);
 root.dispose();root.remove();
});

test('focusing a card highlights records from the same author or source and clears on leave',()=>{
 const root=mapView(doc([view(1,'alpha','p1'),view(2,'alpha','p2'),view(3,'beta','p3'),view(4,'gamma','p4','counter'),fact(5,'price'),fact(6,'technicals')]));document.body.append(root);
 const cards=[...root.querySelectorAll('.evidence-node')],first=cards.find(c=>c.dataset.readingAnchor==='se-node:1'),second=cards.find(c=>c.dataset.readingAnchor==='se-node:2'),other=cards.find(c=>c.dataset.readingAnchor==='se-node:3');
 assert.equal(first.dataset.author,'alpha');assert.equal(first.dataset.sourceKey,'alpha:p1');
 first.dispatchEvent(new window.Event('pointerenter'));
 assert.equal(second.classList.contains('is-related'),true);assert.equal(other.classList.contains('is-related'),false);
 assert.equal(first.classList.contains('is-origin'),true);assert.equal(root.querySelector('.evidence-map').classList.contains('has-focus'),true);
 first.dispatchEvent(new window.Event('pointerleave'));
 assert.equal(second.classList.contains('is-related'),false);assert.equal(root.querySelector('.evidence-map').classList.contains('has-focus'),false);
 other.dispatchEvent(new window.Event('focusin'));
 assert.equal(root.querySelector('.evidence-map').classList.contains('has-focus'),false);
 assert.equal(root.querySelectorAll('.is-related').length,0);
 root.dispose();root.remove();
});

test('the center card shows retained-record balance across the three lanes',()=>{
 const root=mapView(doc([view(1,'a','p1'),view(2,'b','p2'),view(3,'c','p3','counter'),...facts]));document.body.append(root);
 assert.deepEqual([...root.querySelectorAll('.evidence-balance-legend span')].map(n=>n.textContent),['2','9','1']);
 assert.match(root.querySelector('.evidence-balance').getAttribute('aria-label'),/Bullish 2 · Facts & context 9 · Bearish 1/);
 assert.ok(root.querySelector('.evidence-balance-bar .is-context'));
 root.dispose();root.remove();
});

test('after expansion, authors who only mention the stock fold together and keep every record',()=>{
 const mention=(id,author,post)=>({...view(id,author,post,'context'),intent:'mention',basis:'verified_mention_no_direction'});
 const root=mapView(doc([view(20,'a','p1'),view(21,'b','p2','counter'),view(22,'c','p3','context'),mention(30,'m1','q1'),mention(31,'m2','q2'),mention(32,'m3','q3'),mention(33,'m3','q4'),...facts]));document.body.append(root);
 assert.equal(root.querySelectorAll('.evidence-node').length,6);assert.equal(root.querySelector('.evidence-mentions'),null);
 [...root.querySelectorAll('button')].find(b=>b.textContent==='Show all viewpoints').click();
 const fold=root.querySelector('.evidence-group.is-context .evidence-mentions');
 assert.ok(fold);assert.equal(fold.open,false);
 assert.equal(fold.querySelector('summary').textContent,'Mentions without a stated direction · 4 records · 3 authors');
 assert.equal(fold.querySelectorAll('.evidence-author-group').length,3);assert.equal(fold.querySelectorAll('.evidence-node').length,4);
 assert.ok(root.querySelector('.evidence-group.is-context > .evidence-group-nodes > .evidence-author-group[data-author="c"]'));
 assert.equal(root.querySelectorAll('.evidence-node').length,16);
 root.dispose();root.remove();
});
