import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body><script id="ducky-strings"></script></body></html>');
for(const key of ['window','document','Node'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
document.querySelector('script').textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
const {renderProgress}=await import('../public/js/app/views/creator-progress.js');
const value={schema:'creator-progress/1',status:'ready',shared:true,counts:{discovered_posts:28,archived:12,readable_summaries:0,readable_lower_bound:0},window:{since_day:'2026-07-10',as_of:'2026-09-08T12:00:00Z'},provider:{allowed:false,retry_at:1788888600}};
test('progress preserves true zero and channel scope without turning retry time into an ETA',()=>{
 const node=renderProgress(value);assert.deepEqual([...node.querySelectorAll('dd')].map(x=>x.textContent),['28','12','0']);
 assert.match(node.textContent,/2026-07-10 to 2026-09-08/);assert.match(node.textContent,/Source retrieval is paused/);
 assert.match(node.textContent,/follow list is personal/);assert.doesNotMatch(node.textContent,/%|1788888600|ETA/);
});
test('a bounded readable scan is a lower bound, never an exact or invented total',()=>{
 const node=renderProgress({...value,counts:{discovered_posts:null,archived:false,readable_summaries:null,readable_lower_bound:19}});
 assert.deepEqual([...node.querySelectorAll('dd')].map(x=>x.textContent),['—','—','At least 19']);
 const unknown=renderProgress({...value,counts:{readable_summaries:null,readable_lower_bound:0}});
 assert.equal(unknown.querySelectorAll('dd')[2].textContent,'—');
});
test('invalid status or dates cannot become apparently complete coverage',()=>{
 assert.equal(renderProgress({...value,status:'unavailable'}),null);assert.equal(renderProgress({...value,schema:'unknown'}),null);
 for(const window of [{since_day:'2026-02-30',as_of:'2026-09-08'},{since_day:'2026-09-09',as_of:'2026-09-08'}])
  assert.ok(!renderProgress({...value,window}).textContent.includes('Historical coverage'));
 assert.ok(!renderProgress({...value,shared:false,provider:{allowed:true}}).textContent.includes('paused'));
});
