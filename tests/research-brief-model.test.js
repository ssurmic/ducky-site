import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adaptStudies, briefFilters, briefTarget, clock, discussion, originalLink, requestPath, selectRows} from '../public/js/app/research-brief-model.js';
const post = {id:1, revision_id:2, kol_id:'author',kol_name:'Author',platform_post_id:'video',
  published_at:'2026-09-08',first_seen_at:null,recorded_at:'2026-09-09T01:00:00Z',
  title:'A dated source',url:'https://www.youtube.com/watch?v=video',calls:[
    {point_id:'claim:a',sym:'AVGO',stance:'bull',note:{en:'Conditional demand view'},condition_text:'Only if orders arrive',evidence:'Original 367, 3057 and about 12 times.',start_seconds:0},
    {point_id:'claim:b',sym:'AVGO',stance:'bear',note:'Margin pressure',start_seconds:61},
  ]};
const all = {...briefFilters(),scope:'all',days:'all'};

test('projects records without changing input, dates, conditions, numbers or losses',()=>{
 const input=structuredClone(post);input.calls[0].windows={published:{ret:-15}};
 const before=JSON.stringify(input);const rows=adaptStudies([input]);
 assert.equal(JSON.stringify(input),before);assert.equal(rows.length,2);
 assert.equal(rows[0].original,post.calls[0].evidence);assert.equal(rows[0].condition,'Only if orders arrive');
 assert.equal(rows[0].post.calls[0].windows.published.ret,-15);
 assert.equal(rows[0].published.precision,'day');assert.equal(rows[0].firstSeen,null);
 assert.equal(rows[0].processed,null);assert.equal(rows[0].source,'https://www.youtube.com/watch?v=video&t=0');
});
test('deduplicates only identical identified transport copies; preserves conflicting versions',()=>{
 const conflict=structuredClone(post);conflict.calls[0].note='Different saved content';
 const rows=adaptStudies([post,structuredClone(post),conflict]);
 assert.equal(rows.length,3);assert.equal(rows[0].duplicates,1);assert.equal(rows[1].duplicates,2);
 assert.ok(rows[0].conflict && rows[2].conflict);assert.equal(rows[1].conflict,false);
 const unidentified={calls:[{sym:'AVGO',note:'same'}]};
 assert.equal(adaptStudies([unidentified,unidentified]).length,2);
});
test('keeps separate points in one video and distinct authors, without inventing counts',()=>{
 const rows=adaptStudies([post]);assert.deepEqual(discussion(rows),[{ticker:'AVGO',records:2,videos:1,creators:1,latest:'2026-09-08'}]);
 const missing={...post,id:3,platform_post_id:null,kol_id:null};
 assert.equal(discussion(adaptStudies([post,missing]))[0].videos,null);
 assert.equal(discussion(adaptStudies([post,missing]))[0].creators,null);
});
test('date precision and timezone are explicit; impossible or ambiguous clocks stay unknown',()=>{
 assert.equal(clock('2026-02-30'),null);assert.equal(clock('2026-09-09T12:00:00'),null);
 assert.equal(clock(null),null);assert.equal(clock('2026-09-09').precision,'day');
 assert.equal(clock('2026-09-09T23:00:00-07:00').day,'2026-09-10');
});
test('unknown and mention stances remain non-directional; archived rows remain accessible',()=>{
 const p={...post,calls:[{sym:'AVGO',stance:'mystery'},{sym:'AVGO',stance:'neutral',intent:'mention'},
 {sym:'AVGO',stance:'bull',attribution_status:'retracted'}]};
 const rows=adaptStudies([p]);assert.deepEqual(rows.map(r=>r.kind),['background','mention','archive']);
 assert.equal(rows[0].stance,'unknown');assert.equal(selectRows(rows,all).length,3);
});
test('composes watchlist, ticker, creator, source date and loaded text including the opposing view',()=>{
 const rows=adaptStudies([post]);const f={...all,scope:'watchlist',ticker:'AVGO',creator:'author',search:'margin',days:'7'};
 assert.equal(selectRows(rows,f,['AVGO'],new Date('2026-09-09')).length,1);
 assert.equal(selectRows(rows,f,[],new Date('2026-09-09')).length,0);
 assert.equal(selectRows(rows,{...f,creator:'other'},['AVGO'],new Date('2026-09-09')).length,0);
 assert.equal(selectRows(rows,f,['AVGO'],new Date('2026-10-09')).length,0);
});
test('unknown dates do not enter a seven-day result; all-loaded view retains them',()=>{
 const rows=adaptStudies([{...post,published_at:null}]);
 assert.equal(selectRows(rows,{...all,days:'7'}).length,0);assert.equal(selectRows(rows,all).length,2);
});
test('source links preserve zero and long-video offsets, reject unsafe URLs, never invent missing offsets',()=>{
 assert.equal(originalLink('javascript:alert(1)',0),null);assert.equal(originalLink('https://youtube.com.evil.test/a',0),null);
 assert.equal(originalLink('https://name:pass@youtube.com/watch?v=a',0),null);
 assert.equal(originalLink(post.url,null),post.url);assert.match(originalLink(post.url,9000),/t=9000$/);
});
test('server query is bounded, encoded and has no browser-only text, watchlist or date filters',()=>{
 const f={...all,ticker:'AVGO',creator:'author',search:'private input'};
 assert.equal(requestPath(f,'a+/='),'/kol/research?limit=100&ticker=AVGO&kol_id=author&before=a%2B%2F%3D');
 const url=briefTarget(f,new URLSearchParams('token=secret'));assert.ok(!url.includes('private')&&!url.includes('secret'));
 assert.deepEqual(briefFilters(new URLSearchParams('ticker=%3Cscript%3E&creator=a/b&days=-1')),briefFilters());
});
test('stable sorting preserves bearish evidence and source chronology without score invention',()=>{
 const a=adaptStudies([post]);const before=a.map(r=>r.key);selectRows(a,all);
 assert.deepEqual(a.map(r=>r.key),before);assert.equal(selectRows(a,all).find(r=>r.stance==='bear').note,'Margin pressure');
});
test('serialized legacy summaries show only prose; unavailable source states never leak internal JSON',()=>{
 const summary=JSON.stringify({en:'Saved English summary',zh:'原有中文摘要',source:{status:'ready'}});
 assert.equal(adaptStudies([{...post,summary,calls:[]}])[0].note,'Saved English summary');
 const blocked=adaptStudies([{...post,calls:[],summary:JSON.stringify({en:'',zh:'',source:{status:'partial',blocked_reason:'point_withdrawn'}})}])[0];
 assert.equal(blocked.note,'');assert.equal(blocked.kind,'unavailable');
});
test('explicit reported holdings retain position meaning without inventing a bullish view',()=>{
 const row=adaptStudies([{...post,calls:[{sym:'AVGO',stance:'neutral',intent:'self_reported',action:'hold',direction_basis:'self_reported_position_behavior'}]}])[0];
 assert.equal(row.kind,'position');assert.equal(row.stance,'neutral');assert.equal(row.call.action,'hold');
});
