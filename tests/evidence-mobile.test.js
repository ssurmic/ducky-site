import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body class="page-app"></body></html>',{url:'https://ducky.test/app/#/stock/NVDA?tab=evidence'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';
const copy={...JSON.parse(readFileSync('i18n/en.json')),
 'app.evidence.mobile_carousel':'Evidence groups','app.evidence.mobile_slide':'card group',
 'app.evidence.mobile_position':'{n} of {total}','app.evidence.mobile_previous':'Previous evidence group',
 'app.evidence.mobile_next':'Next evidence group','app.evidence.mobile_swipe':'Swipe to compare views'};
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
const {mapView}=await import('../public/js/app/views/evidence.js');
const {closeModal}=await import('../public/js/app/ui.js');
function media(matches=true){
 const listeners=new Set();const query={matches,addEventListener:(name,fn)=>listeners.add(fn),removeEventListener:(name,fn)=>listeners.delete(fn)};
 window.matchMedia=()=>query;
 return {change(value){query.matches=value;for(const fn of listeners)fn();},get size(){return listeners.size;}};
}
function node(id,stance='support',author=id){return {id,kind:'creator',stance,title:{en:'Complete recorded view '+id},published_at:'2026-09-25',conditional:stance==='counter',evidence:[{id:'source:'+id,kind:'creator',creator_id:author,author:'Creator '+author,post_id:'abcdefghijk',point_id:'claim:'+id,source_url:'https://www.youtube.com/watch?v=abcdefghijk',published_at:'2026-09-25',observed_at:'2026-09-26T00:00:00Z',start_seconds:70,condition_text:'Only if the announced order is confirmed.',horizon_text:'Within one year.'}]};}
function fixture(){return {ticker:'NVDA',nodes:[node('bull1'),node('bull2'),node('bull3'),node('risk','counter'),node('fact','context')]};}
function attach(doc=fixture(),state){const root=mapView(doc,{state});document.body.append(root);return root;}
function geometry(root){
 const track=root.querySelector('.evidence-branches');Object.defineProperty(track,'clientWidth',{configurable:true,value:280});
 track.getBoundingClientRect=()=>({left:0,width:280});
 [...track.children].forEach((slide,i)=>{slide.getBoundingClientRect=()=>({left:i*264-track.scrollLeft,width:254});});return track;
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
test('phone retains four visible category controls and interleaves opposition before more support without duplicate records',()=>{
 const mq=media(),doc=fixture(),before=JSON.stringify(doc);let reads=0;globalThis.fetch=()=>{reads++;throw Error('Presentation must not fetch');};const root=attach(doc);
 try{
  assert.ok(root.classList.contains('has-mobile-evidence'));
  const filters=[...root.querySelectorAll('.evidence-filters button')];assert.equal(filters.length,4);
  assert.deepEqual(filters.map(button=>button.querySelector('.evidence-filter-count').textContent),['5','3','1','1']);
  const slides=[...root.querySelectorAll('.evidence-mobile-slide')];
  assert.deepEqual(slides.slice(0,3).map(slide=>slide.querySelector('.evidence-node').dataset.readingAnchor),['bull1','risk','fact']);
  assert.equal(root.querySelectorAll('.evidence-node').length,5);
  assert.equal(new Set([...root.querySelectorAll('.evidence-node')].map(card=>card.dataset.readingAnchor)).size,5);
  assert.ok(root.querySelector('.is-counter .evidence-condition'));
  root.querySelector('.evidence-filters .is-counter').click();assert.equal(root.querySelectorAll('.evidence-mobile-slide').length,1);
  assert.equal(root.querySelector('.evidence-filters .is-counter').getAttribute('aria-pressed'),'true');
  assert.equal(root.querySelector('.evidence-mobile-slide .evidence-node').dataset.readingAnchor,'risk');
  assert.equal(reads,0);assert.equal(JSON.stringify(doc),before);
 }finally{root.dispose();root.remove();assert.equal(mq.size,0);}
});
test('native scrolling and previous/next controls keep focus and restore the same group after a document refresh',async()=>{
 media();let root=attach(),restored;
 try{
  const track=geometry(root);const [previous,next]=root.querySelectorAll('.evidence-mobile-navigation button');
  assert.equal(previous.disabled,true);assert.equal(next.disabled,false);next.focus();next.click();
  assert.equal(document.activeElement,next);assert.equal(track.scrollLeft,264);assert.equal(root.querySelector('.evidence-mobile-position').textContent,'2 of 5');
  const state=root.readingState();assert.equal(state.mobileGroup,'counter:risk');
  restored=attach(fixture(),state);const newTrack=geometry(restored);await tick();assert.equal(newTrack.scrollLeft,264);
  newTrack.scrollLeft=528;newTrack.dispatchEvent(new window.Event('scroll'));
  assert.equal(restored.readingState().mobileGroup,'context:fact');
  const prev=restored.querySelector('.evidence-mobile-navigation button');prev.focus();prev.click();assert.equal(document.activeElement,prev);assert.equal(newTrack.scrollLeft,264);
 }finally{root.dispose();root.remove();restored?.dispose();restored?.remove();}
});
test('phone author groups retain full repeated receipts, exact source detail and return focus',()=>{
 media();const same=Array.from({length:5},(_,i)=>({...node('repeat'+i,'support','same'),title:{en:'The same complete viewpoint'}}));
 const root=attach({ticker:'NVDA',nodes:[...same,node('risk','counter')]});
 try{
  const group=root.querySelector('.evidence-author-group');assert.match(group.textContent,/5 records.*1 original source/s);
  assert.equal(group.querySelectorAll('.evidence-node').length,5);const history=group.querySelector('details');assert.ok(history);history.open=true;
  const source=group.querySelector('[data-reading-anchor="repeat4"] .evidence-node-open');source.focus();source.click();
  const dialog=document.querySelector('[role="dialog"]');assert.ok(dialog);assert.match(dialog.textContent,/Only if the announced order is confirmed/);
  assert.equal(dialog.querySelector('a[target="_blank"]').href,'https://www.youtube.com/watch?v=abcdefghijk&t=70');
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(document.activeElement,source);assert.equal(history.open,true);
  assert.equal(location.hash,'#/stock/NVDA?tab=evidence');
 }finally{closeModal();root.dispose();root.remove();}
});
test('responsive transitions preserve open author records and focused source while restoring the desktop three-lane DOM',()=>{
 const mq=media(),same=Array.from({length:4},(_,i)=>node('author'+i,'support','same'));
 const root=attach({ticker:'NVDA',nodes:[...same,node('risk','counter'),node('fact','context')]});
 try{
  root.querySelector('.evidence-map-actions button:last-child').click();
  const details=root.querySelector('.evidence-author-more');details.open=true;
  const source=root.querySelector('[data-reading-anchor="author3"] .evidence-node-open');source.focus();
  mq.change(false);assert.equal(root.classList.contains('has-mobile-evidence'),false);assert.equal(root.querySelectorAll('.evidence-mobile-slide').length,0);
  assert.deepEqual([...root.querySelectorAll('.evidence-group')].map(group=>group.className),['evidence-group is-support','evidence-group is-context','evidence-group is-counter']);
  assert.equal(root.querySelector('.evidence-author-more').open,true);assert.equal(document.activeElement.dataset.readingKey,'NVDA:node:author3');
  mq.change(true);assert.equal(root.querySelector('.evidence-author-more').open,true);assert.equal(document.activeElement.dataset.readingKey,'NVDA:node:author3');
 }finally{root.dispose();root.remove();assert.equal(mq.size,0);}
});
test('an empty selected category reports no matching records without creating an empty navigation carousel',()=>{
 media();const root=attach({ticker:'NVDA',nodes:[node('only')]});
 try{root.querySelector('.evidence-filters .is-counter').click();assert.equal(root.querySelectorAll('.evidence-mobile-slide').length,0);assert.equal(root.querySelector('.evidence-branches').textContent,copy['app.evidence.no_match']);assert.equal(root.querySelector('.evidence-mobile-navigation').hidden,true);}
 finally{root.dispose();root.remove();}
});
