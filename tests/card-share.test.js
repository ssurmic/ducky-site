import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {shareCard,wrapText,openCardShare}=await import('../public/js/app/card-share.js');
const {mapView}=await import('../public/js/app/views/evidence.js');
const {closeModal}=await import('../public/js/app/ui.js');
const context={ticker:'CEG',recorded_at:'2026-09-09T03:00:00Z',user_id:987,email:'private@example.org',token:'private_token',watches:['SECRET']};
const node=()=>({title:{en:'Electricity prices may help CEG.'},reason:{en:'The author expects demand to grow, but costs remain uncertain.'},stance:'support',conditional:true,
  published_at:'2026-09-01',evidence:[{kind:'creator',author:'Ticker Symbol: YOU',published_at:'2026-09-01',source_url:'https://www.youtube.com/watch?v=csv55UtVMZM&t=672s',
  condition_text:'Only if contracts are renewed.',horizon_text:'Over the next two years.',source_hash:'private_internal_hash'}]});
test('one-card export preserves caveats, author, source timestamp and snapshot without personal fields',()=>{
  const result=shareCard(node(),context),serialized=JSON.stringify(result);
  assert.match(result.sources[0].author,/Creator · Ticker Symbol: YOU/);
  assert.match(result.summary,/costs remain uncertain/);
  assert.match(result.notes.join(' '),/Only if contracts are renewed/);
  assert.match(result.notes.join(' '),/Over the next two years/);
  assert.match(result.recorded,/2026-09-09 03:00 UTC/);
  assert.match(result.sources[0].url,/t=672s/);
  for(const privateValue of ['987','private@','private_token','SECRET','private_internal_hash'])assert.ok(!serialized.includes(privateValue));
});
test('historical/dated states and missing dates never become current or zero',()=>{
  const n=node();delete n.published_at;n.evidence[0].freshness='stale';
  const result=shareCard(n,{...context,archive:true});
  assert.ok(result.notes.includes('Historical record'));
  assert.match(result.notes.join(' '),/Dated information/);
  assert.match(result.date,/—/);assert.ok(!result.date.includes('1970'));
  const fact=shareCard({...n,evidence:[{kind:'fact',data:{as_of:'2026-09-04',start:'2026-08-01',end:'2026-09-04'}}]},context);
  assert.match(fact.notes.join(' '),/2026-08-01/);assert.match(fact.notes.join(' '),/2026-09-04/);
});
test('unsafe URLs, withdrawn claims and oversized qualifications cannot export unchecked',()=>{
  for(const url of ['javascript:alert(1)','https://account:secret@example.org','http://example.org']){
    const n=node();n.evidence[0].source_url=url;assert.equal(shareCard(n,context).sources[0].url,null);
  }
  const n=node();n.evidence[0].attribution_status='retracted';assert.throws(()=>shareCard(n,context));
  delete n.evidence[0].attribution_status;n.evidence[0].condition_text='a'.repeat(14000);assert.throws(()=>shareCard(n,context));
  assert.throws(()=>shareCard(node(),{...context,ticker:'../private'}));
});
test('text wrapping retains negative values, CJK and unbroken source strings',()=>{
  const ctx={measureText:v=>({width:[...v].length*10})};
  for(const value of ['Loss −15.02%; risk remains.','条件尚未满足，仍有亏损。','https://example.com/very-long-source']){
    const lines=wrapText(ctx,value,90);assert.equal(lines.join('').replaceAll(' ',''),value.replaceAll(' ',''));
    assert.ok(lines.every(line=>ctx.measureText(line).width<=90));
  }
});
test('share control is independent of navigation and an export failure stays in the dialog',async()=>{
  const original=dom.window.HTMLCanvasElement.prototype.getContext;
  dom.window.HTMLCanvasElement.prototype.getContext=()=>null;
  const root=mapView({...context,nodes:[node()]},{example:true});document.body.append(root);
  const card=root.querySelector('.evidence-node'),button=card.querySelector('.evidence-share-trigger');
  assert.equal(card.tagName,'ARTICLE');assert.equal(card.querySelectorAll('button button').length,0);
  const before=location.hash;button.focus();button.click();await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(location.hash,before);assert.match(document.querySelector('.modal-body').textContent,/No account needed/);
  assert.match(document.querySelector('[role="status"]').textContent,/couldn’t be prepared/);
  closeModal();assert.equal(document.activeElement,button);
  root.dispose();root.remove();dom.window.HTMLCanvasElement.prototype.getContext=original;
});
