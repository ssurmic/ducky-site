import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spanGroups} from '../public/js/app/creator-span-groups.js';

const row=(point='first',extra={})=>({creator_id:'sample-author',post_id:'abcdefghijk',point_id:point,ticker:'LYFT',
 title:{en:'The creator prefers the alternative when availability is poor.',zh:'作者认为可用性不佳时会选择替代服务。'},
 reason:null,stance:'context',intent:'opinion',action:'view',conditional:false,condition_text:null,horizon_text:null,
 basis:'attributed_opinion',published_at:'2026-09-08T05:24:19Z',observed_at:'2026-09-08T06:12:47Z',source_stance:null,
 source_url:'https://www.youtube.com/watch?v=abcdefghijk&t=139s',start_seconds:139.76,end_seconds:145.84,...extra});

test('identical wording in one source keeps both original records and distinct excerpt availability',()=>{
 const a=row('a',{evidence:'The original passage.'}),b=row('b',{end_seconds:149.36,evidence:'',excerpt_status:'source_link'});
 const rows=[a,b],before=JSON.stringify(rows),groups=spanGroups(rows);
 assert.deepEqual(groups,[[a,b]]);assert.equal(groups[0][0],a);assert.equal(groups[0][1],b);
 assert.equal(JSON.stringify(rows),before);
});
test('grouping cannot blend identities, bilingual meaning, qualification or source revisions',()=>{
 const a=row();
 for(const difference of [
  {creator_id:'other-author'},{ticker:'UBER'},
  {post_id:'klmnopqrstu',source_url:'https://www.youtube.com/watch?v=klmnopqrstu'},
  {title:{...a.title,en:'The creator does not prefer the alternative.'}},
  {title:{...a.title,zh:'作者认为替代服务始终更好。'}},
  {reason:{en:'A separate reason',zh:'另一个理由'}},{stance:'support'},
  {intent:'mention'},{basis:'verified_mention_no_direction'},{action:'hold'},
  {conditional:true},{condition_text:'Only if the price is lower.'},{horizon_text:'Next year'},
  {source_stance:'bear'},{published_at:'2026-09-09T05:24:19Z'},{observed_at:'2026-09-09T06:12:47Z'},
  {new_qualification:'A future field must not silently disappear.'}
 ])assert.equal(spanGroups([a,row('other',difference)]).length,2,JSON.stringify(difference));
});
test('absent identity, missing translations and misleading source URLs stay separate',()=>{
 for(const difference of [
  {point_id:''},{creator_id:null},{post_id:null},{title:{en:'Same English, unknown Chinese'}},
  {source_url:'https://www.youtube.com/watch?v=different'},
  {source_url:'https://www.youtube.com.evil.test/watch?v=abcdefghijk'},
  {source_url:'https://person:secret@www.youtube.com/watch?v=abcdefghijk'},
  {source_url:'javascript:alert(1)'},{source_url:null}
 ]){const a=row('first',difference),b=row('second',difference);assert.equal(spanGroups([a,b]).length,2);}
});
test('one video can retain separate source passages without changing the stable reading order',()=>{
 const first=row('first'),other=row('other',{ticker:'UBER'}),last=row('last',{
  source_url:'https://youtu.be/abcdefghijk?t=260',start_seconds:260,end_seconds:272});
 assert.deepEqual(spanGroups([first,other,last]),[[first,last],[other]]);
 assert.deepEqual(spanGroups([last,other,first]),[[last,first],[other]],'explicit point-first input stays first');
});
