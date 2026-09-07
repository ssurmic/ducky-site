import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<main></main>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
document.documentElement.lang='en';
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {claimDetails,priceContext,groundedClaim,sourceAt}=await import('../public/js/app/views/creator-claim.js');

test('reviewed views survive omitted public quotations and keep missing qualifiers explicit',()=>{
 const call={extractor_version:'creator-claims-v1',evidence_verified:true,verification:'source_reviewed',source_hash:'abc',segment_ids:[2,3],evidence:'',action:'add',intent:'conditional',condition_text:'Only if sales improve'};
 assert.ok(groundedClaim(call));assert.equal(groundedClaim({...call,evidence_verified:false}),false);
 const node=claimDetails(call);assert.match(node.textContent,/Only if sales improve/);assert.match(node.textContent,/Not explicit in the source/);assert.match(node.textContent,/Conditional plan/);
 assert.equal(sourceAt('https://youtube.com/watch?v=abcdefghijk',2075.9),'https://youtube.com/watch?v=abcdefghijk&t=2075');
 assert.equal(sourceAt('https://youtube.com.evil.test/watch',12),null);
});

test('publication references and prospective pending open stay distinct without fake fills',()=>{
 const node=priceContext({previous_close:{status:'ready',d:'2026-09-03',price:100},publication_close:{status:'ready',d:'2026-09-04',price:102},publication_next_open:{status:'pending',d:'2026-09-08'},recorded_next_open:{status:'time_unknown'},simulation:{reason:'condition_not_evaluated'}});
 assert.match(node.textContent,/Previous session close/);assert.match(node.textContent,/Awaiting that session/);assert.match(node.textContent,/Time not available/);assert.match(node.textContent,/no fill is recorded/);
 assert.ok(!node.textContent.includes('$0'));
});

test('corrected historical interpretation stays labeled and v2 retains source proof',()=>{
 const call={extractor_version:'creator-claims-v2',evidence_verified:true,verification:'source_reviewed',source_hash:'abc',segment_ids:[524,525],evidence:''};
 assert.equal(groundedClaim(call),true);
 assert.equal(groundedClaim({...call,attribution_status:'superseded'}),false);
 assert.match(claimDetails({...call,attribution_status:'superseded'}).textContent,/interpretation has been corrected/);
});
