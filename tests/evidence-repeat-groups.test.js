import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {exactAuthorRepeats} from '../public/js/app/evidence-grouping.js';
const row=(id,{author='alpha',stance='support',node={},source={}}={})=>({id:'node:'+id,kind:'creator',stance,intent:'opinion',
  title:{en:'Margins depend on contract prices.',zh:'利润率取决于合约价格。'},reason:{en:'Product mix.',zh:'产品组合。'},
  conditional:true,condition_text:'Prices must hold.',horizon_text:'Next quarter',published_at:'2026-09-25',observed_at:'2026-09-26',
  source_count:1,evidence_omitted:0,evidence:[{id:'claim:'+id,point_id:'claim:'+id,kind:'creator',basis:'attributed_opinion',
    creator_id:author,author:'Author '+author,post_id:id,source_url:'https://www.youtube.com/watch?v='+id,source_hash:'hash:'+id,
    condition_text:'Prices must hold.',horizon_text:'Next quarter',published_at:'2026-09-25',observed_at:'2026-09-26',
    start_seconds:60,end_seconds:90,...source}],...node});
const group=nodes=>exactAuthorRepeats(nodes,{ticker:'MU'});

test('whole-node repetition retains original source/claim IDs and every timestamp without mutation',()=>{
  const a=row('new'),b=row('old',{node:{published_at:'2026-09-20'},source:{published_at:'2026-09-20',observed_at:'2026-09-21'}});
  const before=JSON.stringify([a,b]),groups=group([a,b]);
  assert.deepEqual(groups,[[a,b]]);assert.equal(groups[0][1].evidence[0].point_id,'claim:old');
  assert.equal(groups[0][1].evidence[0].observed_at,'2026-09-21');assert.equal(JSON.stringify([a,b]),before);
  const multi=row('multi');multi.evidence.push(row('extra').evidence[0]);multi.source_count=2;
  assert.equal(group([a,multi]).length,1,'source receipt multiplicity is not a new opinion');
  assert.equal(group([a,multi])[0][1].evidence.length,2,'existing multi-source nodes remain intact');
});

test('changed and unknown node/source semantics, opposite stances and different authors remain separate',()=>{
  const first=row('first');
  for(const node of [{stance:'counter'},{ticker:'NVDA'},{condition_text:'Prices must rise.'},{horizon_text:'Next year'},
    {conditional:false},{intent:'mention'},{action:'reduce'},{freshness:'stale'},{evidence_omitted:1},
    {title:{en:'Margins will improve.',zh:first.title.zh}},{title:{en:first.title.en,zh:'利润率已经改善。'}},
    {reason:{en:'Another mechanism.',zh:'另一个原因。'}},{future_condition:{basis:'unconfirmed'}},
    {attribution_status:'superseded'}])assert.equal(group([first,row('second',{node})]).length,2,JSON.stringify(node));
  for(const source of [{condition_text:'Only with financing.'},{horizon_text:'Long term'},{source_stance:'bear'},
    {data:{action:'sell'}},{future_condition:'Material qualification'},{attribution_status:'retracted'},
    {basis:'self_reported_position_behavior'}])assert.equal(group([first,row('second',{source})]).length,2,JSON.stringify(source));
  assert.equal(group([first,row('second',{author:'beta'})]).length,2);
});

test('missing or mixed identity, incomplete translations and unverified source correspondence cannot collate',()=>{
  for(const source of [{creator_id:''},{creator_id:7},{post_id:''},{id:'',point_id:''},
    {source_url:'https://www.youtube.com/watch?v=unrelated'},{source_url:'https://example.com/video'},
    {source_url:'https://person:secret@youtube.com/watch?v=first'},{basis:undefined}]){
    assert.equal(group([row('first',{source}),row('first',{source})]).length,2,JSON.stringify(source));
  }
  const mixed=row('mixed');mixed.evidence.push(row('other',{author:'beta'}).evidence[0]);
  assert.equal(group([mixed,structuredClone(mixed)]).length,2);
  const untranslated=row('first',{node:{title:{en:'Same English only.'}}});
  assert.equal(group([untranslated,structuredClone(untranslated)]).length,2);
  assert.equal(exactAuthorRepeats([row('first'),row('second')]).length,2,'map scope must be explicit');
});

const dom=new JSDOM('<html lang="en" data-lang="en"><body><div id="modal" hidden></div></body></html>',{url:'https://ducky.test/app/#/evidence/MU'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {mapView}=await import('../public/js/app/views/evidence.js');
const {closeModal}=await import('../public/js/app/ui.js');

test('a repeat uses one preview slot; all dated source cards, opposing and other distinct views remain reachable',()=>{
  let calls=0;globalThis.fetch=()=>{calls++;throw Error('No fetch on presentation');};
  const repeated=Array.from({length:8},(_,i)=>row('repeat'+i,{node:{published_at:'2026-09-'+String(25-i).padStart(2,'0')},source:{published_at:'2026-09-'+String(25-i).padStart(2,'0')}}));
  const other=row('other',{author:'beta',node:{title:{en:'Demand remains uncertain.',zh:'需求仍有不确定性。'}}});
  const third=row('third',{author:'gamma',node:{title:{en:'Costs remain important.',zh:'成本仍然重要。'}}});
  const nodes=[...repeated,other,third,row('risk',{stance:'counter'}),row('context',{stance:'context'})];
  const before=JSON.stringify(nodes),root=mapView({ticker:'MU',nodes},{showAnalysis:false,showShare:false});document.body.append(root);
  try{
    const repeatedGroup=root.querySelector('.evidence-repeat-group');assert.ok(repeatedGroup);
    assert.equal(repeatedGroup.querySelectorAll(':scope>.evidence-node').length,1);
    assert.equal(repeatedGroup.querySelectorAll('details .evidence-node').length,7);
    assert.equal(repeatedGroup.querySelector('details').open,false);
    assert.match(repeatedGroup.textContent,/8 records/);
    assert.ok(root.querySelector('[data-reading-anchor="node:other"]'));
    assert.ok(root.querySelector('[data-reading-anchor="node:third"]'));
    assert.ok(root.querySelector('.is-counter [data-reading-anchor="node:risk"]'));
    assert.equal(root.querySelectorAll('.evidence-node').length,nodes.length);
    assert.match(root.querySelector('.evidence-map-footer').textContent,/Showing 12 of 12/);
    assert.equal(JSON.stringify(nodes),before);
    repeatedGroup.querySelector('summary').click();assert.equal(repeatedGroup.querySelector('details').open,true);
    window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
    const button=root.querySelector('[data-reading-anchor="node:repeat7"] .evidence-node-open');button.focus();button.click();
    const modal=document.querySelector('#modal');assert.match(modal.textContent,/2026-09-18/);
    assert.match(modal.textContent,/Prices must hold/);
    assert.match(modal.querySelector('a[href^="#/creators"]').getAttribute('href'),/post=repeat7&point=claim%3Arepeat7/);
    assert.equal(modal.querySelector('a[target="_blank"]').href,'https://www.youtube.com/watch?v=repeat7&t=60');
    closeModal();assert.equal(document.activeElement,button);assert.equal(calls,0);
  }finally{closeModal();root.dispose();root.remove();delete window.DUCKY;}
});
