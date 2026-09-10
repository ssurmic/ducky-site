import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html lang="en"><body></body></html>');
for(const k of ['window','document','Node'])globalThis[k]=dom.window[k];
const copy=JSON.parse(readFileSync('i18n/en.json')),strings=document.createElement('script');
strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {spanSection,legacyCalls,viewpointTake,tickerViews}=await import('../public/js/app/creator-spans.js');
test('verified mentions remain explicit, every passage is reachable and links are constrained',()=>{
 const rows=Array.from({length:9},(_,i)=>({ticker:'AVGO',basis:'verified_mention_no_direction',intent:'mention',published_at:'2026-08-05',start_seconds:1340,title:{en:'Broadcom valuation discussion '+i},source_url:'https://www.youtube.com/watch?v=eMXOSnMyk0o&t=1340'}));
 rows.push({...rows[0],basis:'unreviewed',title:{en:'Must not publish'}});
 rows[0].source_url='javascript:alert(1)';
 const section=spanSection(rows);
 assert.equal(section.querySelectorAll('article').length,9);
 assert.equal(section.querySelectorAll(':scope > article').length,6);
 assert.equal(section.querySelectorAll('details article').length,3);
 assert.equal(section.querySelector('details').open,false);
 assert.match(section.textContent,/Mentioned; direction not verified/);
 assert.ok(!section.textContent.includes('Must not publish'));
 assert.equal(section.querySelectorAll('a[href^="javascript:"]').length,0);
 assert.equal(spanSection(rows,['ORCL']),null);
});

test('one presentation replaces only covered legacy stocks and retains opposing and conditional viewpoints',()=>{
 const nvda={sym:'NVDA',stance:'bull',evidence:'The creator gives a supported opinion.'};
 const post={calls:[{sym:'AVGO',stance:'bear'},nvda],reviewed_spans:[
  {ticker:'AVGO',basis:'attributed_opinion',intent:'opinion',stance:'support',point_id:'one'},
  {ticker:'AVGO',basis:'attributed_opinion',intent:'conditional',stance:'counter',point_id:'two',condition_text:'if orders slow',horizon_text:'this year'}]};
 assert.deepEqual(legacyCalls(post),[nvda]);
 assert.equal(viewpointTake(post),'neutral');
 assert.equal(viewpointTake(post,'one'),'bull');
 assert.equal(viewpointTake(post,'two'),'bear');
 const section=spanSection(post.reviewed_spans,null,'two',{inline:true});
 assert.equal(section.querySelectorAll('article').length,2);
 assert.equal(section.querySelector('h3'),null);
 assert.ok(section.querySelector('[data-point-id="two"].is-focused.is-counter'));
 assert.match(section.textContent,/if orders slow/);assert.match(section.textContent,/this year/);
 assert.deepEqual(tickerViews(post).map(row=>[row.ticker,row.stance]),[['AVGO','mixed'],['NVDA','bull']]);
});

test('a reviewed position statement remains reachable and supersedes its old neutral call',()=>{
 const old={sym:'INTC',stance:'neutral',evidence:'The creator said he continues to hold Intel.'};
 const untouched={sym:'NVDA',stance:'bear',evidence:'The source describes a separate concern.'};
 const position={ticker:'INTC',basis:'self_reported_position_behavior',intent:'self_reported',
  action:'hold',source_stance:'neutral',stance:'support',point_id:'held-intc',published_at:'2026-08-24',
  title:{en:'The creator says he will continue holding Intel.'},
  reason:{en:'A statement at publication; current ownership is not established.'},
  start_seconds:246.63,source_url:'https://www.youtube.com/watch?v=CEGiQA6CNd4&t=246s'};
 const post={calls:[old,untouched],reviewed_spans:[
  {ticker:'CRWD',basis:'attributed_opinion',intent:'opinion',stance:'support',point_id:'other-stock'},position]};
 assert.deepEqual(legacyCalls(post),[untouched]);assert.equal(post.calls[0],old);assert.equal(old.stance,'neutral');
 assert.equal(viewpointTake(post,'held-intc'),'bull');
 assert.deepEqual(tickerViews(post).find(row=>row.ticker==='INTC'),{ticker:'INTC',pointId:'held-intc',stance:'bull'});
 const section=spanSection(post.reviewed_spans,null,'held-intc',{inline:true});
 const card=section.querySelector('[data-point-id="held-intc"].is-focused.is-support');assert.ok(card);
 assert.match(card.textContent,/Self-reported/);assert.match(card.textContent,/Hold/);
 assert.match(card.textContent,/Original outlook labelNeutral/);assert.match(card.textContent,/current ownership is not established/);
 assert.equal(card.querySelector('a[href^="https:"]').href,position.source_url);
 assert.equal(section.querySelectorAll('article').length,2);
});

test('caption correction is labelled and the exact original remains separately accessible',async()=>{
 const {sourceExcerpt}=await import('../public/js/app/creator-spans.js');
 const raw='FOOP ~12x. 3057 divided by 30.';
 const row={evidence:raw,evidence_reading:{version:'creator-terminology/2',text:'Forward P/E ~12x. 3057 divided by 30.',terms:[{term:'Forward P/E'}]}};
 const details=sourceExcerpt(row,{open:true});
 assert.equal(details.open,true);
 assert.equal(details.querySelector(':scope > summary').textContent,'Read corrected excerpt');
 assert.match(details.querySelector(':scope > p').textContent,/Caption term corrected: Forward P\/E/);
 assert.equal(details.querySelector(':scope > blockquote').textContent,row.evidence_reading.text);
 const original=details.querySelector('details');assert.equal(original.open,false);
 assert.equal(original.querySelector('blockquote').textContent,raw);
 assert.equal(sourceExcerpt({...row,evidence:null}),null);
 assert.equal(sourceExcerpt({evidence:raw}).querySelector('details'),null);
 assert.equal(sourceExcerpt({...row,evidence_reading:{...row.evidence_reading,version:'unknown'}}).querySelector('blockquote').textContent,raw);
});
