import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<html lang="en"><body><main></main></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json')))
  .filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));
document.body.append(strings);
const {groundedClaim,sourceSummaryAccepted}=await import('../public/js/app/views/creator-claim.js');
const {hasGroundedCalls,hasReviewedSummary,filterPosts}=await import('../public/js/app/views/creators.js');
const {tickerViews,legacyCalls}=await import('../public/js/app/creator-spans.js');
const {publicCreator,mountPublicCreator}=await import('../public/js/app/creator-analysis-preview.js');
const hash='a'.repeat(64),contentHash='b'.repeat(64);
const call=()=>({sym:'CDNS',stance:'bull',extractor_version:'creator-claims-v2',evidence_verified:true,
  verification:'source_validated',source_hash:hash,segment_ids:[1,2],
  _single_pass:{version:'creator-single-pass/1',source_hash:hash,content_hash:contentHash}});
const source=()=>({kind:'transcript',status:'ready',summary_reviewed:false,
  summary_validation:{version:'creator-single-pass/1',method:'single-pass-v1',content_hash:contentHash}});
const post=()=>({kol_id:'creator',published_at:'2026-09-14T00:00:00Z',title:'EDA valuation',
  calls:[call()],summary:{quality:'grounded',source:source(),en:'The creator sees value in EDA tools.'}});

test('source-validated claims retain their ticker and directional badge without a fake review',()=>{
  const item=post(),before=JSON.stringify(item);
  assert.equal(groundedClaim(item.calls[0]),true);
  assert.equal(hasGroundedCalls(item),true);
  assert.equal(hasReviewedSummary(item),true);
  assert.equal(legacyCalls(item).length,1);
  assert.deepEqual(tickerViews(item),[{ticker:'CDNS',pointId:undefined,stance:'bull'}]);
  assert.deepEqual(filterPosts([item],{following:new Set(),mine:false,archive:false}),[item]);
  assert.equal(JSON.stringify(item),before);
  assert.equal(item.summary.source.summary_reviewed,false);
});

test('missing, malformed, withdrawn or mismatched single-pass claim proofs are not accepted',()=>{
  const changes=[
    value=>{delete value._single_pass;},
    value=>{value._single_pass.content_hash='';},
    value=>{value._single_pass.source_hash='c'.repeat(64);},
    value=>{value._single_pass.version='creator-single-pass/0';},
    value=>{value._single_pass.approved=true;},
    value=>{value.evidence_verified=false;},
    value=>{value.verification='source_reviewed';},
    value=>{value.segment_ids=[];},
    value=>{value.extractor_version='unknown';value.evidence='A sufficiently long old quotation';},
    ...['pending','withdrawn','quarantined','retracted','superseded'].map(status=>value=>{value.attribution_status=status;}),
  ];
  for(const change of changes){const value=call();change(value);assert.equal(groundedClaim(value),false);}
});

test('accepted claims cannot promote an absent or incomplete whole-summary receipt',()=>{
  const changes=[
    value=>{delete value.source.summary_validation;},
    value=>{value.source.summary_validation=null;},
    value=>{value.source.summary_validation.method='complete-v1';},
    value=>{value.source.summary_validation.content_hash='not-a-digest';},
    value=>{value.source.summary_reviewed=true;},
    value=>{value.source.summary_validation.status='ready';},
    value=>{value.quality='unverified';},
    ...['processing','pending','withdrawn','partial'].map(status=>value=>{value.source.status=status;}),
  ];
  for(const change of changes){const item=post();change(item.summary);assert.equal(hasReviewedSummary(item),false);}
  assert.equal(sourceSummaryAccepted({status:'ready',summary_reviewed:false}),false);
  assert.equal(sourceSummaryAccepted({status:'ready',summary_reviewed:true}),true);
});

test('public single-pass summary keeps positions and bilingual text but never displays an invented review',()=>{
  const original=JSON.parse(readFileSync('public/examples/video-summary.json'));
  const snapshot={...original,source:{...original.source,...source()}};
  const before=JSON.stringify(snapshot),root=document.querySelector('main');
  for(const lang of ['en','zh']){
    document.documentElement.lang=lang;
    const doc=publicCreator(snapshot),view=mountPublicCreator(root,snapshot);
    assert.equal(doc.page.highlights.length,snapshot.sections.length);
    assert.equal(view.querySelector('.creator-highlights article p').textContent,snapshot.sections[0][lang]);
    const first=view.querySelector('.creator-highlights article a');
    assert.equal(new URL(first.href).searchParams.get('t'),String(snapshot.sections[0].start_seconds));
    assert.doesNotMatch(view.textContent,/independently reviewed|source_validated|single-pass|content_hash/);
  }
  const rendered=root.innerHTML;
  assert.throws(()=>mountPublicCreator(root,{...snapshot,source:{...snapshot.source,status:'withdrawn'}}),/invalid_public_creator/);
  assert.equal(root.innerHTML,rendered);
  assert.equal(JSON.stringify(snapshot),before);
  root.replaceChildren();document.documentElement.lang='en';
});
