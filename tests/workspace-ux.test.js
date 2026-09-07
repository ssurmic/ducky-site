import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html lang="en" data-lang="en"><body><div class="app-shell"><main class="app-main"><button id="day">Day</button></main></div><div id="modal" hidden></div></body></html>',{url:'https://ducky.test/app/#/calendar'});
for(const name of ['window','document','Node','location','history'])globalThis[name]=dom.window[name];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {modal,closeModal,el}=await import('../public/js/app/ui.js');
const {renderMarketContext}=await import('../public/js/app/views/market-context.js');
const {filterPosts,conciseSummary}=await import('../public/js/app/views/creators.js');

test('dialog traps focus, closes by Escape or backdrop and restores the original scroll and trigger',()=>{
 const main=document.querySelector('main'),opener=document.querySelector('#day');main.scrollTop=380;opener.focus();
 modal('September 7',el('div',el('a',{href:'https://example.com'},'Source'),el('details',el('summary','Evidence'),el('a',{href:'https://example.com/hidden'},'Hidden source'))));
 const host=document.querySelector('#modal'),first=host.querySelector('.modal-close'),last=host.querySelector('.modal-actions button');
 assert.equal(document.activeElement,first);assert.equal(document.querySelector('.app-shell').inert,true);
 first.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(document.activeElement,last);
 last.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(document.activeElement,first);
 document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.ok(host.hidden);assert.equal(document.activeElement,opener);assert.equal(main.scrollTop,380);assert.equal(document.querySelector('.app-shell').inert,false);
 modal('Another day','No events');host.click();assert.ok(host.hidden);assert.equal(document.activeElement,opener);
});
test('compact market topics reveal the full inference, missing evidence and original sources on demand',()=>{
 const doc={status:'stale',observed_at:'2026-09-05T12:00:00Z',topics:[{label_en:'Rates',fact_ids:['n'],synthesis:{summary_en:'A reviewed inference.',unknown_en:'Forecast missing.',next_check_en:'Check the release.'}}],evidence:[{id:'n',title:'Source title',publisher:'Publisher',published_at:'2026-09-04',source_url:'https://example.com/'}]};
 const box=renderMarketContext(doc,{compact:true});document.querySelector('main').append(box);
 assert.equal(box.querySelectorAll('.market-topic-trigger').length,1);assert.equal(box.querySelectorAll('.market-topic').length,0);
 box.querySelector('button').focus();box.querySelector('button').click();
 const dialog=document.querySelector('[role=dialog]');assert.match(dialog.textContent,/A reviewed inference/);assert.match(dialog.textContent,/Forecast missing/);assert.ok(dialog.querySelector('a[href="https://example.com/"]'));
 closeModal();box.remove();
});
test('creator search sorts by publication, never processing time, retains undated posts and does not mutate the feed',()=>{
 const posts=[{id:1,published_at:'2026-09-01',fetched_at:'2026-09-09',title:'AI old'},{id:2,published_at:null,title:'AI unknown'},{id:3,published_at:'2026-09-06',title:'AI latest'}];
 const result=filterPosts(posts,{following:new Set(),mine:false,archive:true,query:'AI'});
 assert.deepEqual(result.map(p=>p.id),[3,1,2]);assert.deepEqual(posts.map(p=>p.id),[1,2,3]);
 assert.equal(conciseSummary('The creator discusses margins. Evidence remains uncertain.',false),'The creator discusses margins.');
 assert.equal(conciseSummary('博主讨论利润变化。资料还不完整。',true),'博主讨论利润变化。');
 assert.ok(conciseSummary('很'.repeat(200),true).length<=89);
});
